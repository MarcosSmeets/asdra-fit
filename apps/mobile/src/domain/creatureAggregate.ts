import {
  addTrainingTotals,
  ATTRIBUTE_TRAINING,
  checkEvolution,
  cumulativeStageStatBoost,
  getCreatureByKey,
  getNextStageDefinition,
  levelFromTotalXp,
  materializeAttributes,
  stageFromInt,
  stageToInt,
  REWARD_CAPS,
  type AdariAttributeProgress,
  type AdariStageDefinition,
  type AttributeChanges,
  type AttributeKey,
  type AttributeSet,
  type EvolutionCheck,
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
  /** Delta de PONTOS DE TREINO por atributo (Build 6), não de valor final. */
  attributeDeltas: AttributeChanges;
  /** Total de atividades não-excluídas (recomputado, absoluto). */
  totalActivities: number;
}

export interface AppliedReward {
  creature: CreatureState;
  /** Totais de treino após o delta (persistir em adari_attribute_state). */
  trainingTotals: AttributeChanges;
  progress: AdariAttributeProgress[];
}

/**
 * Aplica um delta de recompensa ao agregado da criatura (função PURA).
 *
 * Build 6: os atributos deixaram de ser incrementados no lugar. O delta soma nos
 * PONTOS DE TREINO e o valor final é MATERIALIZADO a partir dos fatos
 * (base + estágio + nível + ⌊treino ÷ 100⌋). Recalcular o mesmo dia duas vezes
 * dá exatamente o mesmo resultado — impossível conceder em dobro, e excluir uma
 * atividade devolve o progresso sem deixar o atributo inflado.
 */
export function applyRewardDeltas(
  creature: CreatureState,
  currentTrainingTotals: AttributeChanges,
  delta: RewardDelta,
  nowIso: string,
): AppliedReward {
  const xp = Math.max(0, creature.xp + delta.xpDelta);
  const level = levelFromTotalXp(xp).level;
  const definition = getCreatureByKey(creature.creatureKey);
  const trainingTotals = addTrainingTotals(currentTrainingTotals, delta.attributeDeltas);

  const materialized = definition
    ? materializeAttributes({
        baseStats: definition.baseStats,
        trainingTotals,
        level,
        stageBoost: cumulativeStageStatBoost(creature.creatureKey, creature.evolutionStage),
      })
    : { values: creature.attributes, progress: [] as AdariAttributeProgress[] };

  const attributes: AttributeSet = { ...materialized.values };
  // Vigor não é atributo treinável: segue o próprio ciclo de descanso.
  attributes.energy = Math.max(
    0,
    Math.min(REWARD_CAPS.MAX_ENERGY, creature.attributes.energy + delta.energyDelta),
  );

  return {
    creature: {
      ...creature,
      xp,
      level,
      attributes,
      totalActivities: Math.max(0, delta.totalActivities),
      updatedAt: nowIso,
      syncStatus: 'pending',
    },
    trainingTotals,
    progress: materialized.progress,
  };
}

/**
 * Ganhos de atributo concedidos ao passar de `fromLevel` para `toLevel`.
 * Derivado do nível, então é impossível conceder duas vezes: o valor do atributo
 * já contém `(nível − 1)` — este registro existe só para a celebração/histórico.
 */
export function levelUpAttributeGains(fromLevel: number, toLevel: number): AttributeChanges {
  const levels = Math.max(0, Math.floor(toLevel) - Math.floor(fromLevel));
  if (levels === 0) {
    return {};
  }
  const gains: AttributeChanges = {};
  for (const key of ATTRIBUTE_KEYS) {
    gains[key] = levels * ATTRIBUTE_TRAINING.LEVEL_UP_GAIN;
  }
  return gains;
}

/** Próximo estágio da linha do Adari (undefined quando já é PERFECT). */
export function nextStageFor(creature: CreatureState): AdariStageDefinition | undefined {
  return getNextStageDefinition(creature.creatureKey, stageFromInt(creature.evolutionStage));
}

/** Status detalhado dos requisitos do PRÓXIMO estágio (para a Linha Evolutiva). */
export function evolutionCheckFor(
  creature: CreatureState,
  weeksGoalMet: number,
): EvolutionCheck | null {
  const next = nextStageFor(creature);
  if (!next?.requirements) {
    return null;
  }
  return checkEvolution(
    {
      level: creature.level,
      weeksGoalMet,
      totalActivities: creature.totalActivities,
      bond: creature.bond,
      attributes: creature.attributes,
      defeatedMilestones: creature.defeatedMilestones,
    },
    next.requirements,
  );
}

/** A evolução para o próximo estágio está disponível agora? */
export function isEvolutionAvailableFor(
  creature: CreatureState,
  weeksGoalMet: number,
): boolean {
  return evolutionCheckFor(creature, weeksGoalMet)?.available ?? false;
}

/**
 * Evolução permanente: avança UM estágio e aplica o reforço definido no
 * conteúdo do estágio de destino. Idempotente por estágio (nunca pula,
 * nunca regride, nunca duplica).
 */
export function applyEvolution(creature: CreatureState, nowIso: string): CreatureState {
  const definition = getCreatureByKey(creature.creatureKey);
  const next = nextStageFor(creature);
  if (!definition || !next) {
    return creature;
  }
  const attributes: AttributeSet = { ...creature.attributes };
  for (const [key, boost] of Object.entries(next.statBoost) as [AttributeKey, number][]) {
    if (boost && key !== 'energy') {
      attributes[key] = attributes[key] + boost;
    }
  }

  return {
    ...creature,
    evolutionStage: stageToInt(next.stage),
    attributes,
    evolvedAt: nowIso,
    updatedAt: nowIso,
    syncStatus: 'pending',
  };
}
