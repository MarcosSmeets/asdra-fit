import {
  computeStreak,
  computeWeeklyProgress,
  countValidDays,
  getWeekBounds,
  type StreakResult,
  type WeekOutcome,
} from '@ad-sidera/shared';
import type { ActivityRecord, WeeklyProgressRecord } from '../db/models';

/** Recalcula o progresso de uma semana a partir das atividades locais. */
export function recomputeWeekProgress(
  activities: readonly ActivityRecord[],
  targetCount: number,
  referenceIso: string,
  timezone: string,
  previousCompletedAt: string | null,
  nowIso: string,
): WeeklyProgressRecord {
  const bounds = getWeekBounds(referenceIso, timezone);
  const inWeek = activities.filter(
    (a) => a.deletedAt === null && a.occurredAt >= bounds.weekStart && a.occurredAt <= bounds.weekEnd,
  );
  const valid = countValidDays(
    inWeek.map((a) => ({
      activityType: a.activityType,
      occurredAt: a.occurredAt,
      durationMinutes: a.durationMinutes,
    })),
    timezone,
  );
  const progress = computeWeeklyProgress(valid, targetCount);
  const completedAt = progress.completed ? (previousCompletedAt ?? nowIso) : null;

  return {
    weekKey: bounds.weekKey,
    weekStart: bounds.weekStart,
    weekEnd: bounds.weekEnd,
    targetCount,
    validActivityCount: valid,
    percentage: progress.percentageDisplayed,
    completed: progress.completed,
    completedAt,
  };
}

export function computeLocalStreak(finished: readonly WeeklyProgressRecord[]): StreakResult {
  const outcomes: WeekOutcome[] = finished.map((w) => ({
    weekStart: w.weekStart,
    completed: w.completed,
  }));
  return computeStreak(outcomes);
}
