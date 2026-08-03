import { Injectable } from '@nestjs/common';
import {
  adariEvolutionSyncPayloadSchema,
  adariInteractionSyncPayloadSchema,
  applyFood,
  activitySyncPayloadSchema,
  battleSessionSyncPayloadSchema,
  checkEvolution,
  getStageDefinitionByInt,
  calculatePveWinReward,
  calculateBondReward,
  DURATION,
  defaultEquippedAbilityIds,
  FOOD_DEFINITIONS,
  getFoodDefinition,
  getCreatureByKey,
  getAdversaryById,
  hasRewardedWinAvailable,
  observatoryStateSyncPayloadSchema,
  recalculateSatiety,
  recoverVigor,
  vigorCostForBattle,
  vigorCostForResult,
  updateProfileSchema,
  userCreatureSyncPayloadSchema,
  weeklyGoalSchema,
  type SyncConflict,
  type SyncOperation,
  type SyncPushInput,
  type SyncPushResponse,
  type SyncServerChange,
} from '@ad-sidera/shared';
import { DateTime } from 'luxon';
import type { Prisma } from '@prisma/client';
import { sha256 } from '../../common/hashing';
import { PrismaService } from '../../prisma/prisma.service';
import { ProgressionService } from '../progress/progression.service';

interface ApplyResult {
  conflict?: SyncConflict;
  activityRef?: Date;
  progressionChanged?: boolean;
}

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progression: ProgressionService,
  ) {}

  async push(userId: string, input: SyncPushInput): Promise<SyncPushResponse> {
    const processedOperationIds: string[] = [];
    const failedOperations: SyncConflict[] = [];
    const activityRefs: Date[] = [];
    let progressionChanged = false;

    for (const op of input.operations) {
      const already = await this.prisma.syncOperation.findUnique({
        where: { operationId: op.operationId },
      });
      if (already) {
        // Idempotência: já processado antes.
        processedOperationIds.push(op.operationId);
        continue;
      }

      try {
        const result = await this.applyOperation(userId, op);
        if (result.conflict) {
          failedOperations.push(result.conflict);
          await this.record(userId, input.deviceId, op, 'conflict');
        } else {
          if (result.activityRef) {
            activityRefs.push(result.activityRef);
          }
          progressionChanged = progressionChanged || Boolean(result.progressionChanged);
          processedOperationIds.push(op.operationId);
          await this.record(userId, input.deviceId, op, 'processed');
        }
      } catch (error) {
        failedOperations.push({
          operationId: op.operationId,
          entityType: op.entityType,
          entityId: op.entityId,
          reason: 'validation_error',
          message: error instanceof Error ? error.message : 'Falha ao processar operação.',
        });
        await this.record(userId, input.deviceId, op, 'failed');
      }
    }

    if (activityRefs.length > 0) {
      await this.progression.recomputeWeeksFor(userId, activityRefs);
    }
    if (progressionChanged) {
      await this.progression.recomputeCreatureProgress(userId);
    }

    const serverTime = new Date();
    const since = input.lastSyncAt ? new Date(input.lastSyncAt) : null;
    const serverChanges = await this.collectServerChanges(userId, since);
    return {
      processedOperationIds,
      failedOperations,
      serverChanges,
      nextSyncToken: serverTime.toISOString(),
      serverTime: serverTime.toISOString(),
    };
  }

  async pull(
    userId: string,
    since: Date | null,
  ): Promise<{ serverChanges: SyncServerChange[]; nextSyncToken: string; serverTime: string }> {
    const serverTime = new Date();
    const serverChanges = await this.collectServerChanges(userId, since);
    return {
      serverChanges,
      nextSyncToken: serverTime.toISOString(),
      serverTime: serverTime.toISOString(),
    };
  }

  full(userId: string) {
    return this.pull(userId, null);
  }

  private async applyOperation(userId: string, op: SyncOperation): Promise<ApplyResult> {
    switch (op.entityType) {
      case 'activity':
        return this.applyActivity(userId, op);
      case 'weekly_goal':
        return this.applyWeeklyGoal(userId, op);
      case 'user_creature':
        return this.applyUserCreature(userId, op);
      case 'adari_evolution':
        return this.applyAdariEvolution(userId, op);
      case 'battle_session':
        return this.applyBattleSession(userId, op);
      case 'adari_interaction':
        return this.applyAdariInteraction(userId, op);
      case 'observatory_state':
        return this.applyObservatoryState(userId, op);
      case 'food_inventory':
        // Inventário é server-authoritative e nunca aceita quantidade do cliente.
        return {};
      case 'profile':
        return this.applyProfile(userId, op);
      case 'weekly_progress':
        // Server-authoritative: nunca sobrescreve o cálculo do servidor.
        return {};
      default:
        return {};
    }
  }

  private conflict(op: SyncOperation, serverUpdatedAt: Date): SyncConflict {
    return {
      operationId: op.operationId,
      entityType: op.entityType,
      entityId: op.entityId,
      reason: 'stale_update',
      serverUpdatedAt: serverUpdatedAt.toISOString(),
      message: 'O servidor possui uma versão mais recente; alteração não aplicada.',
    };
  }

  private isStale(op: SyncOperation, serverUpdatedAt: Date): boolean {
    return serverUpdatedAt.getTime() > new Date(op.updatedAt).getTime();
  }

  private async applyActivity(userId: string, op: SyncOperation): Promise<ApplyResult> {
    const existing = await this.prisma.activity.findFirst({ where: { id: op.entityId, userId } });

    if (op.operationType === 'delete') {
      if (!existing || existing.deletedAt) {
        return {};
      }
      await this.prisma.activity.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      });
      return { activityRef: existing.occurredAt, progressionChanged: true };
    }

    const payload = activitySyncPayloadSchema.parse(op.payload);
    const data = {
      activityType: payload.activityType,
      occurredAt: new Date(payload.occurredAt),
      durationMinutes: payload.durationMinutes,
      perceivedIntensity: payload.perceivedIntensity,
      notes: payload.notes ?? null,
      location: payload.location ?? null,
      moodBefore: payload.moodBefore ?? null,
      moodAfter: payload.moodAfter ?? null,
      hasLocalPhoto: payload.hasLocalPhoto,
      // Informativo: armazenado como fato, jamais entra no cálculo de recompensa.
      movementSteps: payload.movementSteps ?? null,
      movementSignal: payload.movementSignal ?? null,
    };

    if (existing) {
      if (this.isStale(op, existing.updatedAt)) {
        return { conflict: this.conflict(op, existing.updatedAt) };
      }
      const updated = await this.prisma.activity.update({
        where: { id: existing.id },
        data: { ...data, deletedAt: null },
      });
      return { activityRef: updated.occurredAt, progressionChanged: true };
    }

    const created = await this.prisma.activity.create({
      data: {
        id: op.entityId,
        userId,
        clientGeneratedId: payload.clientGeneratedId,
        ...data,
      },
    });
    return { activityRef: created.occurredAt, progressionChanged: true };
  }

  private async applyWeeklyGoal(userId: string, op: SyncOperation): Promise<ApplyResult> {
    if (op.operationType === 'delete') {
      await this.prisma.weeklyGoal.deleteMany({ where: { id: op.entityId, userId } });
      return {};
    }

    const payload = weeklyGoalSchema.parse(op.payload);
    const existing = await this.prisma.weeklyGoal.findFirst({ where: { id: op.entityId, userId } });
    if (existing && this.isStale(op, existing.updatedAt)) {
      return { conflict: this.conflict(op, existing.updatedAt) };
    }

    const data = {
      targetCount: payload.targetCount,
      preferredDays: payload.preferredDays,
      activityTypes: payload.activityTypes,
      startsAt: new Date(payload.startsAt),
      allowExtraActivities: payload.allowExtraActivities,
      active: true,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.weeklyGoal.updateMany({
        where: { userId, active: true, id: { not: op.entityId } },
        data: { active: false },
      });
      await tx.weeklyGoal.upsert({
        where: { id: op.entityId },
        create: { id: op.entityId, userId, ...data },
        update: data,
      });
    });
    return {};
  }

  private async applyUserCreature(userId: string, op: SyncOperation): Promise<ApplyResult> {
    if (op.operationType === 'delete') {
      return {};
    }
    const payload = userCreatureSyncPayloadSchema.parse(op.payload);
    const existing = await this.prisma.userCreature.findUnique({ where: { userId } });
    const conversion = !existing
      ? await this.prisma.localProfileConversion.findUnique({ where: { userId } })
      : null;
    if (existing && this.isStale(op, existing.updatedAt)) {
      return { conflict: this.conflict(op, existing.updatedAt) };
    }

    if (existing && existing.creatureKey !== payload.creatureKey) {
      throw new Error('A seleção inicial do Adari é imutável.');
    }
    const definition = getCreatureByKey(existing?.creatureKey ?? payload.creatureKey);
    if (!definition) throw new Error('Adari desconhecido.');
    const data: Prisma.UserCreatureUncheckedCreateInput = {
      id: existing?.id ?? op.entityId,
      userId,
      creatureKey: definition.key,
      nickname: payload.nickname ?? null,
      level: existing?.level ?? 1,
      xp: existing?.xp ?? 0,
      // Única exceção de bootstrap: uma conversão pendente pode preservar a forma
      // já alcançada no perfil local (0..3). Contas novas sempre começam na forma 0.
      // Fora da conversão, o estágio SÓ muda pela operação validada `adari_evolution`.
      evolutionStage: existing?.evolutionStage ?? (conversion ? Math.max(0, Math.min(3, payload.evolutionStage)) : 0),
      evolvedAt: existing?.evolvedAt ?? (conversion && payload.evolvedAt ? new Date(payload.evolvedAt) : null),
      strength: existing?.strength ?? definition.baseStats.strength,
      endurance: existing?.endurance ?? definition.baseStats.endurance,
      agility: existing?.agility ?? definition.baseStats.agility,
      discipline: existing?.discipline ?? definition.baseStats.discipline,
      recovery: existing?.recovery ?? definition.baseStats.recovery,
      spirit: existing?.spirit ?? definition.baseStats.spirit,
      health: existing?.health ?? definition.baseStats.health,
      energy: existing?.energy ?? 100,
      maxVigor: existing?.maxVigor ?? 100,
      vigorRecoveryRate: existing?.vigorRecoveryRate ?? 5,
      lastVigorCalculationAt: existing?.lastVigorCalculationAt ?? new Date(),
      // Cuidado é derivado exclusivamente de adari_interaction; nunca confia no agregado do cliente.
      bond: existing?.bond ?? 0,
      satiety: existing?.satiety ?? 60,
      lastSatietyCalculationAt: existing?.lastSatietyCalculationAt ?? null,
      activeBehaviorState: existing?.activeBehaviorState ?? 'idle',
      lastInteractionAt: existing?.lastInteractionAt ?? null,
      equippedAbilities: existing?.equippedAbilities.length
        ? existing.equippedAbilities
        : defaultEquippedAbilityIds(definition.key, existing?.level ?? 1),
      defeatedMilestones: existing?.defeatedMilestones ?? (conversion ? payload.defeatedMilestones : []),
    };
    await this.prisma.userCreature.upsert({
      where: { userId },
      create: data,
      update: data,
    });
    return { progressionChanged: true };
  }

  /**
   * Evolução de estágio (Build 5) — NUNCA confia no estágio enviado. Revalida
   * no servidor: transição +1 (sem pulos/regressão), estágio de origem igual ao
   * do servidor, requisitos recalculados a partir de fatos aceitos (nível,
   * atividades, semanas cumpridas, Vínculo, atributos e marcos) e duplicação
   * bloqueada pelo histórico único por transição.
   */
  private async applyAdariEvolution(userId: string, op: SyncOperation): Promise<ApplyResult> {
    if (op.operationType === 'delete') {
      return {};
    }
    const payload = adariEvolutionSyncPayloadSchema.parse(op.payload);
    const creature = await this.prisma.userCreature.findUnique({ where: { userId } });
    if (!creature) throw new Error('Adari não encontrado para evolução.');

    // Idempotência: transição já registrada anteriormente.
    const duplicate = await this.prisma.userAdariEvolutionHistory.findUnique({
      where: {
        userAdariId_fromStage_toStage: {
          userAdariId: creature.id,
          fromStage: payload.fromStage,
          toStage: payload.toStage,
        },
      },
    });
    if (duplicate) return {};

    if (payload.toStage !== payload.fromStage + 1) {
      throw new Error('Transição de estágio inválida: a evolução avança um estágio por vez.');
    }
    if (creature.evolutionStage >= payload.toStage) {
      // Estágio já alcançado por outra via (ex.: outro aparelho): registra só o histórico.
      await this.prisma.userAdariEvolutionHistory.create({
        data: {
          id: op.entityId,
          userAdariId: creature.id,
          fromStage: payload.fromStage,
          toStage: payload.toStage,
          unlockedAt: new Date(payload.unlockedAt),
          triggeringReason: payload.triggeringReason,
          calculationVersion: payload.calculationVersion,
        },
      });
      return {};
    }
    if (creature.evolutionStage !== payload.fromStage) {
      throw new Error('Estágio de origem divergente do servidor.');
    }

    const stageDef = getStageDefinitionByInt(creature.creatureKey, payload.toStage);
    if (!stageDef?.requirements) {
      throw new Error('Estágio de destino desconhecido.');
    }

    const [totalActivities, weeksGoalMet] = await Promise.all([
      this.prisma.activity.count({ where: { userId, deletedAt: null } }),
      this.prisma.weeklyProgress.count({ where: { userId, completed: true } }),
    ]);
    const check = checkEvolution(
      {
        level: creature.level,
        weeksGoalMet,
        totalActivities,
        bond: creature.bond,
        attributes: {
          strength: creature.strength,
          endurance: creature.endurance,
          agility: creature.agility,
          discipline: creature.discipline,
          recovery: creature.recovery,
          spirit: creature.spirit,
          health: creature.health,
          energy: creature.energy,
        },
        defeatedMilestones: creature.defeatedMilestones,
      },
      stageDef.requirements,
    );
    if (!check.available) {
      const pending = check.requirements.filter((r) => !r.met).map((r) => r.label);
      throw new Error(`Requisitos de evolução não atendidos no servidor: ${pending.join('; ')}.`);
    }

    await this.prisma.$transaction([
      this.prisma.userAdariEvolutionHistory.create({
        data: {
          id: op.entityId,
          userAdariId: creature.id,
          fromStage: payload.fromStage,
          toStage: payload.toStage,
          unlockedAt: new Date(payload.unlockedAt),
          triggeringReason: payload.triggeringReason,
          calculationVersion: payload.calculationVersion,
        },
      }),
      this.prisma.userCreature.update({
        where: { userId },
        data: {
          evolutionStage: payload.toStage,
          evolvedAt: new Date(payload.unlockedAt),
        },
      }),
    ]);
    // Atributos são rematerializados (base + recompensas + reforço cumulativo do estágio).
    return { progressionChanged: true };
  }

  /**
   * Registra uma sessão de batalha PvE (idempotente por clientGeneratedId). O servidor
   * NÃO confia no XP/vitórias declarados: re-deriva a recompensa a partir do próprio
   * DailyBattleProgress e sinaliza (serverFlagged) qualquer excesso, sem duplicar.
   * XP e atributos da criatura são rematerializados depois do lote; o cliente
   * nunca é autoridade dos totais agregados.
   */
  private async applyBattleSession(userId: string, op: SyncOperation): Promise<ApplyResult> {
    if (op.operationType === 'delete') {
      return {};
    }
    const payload = battleSessionSyncPayloadSchema.parse(op.payload);

    // Idempotência por (userId, clientGeneratedId).
    const existing = await this.prisma.battleSession.findUnique({
      where: {
        userId_clientGeneratedId: { userId, clientGeneratedId: payload.clientGeneratedId },
      },
    });
    if (existing) {
      return {};
    }

    // Duelos são validados pelo módulo de duelos (server-authoritative); aqui só PvE.
    if (payload.battleType !== 'pve') {
      return {};
    }

    const creature = await this.prisma.userCreature.findUnique({ where: { userId } });
    if (!creature) throw new Error('Adari não encontrado para a batalha.');
    const adversary = payload.adversaryId ? getAdversaryById(payload.adversaryId) : undefined;
    if (!adversary) throw new Error('Adversário PvE desconhecido.');
    const level = creature.level;
    const vigorKind = adversary.difficultyType === 'boss'
      ? 'bossPve'
      : adversary.difficultyType === 'elite'
        ? 'elitePve'
        : 'normalPve';
    const expectedVigorSpent = vigorCostForResult(vigorCostForBattle(vigorKind), payload.result);
    const now = new Date();
    const recovered = recoverVigor({
      currentVigor: creature.energy,
      maxVigor: creature.maxVigor,
      vigorRecoveryRate: creature.vigorRecoveryRate,
      lastVigorCalculationAt: (creature.lastVigorCalculationAt ?? creature.updatedAt).toISOString(),
    }, now.toISOString());
    if (recovered.currentVigor < expectedVigorSpent) {
      throw new Error('Vigor insuficiente para registrar esta batalha.');
    }

    const progress = await this.prisma.dailyBattleProgress.findUnique({
      where: { userId_dayKey: { userId, dayKey: payload.dayKey } },
    });
    const priorWins = progress?.rewardedWins ?? 0;

    // Re-derivação server-side da recompensa (fonte de verdade do teto diário).
    let serverRewarded = false;
    let serverXp = 0;
    if (payload.result === 'victory' && hasRewardedWinAvailable(priorWins)) {
      const winReward = calculatePveWinReward(level, priorWins);
      serverRewarded = winReward.rewarded;
      serverXp = winReward.xp;
    }
    const serverFlagged =
      payload.rewarded !== serverRewarded ||
      payload.xpGranted !== serverXp ||
      payload.vigorSpent !== expectedVigorSpent;

    await this.prisma.$transaction(async (tx) => {
      await tx.battleSession.create({
        data: {
          id: op.entityId,
          userId,
          clientGeneratedId: payload.clientGeneratedId,
          battleType: payload.battleType,
          adversaryId: payload.adversaryId ?? null,
          dayKey: payload.dayKey,
          result: payload.result,
          rewarded: serverRewarded,
          xpGranted: serverXp,
          vigorSpent: expectedVigorSpent,
          seed: payload.seed ?? null,
          turns: payload.turns ?? null,
          serverFlagged,
          battleCalculationVersion: payload.battleCalculationVersion,
        },
      });
      if (serverRewarded) {
        await tx.dailyBattleProgress.upsert({
          where: { userId_dayKey: { userId, dayKey: payload.dayKey } },
          create: { userId, dayKey: payload.dayKey, rewardedWins: 1, xpGranted: serverXp },
          update: {
            rewardedWins: { increment: 1 },
            xpGranted: { increment: serverXp },
          },
        });
      }
      await tx.userCreature.update({
        where: { userId },
        data: {
          energy: recovered.currentVigor - expectedVigorSpent,
          lastVigorCalculationAt: new Date(recovered.lastVigorCalculationAt),
          defeatedMilestones: payload.result === 'victory'
            ? [...new Set([...creature.defeatedMilestones, adversary.id])]
            : creature.defeatedMilestones,
        },
      });
    });
    return { progressionChanged: true };
  }

  private async ensureStarterFood(userId: string): Promise<void> {
    const count = await this.prisma.userFoodInventory.count({ where: { userId } });
    if (count > 0) return;
    await this.prisma.$transaction(async (tx) => {
      for (const food of FOOD_DEFINITIONS) {
        await tx.foodDefinition.upsert({
          where: { key: food.key },
          create: {
            id: food.id,
            key: food.key,
            name: food.name,
            description: food.description,
            satietyValue: food.satietyValue,
            bondValue: food.bondValue,
            preferredByAdariKeys: [...food.preferredByAdariKeys],
            assetKey: food.assetKey,
            contentVersion: food.contentVersion,
            active: food.active,
          },
          update: {
            name: food.name,
            description: food.description,
            satietyValue: food.satietyValue,
            bondValue: food.bondValue,
            preferredByAdariKeys: [...food.preferredByAdariKeys],
            assetKey: food.assetKey,
            contentVersion: food.contentVersion,
            active: food.active,
          },
        });
        await tx.userFoodInventory.upsert({
          where: { userId_foodDefinitionId: { userId, foodDefinitionId: food.id } },
          create: { userId, foodDefinitionId: food.id, quantity: 1 },
          update: {},
        });
      }
    });
  }

  /** Revalida prêmio, data local, Saciedade e inventário; ignora valores confiados ao cliente. */
  private async applyAdariInteraction(userId: string, op: SyncOperation): Promise<ApplyResult> {
    if (op.operationType === 'delete') return {};
    const payload = adariInteractionSyncPayloadSchema.parse(op.payload);
    const existing = await this.prisma.adariInteraction.findUnique({
      where: {
        userId_clientGeneratedId: { userId, clientGeneratedId: payload.clientGeneratedId },
      },
    });
    if (existing) return {};

    const creature = await this.prisma.userCreature.findUnique({ where: { userId } });
    if (!creature || creature.id !== payload.userAdariId) {
      throw new Error('Adari da interação não pertence ao usuário autenticado.');
    }
    const occurredAt = new Date(payload.occurredAt);
    const serverLocalDate = DateTime.fromJSDate(occurredAt, { zone: 'utc' })
      .setZone(payload.timezone)
      .toISODate();
    if (!serverLocalDate || serverLocalDate !== payload.localDate) {
      throw new Error('Data local da interação não corresponde ao instante e fuso informados.');
    }
    if (payload.interactionType === 'activity') {
      const activityId = payload.clientGeneratedId.startsWith('activity-care:')
        ? payload.clientGeneratedId.slice('activity-care:'.length)
        : '';
      const activity = activityId
        ? await this.prisma.activity.findFirst({ where: { id: activityId, userId, deletedAt: null } })
        : null;
      if (!activity || activity.durationMinutes < DURATION.MIN_MINUTES) {
        throw new Error('Interação de atividade sem atividade válida correspondente.');
      }
      const activityLocalDate = DateTime.fromJSDate(activity.occurredAt, { zone: 'utc' })
        .setZone(payload.timezone)
        .toISODate();
      if (activityLocalDate !== serverLocalDate) {
        throw new Error('Data da atividade não corresponde à interação.');
      }
    }
    if (payload.interactionType === 'weekly_goal') {
      const weekKey = payload.clientGeneratedId.startsWith('weekly-goal-care:')
        ? payload.clientGeneratedId.slice('weekly-goal-care:'.length)
        : '';
      const completed = weekKey
        ? await this.prisma.weeklyProgress.findUnique({ where: { userId_weekKey: { userId, weekKey } } })
        : null;
      if (!completed?.completed) throw new Error('Meta semanal ainda não concluída.');
    }

    const [sameTypeCount, dayAggregate] = await Promise.all([
      this.prisma.adariInteraction.count({
        where: {
          userAdariId: creature.id,
          localDate: serverLocalDate,
          interactionType: payload.interactionType,
        },
      }),
      this.prisma.adariInteraction.aggregate({
        where: { userAdariId: creature.id, localDate: serverLocalDate },
        _sum: { bondGranted: true },
      }),
    ]);

    let favoriteFood = false;
    let satietyGranted = 0;
    let rewardFoodDefinitionId: string | null = null;
    let nextSatiety = recalculateSatiety(
      {
        satiety: creature.satiety,
        lastSatietyCalculationAt:
          creature.lastSatietyCalculationAt?.toISOString() ?? creature.updatedAt.toISOString(),
      },
      occurredAt.toISOString(),
    ).satiety;
    let foodDefinitionId: string | null = null;

    if (payload.interactionType === 'feed') {
      const food = payload.foodDefinitionId ? getFoodDefinition(payload.foodDefinitionId) : undefined;
      if (!food) throw new Error('Alimento inválido.');
      await this.ensureStarterFood(userId);
      const inventory = await this.prisma.userFoodInventory.findUnique({
        where: { userId_foodDefinitionId: { userId, foodDefinitionId: food.id } },
      });
      if (!inventory || inventory.quantity <= 0) throw new Error('Alimento indisponível.');
      const feeding = applyFood(nextSatiety, food, creature.creatureKey);
      if (!feeding.accepted) throw new Error('Adari já está muito satisfeito.');
      favoriteFood = feeding.favorite;
      nextSatiety = feeding.nextSatiety;
      satietyGranted = feeding.satietyGranted;
      foodDefinitionId = food.id;
    } else if (payload.interactionType === 'activity') {
      await this.ensureStarterFood(userId);
      rewardFoodDefinitionId = FOOD_DEFINITIONS[
        [...serverLocalDate].reduce((sum, char) => sum + char.charCodeAt(0), 0) % FOOD_DEFINITIONS.length
      ]!.id;
    } else if (payload.interactionType === 'weekly_goal') {
      await this.ensureStarterFood(userId);
      rewardFoodDefinitionId = 'food-celestial-nectar';
    }

    const reward = calculateBondReward({
      interactionType: payload.interactionType,
      currentBond: creature.bond,
      commonGrantedToday: dayAggregate._sum.bondGranted ?? 0,
      sameTypeCountToday: sameTypeCount,
      favoriteFood,
    });
    const serverFlagged =
      payload.bondGranted !== reward.granted || payload.satietyGranted !== satietyGranted;

    await this.prisma.$transaction(async (tx) => {
      if (foodDefinitionId) {
        const consumed = await tx.userFoodInventory.updateMany({
          where: { userId, foodDefinitionId, quantity: { gt: 0 } },
          data: { quantity: { decrement: 1 } },
        });
        if (consumed.count !== 1) throw new Error('Alimento indisponível.');
      }
      if (rewardFoodDefinitionId) {
        await tx.userFoodInventory.update({
          where: {
            userId_foodDefinitionId: { userId, foodDefinitionId: rewardFoodDefinitionId },
          },
          data: { quantity: { increment: 1 } },
        });
      }
      await tx.adariInteraction.create({
        data: {
          id: op.entityId,
          clientGeneratedId: payload.clientGeneratedId,
          userId,
          userAdariId: creature.id,
          interactionType: payload.interactionType,
          foodDefinitionId,
          bondGranted: reward.granted,
          satietyGranted,
          occurredAt,
          localDate: serverLocalDate,
          timezone: payload.timezone,
          calculationVersion: payload.calculationVersion,
          serverFlagged,
        },
      });
      await tx.userCreature.update({
        where: { id: creature.id },
        data: {
          bond: reward.nextBond,
          satiety: nextSatiety,
          lastSatietyCalculationAt: occurredAt,
          activeBehaviorState:
            payload.interactionType === 'feed' ? 'eating' : 'receivingAffection',
          lastInteractionAt: occurredAt,
        },
      });
    });
    return {};
  }

  private async applyObservatoryState(userId: string, op: SyncOperation): Promise<ApplyResult> {
    if (op.operationType === 'delete') return {};
    const payload = observatoryStateSyncPayloadSchema.parse(op.payload);
    const existing = await this.prisma.observatoryState.findUnique({ where: { userId } });
    if (existing && this.isStale(op, existing.updatedAt)) {
      return { conflict: this.conflict(op, existing.updatedAt) };
    }
    const data = {
      selectedControlMode: payload.selectedControlMode,
      unlockedObjects: payload.unlockedObjects,
      seenDialogueKeys: payload.seenDialogueKeys,
      reduceMotion: payload.reduceMotion,
      particlesEnabled: payload.particlesEnabled,
      movementSpeed: payload.movementSpeed,
      qualityMode: payload.qualityMode,
      musicEnabled: payload.musicEnabled,
      effectsEnabled: payload.effectsEnabled,
      hapticsEnabled: payload.hapticsEnabled,
    };
    await this.prisma.observatoryState.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return {};
  }

  private async applyProfile(userId: string, op: SyncOperation): Promise<ApplyResult> {
    // `avatarAppearance` (Explorador) ainda é aceito pelo schema, mas descartado
    // aqui: clientes antigos o enviam em toda push de perfil e rejeitar faria a
    // operação falhar e a outbox deles retentar para sempre.
    const { avatarAppearance: _removedExplorer, ...payload } = updateProfileSchema.parse(op.payload);
    const existing = await this.prisma.profile.findUnique({ where: { userId } });
    if (!existing) {
      return {};
    }
    // Bootstrap de conversão, espelhando o que `applyUserCreature` já faz.
    //
    // A conversão CRIA o Profile no servidor com `updatedAt = agora` e sem
    // `goal`. O push que vem em seguida carrega o perfil local, cujo `updatedAt`
    // é necessariamente anterior — então o stale-check rejeitava 100% das
    // conversões e o objetivo escolhido no onboarding nunca chegava ao servidor.
    // Sem ele, o cliente não conseguia reconstruir o progresso e mandava o
    // usuário refazer o onboarding inteiro.
    const bootstrapping = existing.goal === null
      ? await this.prisma.localProfileConversion.findUnique({ where: { userId } })
      : null;
    if (!bootstrapping && this.isStale(op, existing.updatedAt)) {
      return { conflict: this.conflict(op, existing.updatedAt) };
    }
    await this.prisma.profile.update({ where: { userId }, data: payload });
    return {};
  }

  private async record(
    userId: string,
    deviceId: string,
    op: SyncOperation,
    result: 'processed' | 'conflict' | 'failed' | 'duplicate',
  ): Promise<void> {
    await this.prisma.syncOperation.create({
      data: {
        userId,
        deviceId,
        operationId: op.operationId,
        entityType: op.entityType,
        entityId: op.entityId,
        operationType: op.operationType,
        payloadHash: sha256(JSON.stringify(op.payload ?? {})),
        result,
      },
    });
  }

  private async collectServerChanges(
    userId: string,
    since: Date | null,
  ): Promise<SyncServerChange[]> {
    const changes: SyncServerChange[] = [];
    const updatedFilter = since ? { updatedAt: { gt: since } } : {};

    const [profile, creature, goals, activities, progress, observatory, inventory, interactions, evolutions] = await Promise.all([
      this.prisma.profile.findFirst({ where: { userId, ...updatedFilter } }),
      this.prisma.userCreature.findFirst({ where: { userId, ...updatedFilter } }),
      this.prisma.weeklyGoal.findMany({ where: { userId, ...updatedFilter } }),
      this.prisma.activity.findMany({ where: { userId, ...updatedFilter } }),
      this.prisma.weeklyProgress.findMany({ where: { userId, ...updatedFilter } }),
      this.prisma.observatoryState.findFirst({ where: { userId, ...updatedFilter } }),
      this.prisma.userFoodInventory.findMany({ where: { userId, ...updatedFilter } }),
      this.prisma.adariInteraction.findMany({
        where: { userId, ...(since ? { createdAt: { gt: since } } : {}) },
      }),
      this.prisma.userAdariEvolutionHistory.findMany({
        where: {
          userAdari: { userId },
          ...(since ? { createdAt: { gt: since } } : {}),
        },
        orderBy: { toStage: 'asc' },
      }),
    ]);

    if (profile) {
      changes.push({
        entityType: 'profile',
        entityId: profile.id,
        operationType: 'upsert',
        updatedAt: profile.updatedAt.toISOString(),
        payload: {
          displayName: profile.displayName,
          timezone: profile.timezone,
          locale: profile.locale,
          avatarType: profile.avatarType,
          shareCreatureLevel: profile.shareCreatureLevel,
          goal: profile.goal,
        },
      });
    }

    if (creature) {
      changes.push({
        entityType: 'user_creature',
        entityId: creature.id,
        operationType: 'upsert',
        updatedAt: creature.updatedAt.toISOString(),
        payload: {
          creatureKey: creature.creatureKey,
          nickname: creature.nickname,
          level: creature.level,
          xp: creature.xp,
          evolutionStage: creature.evolutionStage,
          evolvedAt: creature.evolvedAt?.toISOString() ?? null,
          strength: creature.strength,
          endurance: creature.endurance,
          agility: creature.agility,
          discipline: creature.discipline,
          recovery: creature.recovery,
          spirit: creature.spirit,
          health: creature.health,
          energy: creature.energy,
          maxVigor: creature.maxVigor,
          vigorRecoveryRate: creature.vigorRecoveryRate,
          lastVigorCalculationAt: creature.lastVigorCalculationAt?.toISOString() ?? null,
          bond: creature.bond,
          satiety: creature.satiety,
          lastSatietyCalculationAt: creature.lastSatietyCalculationAt?.toISOString() ?? null,
          activeBehaviorState: creature.activeBehaviorState,
          lastInteractionAt: creature.lastInteractionAt?.toISOString() ?? null,
          equippedAbilities: creature.equippedAbilities,
          defeatedMilestones: creature.defeatedMilestones,
        },
      });
    }

    for (const evolution of evolutions) {
      changes.push({
        entityType: 'adari_evolution',
        entityId: evolution.id,
        operationType: 'upsert',
        updatedAt: evolution.createdAt.toISOString(),
        payload: {
          clientGeneratedId: evolution.id,
          userAdariId: evolution.userAdariId,
          fromStage: evolution.fromStage,
          toStage: evolution.toStage,
          unlockedAt: evolution.unlockedAt.toISOString(),
          triggeringReason: evolution.triggeringReason,
          calculationVersion: evolution.calculationVersion,
        },
      });
    }

    for (const goal of goals) {
      changes.push({
        entityType: 'weekly_goal',
        entityId: goal.id,
        operationType: 'upsert',
        updatedAt: goal.updatedAt.toISOString(),
        payload: {
          targetCount: goal.targetCount,
          preferredDays: goal.preferredDays,
          activityTypes: goal.activityTypes,
          startsAt: goal.startsAt.toISOString(),
          allowExtraActivities: goal.allowExtraActivities,
          active: goal.active,
        },
      });
    }

    for (const activity of activities) {
      changes.push({
        entityType: 'activity',
        entityId: activity.id,
        operationType: activity.deletedAt ? 'delete' : 'upsert',
        updatedAt: activity.updatedAt.toISOString(),
        payload: activity.deletedAt
          ? null
          : {
              clientGeneratedId: activity.clientGeneratedId,
              activityType: activity.activityType,
              occurredAt: activity.occurredAt.toISOString(),
              durationMinutes: activity.durationMinutes,
              perceivedIntensity: activity.perceivedIntensity,
              notes: activity.notes,
              location: activity.location,
              moodBefore: activity.moodBefore,
              moodAfter: activity.moodAfter,
              hasLocalPhoto: activity.hasLocalPhoto,
              movementSteps: activity.movementSteps,
              movementSignal: activity.movementSignal,
            },
      });
    }

    for (const week of progress) {
      changes.push({
        entityType: 'weekly_progress',
        entityId: week.id,
        operationType: 'upsert',
        updatedAt: week.updatedAt.toISOString(),
        payload: {
          weekKey: week.weekKey,
          weekStart: week.weekStart.toISOString(),
          weekEnd: week.weekEnd.toISOString(),
          targetCount: week.targetCount,
          validActivityCount: week.validActivityCount,
          percentage: week.percentage,
          completed: week.completed,
          completedAt: week.completedAt?.toISOString() ?? null,
        },
      });
    }

    if (observatory) {
      changes.push({
        entityType: 'observatory_state',
        entityId: observatory.id,
        operationType: 'upsert',
        updatedAt: observatory.updatedAt.toISOString(),
        payload: {
          selectedControlMode: observatory.selectedControlMode,
          unlockedObjects: observatory.unlockedObjects,
          seenDialogueKeys: observatory.seenDialogueKeys,
          reduceMotion: observatory.reduceMotion,
          particlesEnabled: observatory.particlesEnabled,
          movementSpeed: observatory.movementSpeed,
          qualityMode: observatory.qualityMode,
          musicEnabled: observatory.musicEnabled,
          effectsEnabled: observatory.effectsEnabled,
          hapticsEnabled: observatory.hapticsEnabled,
        },
      });
    }
    for (const item of inventory) {
      changes.push({
        entityType: 'food_inventory',
        entityId: item.id,
        operationType: 'upsert',
        updatedAt: item.updatedAt.toISOString(),
        payload: { foodDefinitionId: item.foodDefinitionId, quantity: item.quantity },
      });
    }
    for (const interaction of interactions) {
      changes.push({
        entityType: 'adari_interaction',
        entityId: interaction.id,
        operationType: 'upsert',
        updatedAt: interaction.createdAt.toISOString(),
        payload: {
          clientGeneratedId: interaction.clientGeneratedId,
          userAdariId: interaction.userAdariId,
          interactionType: interaction.interactionType,
          foodDefinitionId: interaction.foodDefinitionId,
          bondGranted: interaction.bondGranted,
          satietyGranted: interaction.satietyGranted,
          occurredAt: interaction.occurredAt.toISOString(),
          localDate: interaction.localDate,
          timezone: interaction.timezone,
          calculationVersion: interaction.calculationVersion,
        },
      });
    }

    return changes;
  }
}
