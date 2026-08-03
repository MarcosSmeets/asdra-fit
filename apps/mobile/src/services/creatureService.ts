import {
  cumulativeStageStatBoost,
  defaultEquippedAbilityIds,
  getCreatureByKey,
  initialVigorState,
  materializeAttributes,
  EVOLUTION_CALCULATION_VERSION,
  type AdariAttributeProgress,
  type AttributeSet,
} from '@ad-sidera/shared';
import { getDatabase } from '../db/database';
import type { AdariEvolutionHistoryRecord, CreatureState } from '../db/models';
import { appStateRepository } from '../db/repositories/appStateRepository';
import { attributeStateRepository } from '../db/repositories/attributeStateRepository';
import { creatureRepository } from '../db/repositories/creatureRepository';
import { evolutionHistoryRepository } from '../db/repositories/evolutionHistoryRepository';
import { weeklyGoalRepository } from '../db/repositories/weeklyGoalRepository';
import { applyEvolution, evolutionCheckFor, nextStageFor } from '../domain/creatureAggregate';
import { nowIso } from '../utils/datetime';
import { uuidv4 } from '../utils/id';
import { enqueueOperation } from './outbox';
import { adariEvolutionSyncPayload, creatureSyncPayload } from './syncPayloads';
import { recalculateVigor } from './vigorService';

export async function getCreature(): Promise<CreatureState | null> {
  const db = await getDatabase();
  const creature = await creatureRepository.get(db);
  if (!creature) {
    return null;
  }
  // Recuperação passiva do Vigor pelo tempo decorrido (offline / app fechado).
  return recalculateVigor(db, creature);
}

export async function selectCreature(
  creatureKey: string,
  nickname?: string,
): Promise<CreatureState> {
  const db = await getDatabase();
  const existing = await creatureRepository.get(db);
  if (existing) {
    return existing;
  }
  const creature = createInitialCreatureState(creatureKey, nickname);
  const now = creature.updatedAt;
  await creatureRepository.create(db, creature, now);
  await enqueueOperation(db, {
    entityType: 'user_creature',
    entityId: creature.id,
    operationType: 'upsert',
    updatedAt: now,
    payload: creatureSyncPayload(creature),
  });
  return creature;
}

export function createInitialCreatureState(
  creatureKey: string,
  nickname?: string,
  id: string = uuidv4(),
  createdAt: string = nowIso(),
): CreatureState {
  const definition = getCreatureByKey(creatureKey);
  if (!definition) {
    throw new Error('Adari desconhecido.');
  }
  const vigor = initialVigorState(definition.baseStats.recovery, createdAt);
  // O Adari nasce com Vigor cheio (recurso de descanso), pronto para a primeira jornada.
  const attributes: AttributeSet = { ...definition.baseStats, energy: vigor.currentVigor };
  const creature: CreatureState = {
    id,
    creatureKey: definition.key,
    nickname: nickname ?? null,
    level: 1,
    xp: 0,
    evolutionStage: 0,
    evolvedAt: null,
    attributes,
    maxVigor: vigor.maxVigor,
    vigorRecoveryRate: vigor.vigorRecoveryRate,
    lastVigorCalculationAt: vigor.lastVigorCalculationAt,
    bond: 0,
    satiety: 60,
    lastSatietyCalculationAt: createdAt,
    activeBehaviorState: 'idle',
    lastInteractionAt: null,
    equippedAbilities: defaultEquippedAbilityIds(definition.key, 1),
    defeatedMilestones: [],
    totalActivities: 0,
    updatedAt: createdAt,
    syncStatus: 'pending',
  };
  return creature;
}

export interface EvolveResult {
  creature: CreatureState;
  history: AdariEvolutionHistoryRecord | null;
}

export interface EvolutionOverview {
  creature: CreatureState;
  /** Semanas com meta cumprida (insumo do requisito de constância). */
  weeksGoalMet: number;
  /** Status dos requisitos do PRÓXIMO estágio (null quando já é Perfeita). */
  check: ReturnType<typeof evolutionCheckFor>;
  available: boolean;
}

/** Insumos da Linha Evolutiva e do aviso de evolução na home. */
export async function evolutionOverview(): Promise<EvolutionOverview | null> {
  const db = await getDatabase();
  const creature = await creatureRepository.get(db);
  if (!creature) {
    return null;
  }
  const weeksGoalMet = await weeklyGoalRepository.countCompletedWeeks(db);
  const check = evolutionCheckFor(creature, weeksGoalMet);
  return { creature, weeksGoalMet, check, available: check?.available ?? false };
}

/** Progresso de treino por atributo, materializado a partir dos fatos atuais. */
export async function attributeProgressFor(creature: CreatureState): Promise<AdariAttributeProgress[]> {
  const db = await getDatabase();
  const definition = getCreatureByKey(creature.creatureKey);
  if (!definition) {
    return [];
  }
  const trainingTotals = await attributeStateRepository.trainingTotals(db, creature.id);
  return materializeAttributes({
    baseStats: definition.baseStats,
    trainingTotals,
    level: creature.level,
    stageBoost: cumulativeStageStatBoost(creature.creatureKey, creature.evolutionStage),
  }).progress;
}

const CEREMONY_SEEN_KEY = 'evolution-ceremony-seen';

/** A cerimônia é pulável somente após a primeira visualização completa. */
export async function wasEvolutionCeremonySeen(): Promise<boolean> {
  const db = await getDatabase();
  return appStateRepository.getBool(db, CEREMONY_SEEN_KEY);
}

export async function markEvolutionCeremonySeen(): Promise<void> {
  const db = await getDatabase();
  await appStateRepository.setBool(db, CEREMONY_SEEN_KEY, true);
}

/**
 * Evolui UM estágio (local-first, offline-safe). Persiste criatura + histórico
 * ANTES de qualquer animação, enfileira a operação idempotente
 * `adari_evolution` (validada no servidor) e o upsert de stats da criatura.
 * Duplicações são bloqueadas pelo estágio atual e pelo UNIQUE do histórico.
 */
export async function evolveCreature(
  triggeringReason = 'requirements_met',
): Promise<EvolveResult | null> {
  const db = await getDatabase();
  const creature = await creatureRepository.get(db);
  if (!creature) {
    return null;
  }
  const next = nextStageFor(creature);
  if (!next) {
    return { creature, history: null };
  }
  const evolved = applyEvolution(creature, nowIso());
  if (evolved.evolutionStage === creature.evolutionStage) {
    return { creature, history: null };
  }

  const history: AdariEvolutionHistoryRecord = {
    id: uuidv4(),
    userAdariId: evolved.id,
    fromStage: creature.evolutionStage,
    toStage: evolved.evolutionStage,
    unlockedAt: evolved.updatedAt,
    triggeringReason,
    calculationVersion: EVOLUTION_CALCULATION_VERSION,
    createdAt: evolved.updatedAt,
    syncStatus: 'pending',
  };

  await creatureRepository.update(db, evolved);
  await evolutionHistoryRepository.insert(db, history);
  await enqueueOperation(db, {
    entityType: 'adari_evolution',
    entityId: history.id,
    operationType: 'upsert',
    updatedAt: history.unlockedAt,
    payload: adariEvolutionSyncPayload(history),
  });
  await enqueueOperation(db, {
    entityType: 'user_creature',
    entityId: evolved.id,
    operationType: 'upsert',
    updatedAt: evolved.updatedAt,
    payload: creatureSyncPayload(evolved),
  });
  return { creature: evolved, history };
}
