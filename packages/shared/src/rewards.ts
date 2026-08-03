import { CALCULATION_VERSION } from '@ad-sidera/config';
import {
  calculateActivityTraining,
  type ActivityAttributeAffinity,
} from './attributeProgression';
import {
  DAILY_REWARD_MULTIPLIERS,
  DURATION,
  INTENSITY_XP,
  VIGOR,
} from './constants';
import { ACTIVITY_TYPES, INTENSITIES, type ActivityType, type Intensity } from './enums';
import type { AttributeChanges } from './types';

/**
 * Recompensa de uma atividade (economia v2). A recompensa base depende do tipo,
 * intensidade e duração; o valor FINAL aplica o multiplicador diário decrescente
 * conforme a posição da atividade entre as ELEGÍVEIS do dia (1ª=100%, 2ª=25%, 3ª+=0%).
 * Nenhuma atividade é bloqueada — apenas a recompensa de progressão diminui.
 */
export interface ActivityReward {
  /** Elegível a recompensa (tipo válido + duração >= mínimo). */
  eligible: boolean;
  /** Posição entre as atividades elegíveis do dia (1-based); 0 se não elegível. */
  rewardEligiblePosition: number;
  dailyRewardMultiplier: number;
  /** Apenas a 1ª atividade elegível do dia conta para a meta semanal e a liga. */
  countsTowardGoal: boolean;
  baseXp: number;
  finalXp: number;
  baseEnergy: number;
  finalEnergy: number;
  /**
   * PONTOS DE TREINO por atributo (Build 6) — não são mais pontos inteiros de
   * atributo. O atributo sobe 1 a cada `ATTRIBUTE_TRAINING.PROGRESS_REQUIRED`
   * pontos acumulados; ver `attributeProgression.ts`.
   */
  baseTrainingChanges: AttributeChanges;
  finalTrainingChanges: AttributeChanges;
  /** @deprecated Build 6: alias de `baseTrainingChanges` (mesmos valores). */
  baseAttributeChanges: AttributeChanges;
  /** @deprecated Build 6: alias de `finalTrainingChanges` (mesmos valores). */
  finalAttributeChanges: AttributeChanges;
  /** Pontos totais de treino antes/depois do multiplicador diário. */
  baseTrainingPoints: number;
  finalTrainingPoints: number;
  /** Papéis de atributo desta atividade (principal/secundário/complementar). */
  affinity: ActivityAttributeAffinity;
  calculationVersion: number;
  reason?: 'below_min_duration' | 'reduced_second' | 'no_reward_position';
}

export interface ActivityRewardInput {
  activityType: string;
  perceivedIntensity: string;
  durationMinutes: number;
}

function assertIntensity(value: string): Intensity {
  if ((INTENSITIES as readonly string[]).includes(value)) {
    return value as Intensity;
  }
  throw new Error(`Intensidade inválida: ${value}`);
}

function assertActivityType(value: string): ActivityType {
  if ((ACTIVITY_TYPES as readonly string[]).includes(value)) {
    return value as ActivityType;
  }
  throw new Error(`Tipo de atividade inválido: ${value}`);
}

/** Multiplicador de recompensa pela posição da atividade elegível no dia. */
export function getDailyRewardMultiplier(rewardEligiblePosition: number): number {
  if (rewardEligiblePosition === 1) {
    return DAILY_REWARD_MULTIPLIERS.FIRST;
  }
  if (rewardEligiblePosition === 2) {
    return DAILY_REWARD_MULTIPLIERS.SECOND;
  }
  return DAILY_REWARD_MULTIPLIERS.REST;
}

/** true quando a atividade é longa o bastante para ser elegível a recompensa. */
export function isRewardEligibleDuration(durationMinutes: number): boolean {
  return durationMinutes >= DURATION.MIN_MINUTES;
}

/** Fator de duração saturante. Usa no máximo CAP_MINUTES (duração acima é limitada). */
export function durationFactor(durationMinutes: number): number {
  const clamped = Math.max(0, Math.min(durationMinutes, DURATION.CAP_MINUTES));
  return 1 + (clamped / DURATION.CAP_MINUTES) * DURATION.MAX_BONUS;
}

/**
 * Calcula a recompensa de UMA atividade dada a sua posição entre as elegíveis do dia.
 * `rewardEligiblePosition` deve ser 1-based (1 = primeira elegível); use 0 para forçar
 * ausência de recompensa. A elegibilidade por duração é reforçada internamente.
 */
export function calculateActivityReward(
  input: ActivityRewardInput,
  rewardEligiblePosition: number,
): ActivityReward {
  const activityType = assertActivityType(input.activityType);
  const intensity = assertIntensity(input.perceivedIntensity);

  const eligibleByDuration = isRewardEligibleDuration(input.durationMinutes);
  const position = eligibleByDuration ? Math.max(0, Math.floor(rewardEligiblePosition)) : 0;
  const multiplier = getDailyRewardMultiplier(position);

  const factor = durationFactor(input.durationMinutes);
  const baseXp = Math.round(INTENSITY_XP[intensity] * factor);
  // v3: a energia da atividade vira um pequeno bônus de VIGOR — só a 1ª elegível do dia.
  // O Vigor é primariamente um recurso de descanso (recupera com o tempo), então a
  // atividade concede apenas um empurrão, sem virar a principal fonte de Vigor.
  const baseEnergy = VIGOR.ACTIVITY_BONUS;
  // Atributos passaram a evoluir por PONTOS DE TREINO (Build 6): a afinidade da
  // atividade reparte os pontos entre principal/secundário/complementar.
  const training = calculateActivityTraining(
    { activityType, perceivedIntensity: intensity, durationMinutes: input.durationMinutes },
    position,
  );

  const finalXp = Math.round(baseXp * multiplier);
  const finalEnergy = position === 1 ? VIGOR.ACTIVITY_BONUS : 0;

  const eligible = position >= 1;
  let reason: ActivityReward['reason'];
  if (!eligibleByDuration) {
    reason = 'below_min_duration';
  } else if (position === 2) {
    reason = 'reduced_second';
  } else if (position >= 3 || position === 0) {
    reason = 'no_reward_position';
  }

  return {
    eligible,
    rewardEligiblePosition: position,
    dailyRewardMultiplier: multiplier,
    countsTowardGoal: eligible && position === 1,
    baseXp,
    finalXp,
    baseEnergy,
    finalEnergy,
    baseTrainingChanges: training.baseTrainingChanges,
    finalTrainingChanges: training.finalTrainingChanges,
    baseAttributeChanges: training.baseTrainingChanges,
    finalAttributeChanges: training.finalTrainingChanges,
    baseTrainingPoints: training.basePoints,
    finalTrainingPoints: training.finalPoints,
    affinity: training.affinity,
    calculationVersion: CALCULATION_VERSION,
    reason,
  };
}

/** Soma total de pontos de atributo em um conjunto de mudanças. */
export function totalAttributePoints(changes: AttributeChanges): number {
  return Object.values(changes).reduce((sum, value) => sum + (value ?? 0), 0);
}
