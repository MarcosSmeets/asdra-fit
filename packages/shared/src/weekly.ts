/**
 * Progresso semanal. O percentual exibido pode ultrapassar 100%, mas o
 * percentual usado para ranking é limitado a 1 (min).
 */
export interface WeeklyProgressResult {
  targetCount: number;
  validActivityCount: number;
  /** valid / target (pode passar de 1). */
  percentageDisplayed: number;
  /** min(valid / target, 1) — usado no ranking. */
  percentageForRanking: number;
  completed: boolean;
  remaining: number;
}

export function computeWeeklyProgress(
  validActivityCount: number,
  targetCount: number,
): WeeklyProgressResult {
  if (targetCount < 1) {
    throw new Error('computeWeeklyProgress: meta semanal deve ser >= 1');
  }
  const valid = Math.max(0, Math.floor(validActivityCount));
  const percentageDisplayed = valid / targetCount;
  const percentageForRanking = Math.min(percentageDisplayed, 1);
  return {
    targetCount,
    validActivityCount: valid,
    percentageDisplayed,
    percentageForRanking,
    completed: valid >= targetCount,
    remaining: Math.max(0, targetCount - valid),
  };
}
