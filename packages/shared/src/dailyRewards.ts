import { affinityFor } from './attributeProgression';
import { calculateActivityReward, isRewardEligibleDuration, type ActivityReward } from './rewards';

/** Atividade de um dia com o necessário para ordenar e pontuar. */
export interface DayActivity {
  id: string;
  activityType: string;
  perceivedIntensity: string;
  durationMinutes: number;
  /** ISO UTC. */
  occurredAt: string;
  /** ISO UTC (desempate). */
  createdAt: string;
  /** Excluída (soft delete) — permanece no dia mas não ocupa posição nem pontua. */
  deleted?: boolean;
}

export interface DayActivityReward extends ActivityReward {
  activityId: string;
}

/** Recompensa nula (para atividades excluídas ou não elegíveis). */
export function zeroReward(activityId: string, calculationVersion: number): DayActivityReward {
  return {
    activityId,
    eligible: false,
    rewardEligiblePosition: 0,
    dailyRewardMultiplier: 0,
    countsTowardGoal: false,
    baseXp: 0,
    finalXp: 0,
    baseEnergy: 0,
    finalEnergy: 0,
    baseTrainingChanges: {},
    finalTrainingChanges: {},
    baseAttributeChanges: {},
    finalAttributeChanges: {},
    baseTrainingPoints: 0,
    finalTrainingPoints: 0,
    affinity: affinityFor('outro'),
    calculationVersion,
  };
}

/**
 * Ordena as atividades do dia (occurredAt → createdAt → id), atribui a posição
 * entre as ELEGÍVEIS (não excluídas + duração >= mínimo) e calcula a recompensa
 * de cada uma. Função PURA — a fonte única da política de recompensa diária.
 */
export function computeDayRewards(activities: readonly DayActivity[]): DayActivityReward[] {
  const ordered = [...activities].sort((a, b) => {
    if (a.occurredAt !== b.occurredAt) {
      return a.occurredAt.localeCompare(b.occurredAt);
    }
    if (a.createdAt !== b.createdAt) {
      return a.createdAt.localeCompare(b.createdAt);
    }
    return a.id.localeCompare(b.id);
  });

  let eligiblePosition = 0;
  return ordered.map((activity) => {
    const eligible = !activity.deleted && isRewardEligibleDuration(activity.durationMinutes);
    const position = eligible ? (eligiblePosition += 1) : 0;
    const reward = calculateActivityReward(activity, position);
    return { ...reward, activityId: activity.id };
  });
}

/** Nº de dias distintos (chaveados por caller) representados aqui não é responsabilidade daqui. */
export function countGoalCounting(rewards: readonly DayActivityReward[]): number {
  return rewards.filter((r) => r.countsTowardGoal).length;
}
