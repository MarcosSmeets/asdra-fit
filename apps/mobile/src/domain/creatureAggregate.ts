import {
  checkEvolution,
  getCreatureByKey,
  levelFromTotalXp,
  REWARD_CAPS,
  type AttributeChanges,
  type AttributeKey,
  type AttributeSet,
} from '@ad-sidera/shared';
import type { CreatureState } from '../db/models';

export const ATTRIBUTE_KEYS: AttributeKey[] = [
  'strength',
  'endurance',
  'agility',
  'discipline',
  'recovery',
  'spirit',
];

/** Delta agregado a aplicar na criatura após um recálculo de dia. */
export interface RewardDelta {
  xpDelta: number;
  energyDelta: number;
  attributeDeltas: AttributeChanges;
  /** Total de atividades não-excluídas (recomputado, absoluto). */
  totalActivities: number;
}

/**
 * Aplica um delta de recompensa ao agregado da criatura (função PURA).
 * XP/energia/atributos podem SUBIR ou DESCER (ex.: exclusão promove outra atividade),
 * sempre com clamp: XP ≥ 0, energia em [0, MAX], atributos ≥ 0. Nível derivado do XP.
 */
export function applyRewardDeltas(
  creature: CreatureState,
  delta: RewardDelta,
  nowIso: string,
): CreatureState {
  const xp = Math.max(0, creature.xp + delta.xpDelta);
  const level = levelFromTotalXp(xp).level;

  const attributes: AttributeSet = { ...creature.attributes };
  for (const key of ATTRIBUTE_KEYS) {
    const d = delta.attributeDeltas[key];
    if (d) {
      attributes[key] = Math.max(0, attributes[key] + d);
    }
  }
  attributes.energy = Math.max(
    0,
    Math.min(REWARD_CAPS.MAX_ENERGY, creature.attributes.energy + delta.energyDelta),
  );

  return {
    ...creature,
    xp,
    level,
    attributes,
    totalActivities: Math.max(0, delta.totalActivities),
    updatedAt: nowIso,
    syncStatus: 'pending',
  };
}

/** A evolução ficou disponível agora (criatura ainda no estágio base)? */
export function isEvolutionAvailableFor(
  creature: CreatureState,
  weeksGoalMet: number,
): boolean {
  const definition = getCreatureByKey(creature.creatureKey);
  if (!definition || creature.evolutionStage !== 0) {
    return false;
  }
  return checkEvolution(
    {
      level: creature.level,
      weeksGoalMet,
      totalActivities: creature.totalActivities,
      attributes: creature.attributes,
      defeatedMilestones: creature.defeatedMilestones,
    },
    definition.evolution.requirements,
  ).available;
}

/** Evolução permanente: avança o estágio e concede reforço permanente. */
export function applyEvolution(creature: CreatureState, nowIso: string): CreatureState {
  const definition = getCreatureByKey(creature.creatureKey);
  if (!definition || creature.evolutionStage !== 0) {
    return creature;
  }
  const affinity = definition.affinity;
  const attributes: AttributeSet = { ...creature.attributes };
  if (affinity !== 'health' && affinity !== 'energy') {
    attributes[affinity] = attributes[affinity] + 10;
  }
  attributes.health = attributes.health + 30;

  return {
    ...creature,
    evolutionStage: 1,
    attributes,
    updatedAt: nowIso,
    syncStatus: 'pending',
  };
}
