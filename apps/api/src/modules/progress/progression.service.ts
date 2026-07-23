import { Injectable } from '@nestjs/common';
import {
  computeDayRewards,
  computeStreak,
  computeWeeklyProgress,
  countValidDays,
  defaultEquippedAbilityIds,
  getCreatureByKey,
  getWeekBounds,
  levelFromTotalXp,
  unlockedAbilities,
  type AttributeChanges,
  type WeekOutcome,
} from '@ad-sidera/shared';
import type { WeeklyProgress } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProgressionService {
  constructor(private readonly prisma: PrismaService) {}

  private async timezoneFor(userId: string): Promise<string> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    return profile?.timezone ?? 'UTC';
  }

  private async targetForWeek(userId: string, weekEnd: Date): Promise<number | null> {
    const goal = await this.prisma.weeklyGoal.findFirst({
      where: { userId, startsAt: { lte: weekEnd } },
      orderBy: { startsAt: 'desc' },
    });
    return goal?.targetCount ?? null;
  }

  /**
   * Recalcula (autoritativamente, no servidor) o WeeklyProgress da semana que
   * contém `reference`, a partir das atividades sincronizadas. Idempotente.
   */
  async recomputeWeek(
    userId: string,
    reference: Date,
    timezone?: string,
  ): Promise<WeeklyProgress | null> {
    const tz = timezone ?? (await this.timezoneFor(userId));
    const bounds = getWeekBounds(reference.toISOString(), tz);
    const weekStart = new Date(bounds.weekStart);
    const weekEnd = new Date(bounds.weekEnd);

    const target = await this.targetForWeek(userId, weekEnd);
    if (target === null) {
      return null;
    }

    const activities = await this.prisma.activity.findMany({
      where: { userId, deletedAt: null, occurredAt: { gte: weekStart, lte: weekEnd } },
      select: { activityType: true, occurredAt: true, durationMinutes: true },
    });
    // Economia v2: a unidade de progresso é o DIA (apenas a 1ª atividade elegível/dia conta).
    const valid = countValidDays(
      activities.map((a) => ({
        activityType: a.activityType,
        occurredAt: a.occurredAt.toISOString(),
        durationMinutes: a.durationMinutes,
      })),
      tz,
    );
    const progress = computeWeeklyProgress(valid, target);

    const existing = await this.prisma.weeklyProgress.findUnique({
      where: { userId_weekKey: { userId, weekKey: bounds.weekKey } },
    });
    const completedAt = progress.completed
      ? (existing?.completedAt ?? new Date())
      : null;

    const data = {
      weekStart,
      weekEnd,
      targetCount: target,
      validActivityCount: valid,
      percentage: progress.percentageDisplayed,
      completed: progress.completed,
      completedAt,
    };

    return this.prisma.weeklyProgress.upsert({
      where: { userId_weekKey: { userId, weekKey: bounds.weekKey } },
      create: { userId, weekKey: bounds.weekKey, ...data },
      update: data,
    });
  }

  /** Recalcula as semanas distintas referenciadas (usado após lote de sync). */
  async recomputeWeeksFor(userId: string, references: readonly Date[]): Promise<void> {
    const tz = await this.timezoneFor(userId);
    const seen = new Set<string>();
    for (const ref of references) {
      const { weekKey } = getWeekBounds(ref.toISOString(), tz);
      if (seen.has(weekKey)) {
        continue;
      }
      seen.add(weekKey);
      await this.recomputeWeek(userId, ref, tz);
    }
  }

  /**
   * Materializa XP e atributos somente a partir de fatos aceitos pelo servidor.
   * Editar/excluir uma atividade recalcula as posições 100%/25%/0% de todo o dia.
   */
  async recomputeCreatureProgress(userId: string): Promise<void> {
    const [creature, activities, battleXp, timezone] = await Promise.all([
      this.prisma.userCreature.findUnique({ where: { userId } }),
      this.prisma.activity.findMany({ where: { userId }, orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }] }),
      this.prisma.battleSession.aggregate({
        where: { userId, rewarded: true, result: 'victory' },
        _sum: { xpGranted: true },
      }),
      this.timezoneFor(userId),
    ]);
    if (!creature) return;
    const definition = getCreatureByKey(creature.creatureKey);
    if (!definition) throw new Error('Definição do Adari não encontrada.');

    const byDay = new Map<string, typeof activities>();
    for (const activity of activities) {
      const day = DateTime.fromJSDate(activity.occurredAt, { zone: 'utc' }).setZone(timezone).toISODate();
      if (!day) continue;
      const current = byDay.get(day) ?? [];
      current.push(activity);
      byDay.set(day, current);
    }

    const rewards = [...byDay.values()].flatMap((dayActivities) => computeDayRewards(
      dayActivities.map((activity) => ({
        id: activity.id,
        activityType: activity.activityType,
        perceivedIntensity: activity.perceivedIntensity,
        durationMinutes: activity.durationMinutes,
        occurredAt: activity.occurredAt.toISOString(),
        createdAt: activity.createdAt.toISOString(),
        deleted: Boolean(activity.deletedAt),
      })),
    ));
    const rewardById = new Map(rewards.map((reward) => [reward.activityId, reward]));
    const attributeTotals: AttributeChanges = {};
    let activityXp = 0;
    for (const reward of rewards) {
      activityXp += reward.finalXp;
      for (const [key, value] of Object.entries(reward.finalAttributeChanges)) {
        const attribute = key as keyof AttributeChanges;
        attributeTotals[attribute] = (attributeTotals[attribute] ?? 0) + (value ?? 0);
      }
    }
    const xp = activityXp + (battleXp._sum.xpGranted ?? 0);
    const level = levelFromTotalXp(xp).level;
    const available = new Set(unlockedAbilities(creature.creatureKey, level).map((ability) => ability.id));
    const equipped = creature.equippedAbilities.filter((abilityId) => available.has(abilityId)).slice(0, 4);

    await this.prisma.$transaction(async (tx) => {
      for (const activity of activities) {
        const reward = rewardById.get(activity.id);
        if (!reward || activity.deletedAt) {
          await tx.activityReward.deleteMany({ where: { activityId: activity.id } });
          continue;
        }
        await tx.activityReward.upsert({
          where: { activityId: activity.id },
          create: {
            activityId: activity.id,
            xpGranted: reward.finalXp,
            energyGranted: reward.finalEnergy,
            attributeChanges: reward.finalAttributeChanges,
            calculationVersion: reward.calculationVersion,
          },
          update: {
            xpGranted: reward.finalXp,
            energyGranted: reward.finalEnergy,
            attributeChanges: reward.finalAttributeChanges,
            calculationVersion: reward.calculationVersion,
            calculatedAt: new Date(),
          },
        });
      }
      await tx.userCreature.update({
        where: { userId },
        data: {
          xp,
          level,
          strength: definition.baseStats.strength + (attributeTotals.strength ?? 0),
          endurance: definition.baseStats.endurance + (attributeTotals.endurance ?? 0),
          agility: definition.baseStats.agility + (attributeTotals.agility ?? 0),
          discipline: definition.baseStats.discipline + (attributeTotals.discipline ?? 0),
          recovery: definition.baseStats.recovery + (attributeTotals.recovery ?? 0),
          spirit: definition.baseStats.spirit + (attributeTotals.spirit ?? 0),
          health: definition.baseStats.health,
          equippedAbilities: equipped.length > 0 ? equipped : defaultEquippedAbilityIds(creature.creatureKey, level),
        },
      });
    });
  }

  async getCurrentWeek(userId: string): Promise<WeeklyProgress | null> {
    return this.recomputeWeek(userId, new Date());
  }

  getHistory(userId: string): Promise<WeeklyProgress[]> {
    return this.prisma.weeklyProgress.findMany({
      where: { userId },
      orderBy: { weekStart: 'desc' },
    });
  }

  async getStreak(userId: string) {
    const now = new Date();
    const finished = await this.prisma.weeklyProgress.findMany({
      where: { userId, weekEnd: { lt: now } },
      orderBy: { weekStart: 'asc' },
    });
    const outcomes: WeekOutcome[] = finished.map((w) => ({
      weekStart: w.weekStart.toISOString(),
      completed: w.completed,
    }));
    const streak = computeStreak(outcomes);
    return {
      ...streak,
      completedWeeks: finished.filter((w) => w.completed).length,
      totalWeeks: finished.length,
    };
  }

  /** Nº de semanas cumpridas por um usuário dentro de um intervalo (para ranking/temporada). */
  async completedWeeksBetween(userId: string, start: Date, end: Date): Promise<number> {
    return this.prisma.weeklyProgress.count({
      where: { userId, completed: true, weekStart: { gte: start, lte: end } },
    });
  }
}
