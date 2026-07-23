import { getDatabase } from '../db/database';
import type { WeeklyGoalRecord } from '../db/models';
import { weeklyGoalRepository } from '../db/repositories/weeklyGoalRepository';
import { nowIso } from '../utils/datetime';
import { uuidv4 } from '../utils/id';
import { enqueueOperation } from './outbox';
import { goalSyncPayload } from './syncPayloads';

export interface SaveGoalInput {
  targetCount: number;
  preferredDays: number[];
  activityTypes: string[];
  startsAt: string;
  allowExtraActivities: boolean;
}

export async function getActiveGoal(): Promise<WeeklyGoalRecord | null> {
  const db = await getDatabase();
  return weeklyGoalRepository.getActive(db);
}

export async function saveGoal(input: SaveGoalInput): Promise<WeeklyGoalRecord> {
  const db = await getDatabase();
  const existing = await weeklyGoalRepository.getActive(db);
  const now = nowIso();
  const goal: WeeklyGoalRecord = {
    id: existing?.id ?? uuidv4(),
    targetCount: input.targetCount,
    preferredDays: input.preferredDays,
    activityTypes: input.activityTypes as WeeklyGoalRecord['activityTypes'],
    startsAt: input.startsAt,
    endsAt: null,
    active: true,
    allowExtraActivities: input.allowExtraActivities,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    syncStatus: 'pending',
  };
  await weeklyGoalRepository.upsertActive(db, goal);
  await enqueueOperation(db, {
    entityType: 'weekly_goal',
    entityId: goal.id,
    operationType: 'upsert',
    updatedAt: now,
    payload: goalSyncPayload(goal),
  });
  return goal;
}
