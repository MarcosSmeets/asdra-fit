import {
  computeDayRewards,
  getWeekBounds,
  type AttributeChanges,
  type DayActivity,
  type DayActivityReward,
} from '@ad-sidera/shared';
import { getDatabase } from '../db/database';
import type { CreatureState, WeeklyProgressRecord } from '../db/models';
import { activityRepository } from '../db/repositories/activityRepository';
import { creatureRepository } from '../db/repositories/creatureRepository';
import { weeklyGoalRepository } from '../db/repositories/weeklyGoalRepository';
import { weeklyProgressRepository } from '../db/repositories/weeklyProgressRepository';
import type { SqlDatabase } from '../db/types';
import {
  applyRewardDeltas,
  ATTRIBUTE_KEYS,
  isEvolutionAvailableFor,
  type RewardDelta,
} from '../domain/creatureAggregate';
import { recomputeWeekProgress } from '../domain/localProgress';
import { dayBounds, nowIso } from '../utils/datetime';
import { uuidv4 } from '../utils/id';
import { enqueueOperation } from './outbox';
import { creatureSyncPayload } from './syncPayloads';

export interface RecalcResult {
  creature: CreatureState | null;
  weeklyProgress: WeeklyProgressRecord | null;
  leveledUp: boolean;
  evolutionAvailable: boolean;
  rewardByActivityId: Map<string, DayActivityReward>;
}

function accumulateAttributeDelta(
  acc: Record<string, number>,
  next: AttributeChanges,
  prev?: AttributeChanges,
): void {
  for (const key of ATTRIBUTE_KEYS) {
    const delta = (next[key] ?? 0) - (prev?.[key] ?? 0);
    if (delta !== 0) {
      acc[key] = (acc[key] ?? 0) + delta;
    }
  }
}

async function recomputeWeekFor(
  db: SqlDatabase,
  occurredAtIso: string,
  timezone: string,
): Promise<WeeklyProgressRecord | null> {
  const goal = await weeklyGoalRepository.getActive(db);
  if (!goal) {
    return null;
  }
  const bounds = getWeekBounds(occurredAtIso, timezone);
  const activities = await activityRepository.listBetween(db, bounds.weekStart, bounds.weekEnd);
  const previous = await weeklyProgressRepository.get(db, bounds.weekKey);
  const progress = recomputeWeekProgress(
    activities,
    goal.targetCount,
    occurredAtIso,
    timezone,
    previous?.completedAt ?? null,
    nowIso(),
  );
  await weeklyProgressRepository.upsert(db, progress, nowIso());
  return progress;
}

/**
 * Recalcula TODAS as recompensas do dia que contém `occurredAtIso` (política v2):
 * ordena as atividades, reatribui posições, reescreve as recompensas e aplica o
 * delta líquido (novo − antigo) ao agregado da criatura, tudo em uma transação.
 * Idempotente: rodar de novo sem mudanças não altera o agregado.
 */
export async function recalcDay(
  occurredAtIso: string,
  timezone: string,
  options: { db?: SqlDatabase; withinTransaction?: boolean } = {},
): Promise<RecalcResult> {
  const db = options.db ?? await getDatabase();
  const creature = await creatureRepository.get(db);
  const { start, end } = dayBounds(occurredAtIso, timezone);
  const activities = await activityRepository.listDayActivities(db, start, end);

  const dayInputs: DayActivity[] = activities.map((a) => ({
    id: a.id,
    activityType: a.activityType,
    perceivedIntensity: a.perceivedIntensity,
    durationMinutes: a.durationMinutes,
    occurredAt: a.occurredAt,
    createdAt: a.createdAt,
    deleted: a.deletedAt !== null,
  }));
  const newRewards = computeDayRewards(dayInputs);
  const rewardByActivityId = new Map(newRewards.map((r) => [r.activityId, r]));
  const oldRewards = await activityRepository.getRewardsForActivities(
    db,
    activities.map((a) => a.id),
  );

  let xpDelta = 0;
  let energyDelta = 0;
  const attributeDeltas: Record<string, number> = {};
  for (const reward of newRewards) {
    const old = oldRewards.get(reward.activityId);
    xpDelta += reward.finalXp - (old?.finalXp ?? 0);
    energyDelta += reward.finalEnergy - (old?.finalEnergy ?? 0);
    accumulateAttributeDelta(attributeDeltas, reward.finalAttributeChanges, old?.finalAttributeChanges);
  }

  const totalActivities = await activityRepository.countActive(db);
  const weeksGoalMet = await weeklyGoalRepository.countCompletedWeeks(db);
  const now = nowIso();

  let updated: CreatureState | null = creature;
  let leveledUp = false;
  let evolutionAvailable = false;
  if (creature) {
    const delta: RewardDelta = { xpDelta, energyDelta, attributeDeltas, totalActivities };
    updated = applyRewardDeltas(creature, delta, now);
    leveledUp = updated.level > creature.level;
    evolutionAvailable = isEvolutionAvailableFor(updated, weeksGoalMet);
  }

  const persist = async () => {
    for (const reward of newRewards) {
      await activityRepository.upsertReward(db, {
        id: uuidv4(),
        activityId: reward.activityId,
        rewardKey: reward.activityId,
        rewardEligiblePosition: reward.rewardEligiblePosition,
        dailyRewardMultiplier: reward.dailyRewardMultiplier,
        baseXp: reward.baseXp,
        finalXp: reward.finalXp,
        baseEnergy: reward.baseEnergy,
        finalEnergy: reward.finalEnergy,
        baseAttributeChanges: reward.baseAttributeChanges,
        finalAttributeChanges: reward.finalAttributeChanges,
        calculatedAt: now,
        calculationVersion: reward.calculationVersion,
      });
      await activityRepository.setScored(db, reward.activityId, reward.countsTowardGoal);
    }
    if (updated) {
      await creatureRepository.update(db, updated);
      await enqueueOperation(db, {
        entityType: 'user_creature',
        entityId: updated.id,
        operationType: 'upsert',
        updatedAt: updated.updatedAt,
        payload: creatureSyncPayload(updated),
      });
    }
  };
  if (options.withinTransaction) await persist();
  else await db.withTransactionAsync(persist);

  const weeklyProgress = await recomputeWeekFor(db, occurredAtIso, timezone);
  return { creature: updated, weeklyProgress, leveledUp, evolutionAvailable, rewardByActivityId };
}
