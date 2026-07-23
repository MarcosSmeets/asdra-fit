import { RANKING } from './constants';

/**
 * Pontuação de ranking de liga. Baseada principalmente no percentual da meta
 * PESSOAL (nunca volume absoluto). Bônus limitados para não superar a meta.
 */
export interface RankingInput {
  userId: string;
  validActivityCount: number;
  targetCount: number;
  /** Sequência de semanas cumpridas (será limitada pelo cap). */
  currentStreakWeeks: number;
  completed: boolean;
  /** Nº de semanas cumpridas na temporada (desempate). */
  completedWeeksInSeason: number;
  /** ISO do momento em que a meta foi cumprida na semana (desempate); null se não cumpriu. */
  goalCompletedAt: string | null;
}

export interface RankingScore {
  userId: string;
  base: number;
  streakBonus: number;
  completionBonus: number;
  finalScore: number;
  goalPercentage: number;
}

export interface RankingEntry extends RankingScore {
  position: number;
}

export function computeRankingScore(input: RankingInput): RankingScore {
  if (input.targetCount < 1) {
    throw new Error('computeRankingScore: meta deve ser >= 1');
  }
  const goalPercentage = Math.min(input.validActivityCount / input.targetCount, 1);
  const base = goalPercentage * 100;
  const boundedStreak = Math.min(
    Math.max(0, input.currentStreakWeeks),
    RANKING.STREAK_BONUS_CAP_WEEKS,
  );
  const streakBonus = boundedStreak * RANKING.STREAK_BONUS_PER_WEEK;
  const completionBonus = input.completed ? RANKING.PERFECT_WEEK_BONUS : 0;
  const finalScore = base + streakBonus + completionBonus;
  return { userId: input.userId, base, streakBonus, completionBonus, finalScore, goalPercentage };
}

/**
 * Ordena entradas e atribui posições. Desempate (§15):
 * 1) maior percentual da meta; 2) mais semanas cumpridas na temporada;
 * 3) conclusão mais antiga; 4) ordem estável por userId.
 */
export function rankLeague(inputs: readonly RankingInput[]): RankingEntry[] {
  const scored = inputs.map((input) => ({ input, score: computeRankingScore(input) }));

  scored.sort((a, b) => {
    if (b.score.finalScore !== a.score.finalScore) {
      return b.score.finalScore - a.score.finalScore;
    }
    if (b.score.goalPercentage !== a.score.goalPercentage) {
      return b.score.goalPercentage - a.score.goalPercentage;
    }
    if (b.input.completedWeeksInSeason !== a.input.completedWeeksInSeason) {
      return b.input.completedWeeksInSeason - a.input.completedWeeksInSeason;
    }
    const aAt = a.input.goalCompletedAt;
    const bAt = b.input.goalCompletedAt;
    if (aAt && bAt && aAt !== bAt) {
      return aAt.localeCompare(bAt); // mais antiga primeiro
    }
    if (aAt && !bAt) return -1;
    if (!aAt && bAt) return 1;
    return a.input.userId.localeCompare(b.input.userId);
  });

  return scored.map((entry, index) => ({ ...entry.score, position: index + 1 }));
}
