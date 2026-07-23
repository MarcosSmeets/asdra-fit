import type { StreakResult } from '@ad-sidera/shared';
import { getDatabase } from '../db/database';
import type { ProfileRecord, WeeklyProgressRecord } from '../db/models';
import { activityRepository } from '../db/repositories/activityRepository';
import { profileRepository } from '../db/repositories/profileRepository';
import { weeklyGoalRepository } from '../db/repositories/weeklyGoalRepository';
import { weeklyProgressRepository } from '../db/repositories/weeklyProgressRepository';
import { computeLocalStreak, recomputeWeekProgress } from '../domain/localProgress';
import { getWeekBounds } from '@ad-sidera/shared';
import { nowIso } from '../utils/datetime';

async function timezone(): Promise<string> {
  const db = await getDatabase();
  const profile: ProfileRecord | null = await profileRepository.get(db);
  return profile?.timezone ?? 'UTC';
}

export async function getCurrentWeek(): Promise<WeeklyProgressRecord | null> {
  const db = await getDatabase();
  const goal = await weeklyGoalRepository.getActive(db);
  if (!goal) {
    return null;
  }
  const tz = await timezone();
  const now = nowIso();
  const bounds = getWeekBounds(now, tz);
  const activities = await activityRepository.listBetween(db, bounds.weekStart, bounds.weekEnd);
  const previous = await weeklyProgressRepository.get(db, bounds.weekKey);
  const progress = recomputeWeekProgress(
    activities,
    goal.targetCount,
    now,
    tz,
    previous?.completedAt ?? null,
    now,
  );
  await weeklyProgressRepository.upsert(db, progress, now);
  return progress;
}

export async function getStreak(): Promise<StreakResult & { completedWeeks: number }> {
  const db = await getDatabase();
  const finished = await weeklyProgressRepository.finished(db, nowIso());
  const streak = computeLocalStreak(finished);
  return { ...streak, completedWeeks: finished.filter((w) => w.completed).length };
}

export async function getWeeklyHistory(): Promise<WeeklyProgressRecord[]> {
  const db = await getDatabase();
  return weeklyProgressRepository.history(db);
}
