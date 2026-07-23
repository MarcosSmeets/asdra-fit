import { CALCULATION_VERSION } from '@ad-sidera/config';
import {
  ACTIVITY_AFFINITY,
  DAILY_REWARD_MULTIPLIERS,
  DURATION,
  INTENSITY_XP,
  VIGOR,
} from './constants';
import { ACTIVITY_TYPES, INTENSITIES, type ActivityType, type Intensity } from './enums';
import type { AttributeChanges, AttributeKey } from './types';

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
  baseAttributeChanges: AttributeChanges;
  finalAttributeChanges: AttributeChanges;
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

function baseAttributeDeltas(affinity: AttributeKey, intensity: Intensity): AttributeChanges {
  const primary = intensity === 'intensa' ? 2 : 1;
  const changes: AttributeChanges = {};
  changes[affinity] = (changes[affinity] ?? 0) + primary;
  changes.discipline = (changes.discipline ?? 0) + 1;
  if (intensity === 'intensa') {
    changes.spirit = (changes.spirit ?? 0) + 1;
  }
  return changes;
}

function scaleAttributes(base: AttributeChanges, multiplier: number): AttributeChanges {
  const out: AttributeChanges = {};
  for (const key of Object.keys(base) as AttributeKey[]) {
    const scaled = Math.round((base[key] ?? 0) * multiplier);
    if (scaled > 0) {
      out[key] = scaled;
    }
  }
  return out;
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
  const baseAttributeChanges = baseAttributeDeltas(ACTIVITY_AFFINITY[activityType], intensity);

  const finalXp = Math.round(baseXp * multiplier);
  const finalEnergy = position === 1 ? VIGOR.ACTIVITY_BONUS : 0;
  const finalAttributeChanges = scaleAttributes(baseAttributeChanges, multiplier);

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
    baseAttributeChanges,
    finalAttributeChanges,
    calculationVersion: CALCULATION_VERSION,
    reason,
  };
}

/** Soma total de pontos de atributo em um conjunto de mudanças. */
export function totalAttributePoints(changes: AttributeChanges): number {
  return Object.values(changes).reduce((sum, value) => sum + (value ?? 0), 0);
}
