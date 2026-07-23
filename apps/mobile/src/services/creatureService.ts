import {
  defaultEquippedAbilityIds,
  getCreatureByKey,
  initialVigorState,
  type AttributeSet,
} from '@ad-sidera/shared';
import { getDatabase } from '../db/database';
import type { CreatureState } from '../db/models';
import { creatureRepository } from '../db/repositories/creatureRepository';
import { applyEvolution } from '../domain/creatureAggregate';
import { nowIso } from '../utils/datetime';
import { uuidv4 } from '../utils/id';
import { enqueueOperation } from './outbox';
import { creatureSyncPayload } from './syncPayloads';
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

export async function evolveCreature(): Promise<CreatureState | null> {
  const db = await getDatabase();
  const creature = await creatureRepository.get(db);
  if (!creature || creature.evolutionStage !== 0) {
    return creature;
  }
  const evolved = applyEvolution(creature, nowIso());
  await creatureRepository.update(db, evolved);
  await enqueueOperation(db, {
    entityType: 'user_creature',
    entityId: evolved.id,
    operationType: 'upsert',
    updatedAt: evolved.updatedAt,
    payload: creatureSyncPayload(evolved),
  });
  return evolved;
}
