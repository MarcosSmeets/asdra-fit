/**
 * Sequência baseada em SEMANAS com meta cumprida (não em dias consecutivos).
 * Nunca há punição destrutiva: quebra apenas zera a sequência atual.
 */

export interface WeekOutcome {
  /** Início da semana em ISO (para ordenação estável). */
  weekStart: string;
  completed: boolean;
}

export interface StreakResult {
  currentStreak: number;
  bestStreak: number;
  /** Mensagem encorajadora (nunca culpabilizadora) para exibir na UI. */
  message: string;
}

const ENCOURAGE_ONGOING = 'Sua jornada continua. Cada semana cumprida fortalece seu companheiro.';
const ENCOURAGE_BROKEN =
  'Uma semana difícil não apaga sua jornada. Vamos construir a próxima juntos.';
const ENCOURAGE_START = 'Toda grande sequência começa por uma semana. Vamos lá.';

/**
 * Recebe as semanas JÁ FINALIZADAS em ordem cronológica (mais antiga primeiro)
 * e retorna a melhor sequência histórica e a sequência atual (contígua até o fim).
 */
export function computeStreak(finishedWeeks: readonly WeekOutcome[]): StreakResult {
  const ordered = [...finishedWeeks].sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  let best = 0;
  let run = 0;
  for (const week of ordered) {
    if (week.completed) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }

  // Sequência atual = corrida contígua terminando na última semana finalizada.
  let current = 0;
  for (let i = ordered.length - 1; i >= 0; i -= 1) {
    if (ordered[i]?.completed) {
      current += 1;
    } else {
      break;
    }
  }

  let message = ENCOURAGE_START;
  if (ordered.length > 0) {
    const last = ordered[ordered.length - 1];
    message = last?.completed ? ENCOURAGE_ONGOING : ENCOURAGE_BROKEN;
  }

  return { currentStreak: current, bestStreak: best, message };
}

export const STREAK_MESSAGES = {
  ongoing: ENCOURAGE_ONGOING,
  broken: ENCOURAGE_BROKEN,
  start: ENCOURAGE_START,
} as const;
