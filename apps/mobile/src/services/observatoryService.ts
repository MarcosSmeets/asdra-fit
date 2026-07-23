import {
  applyFood,
  calculateBondReward,
  FOOD_DEFINITIONS,
  getFoodDefinition,
  recalculateSatiety,
} from '@ad-sidera/shared';
import { getDatabase } from '../db/database';
import type {
  AdariInteractionRecord,
  CreatureState,
  FoodInventoryItem,
  ObservatoryStateRecord,
} from '../db/models';
import { creatureRepository } from '../db/repositories/creatureRepository';
import { observatoryRepository } from '../db/repositories/observatoryRepository';
import { profileRepository } from '../db/repositories/profileRepository';
import { nearestWalkable } from '../features/observatory/geometry';
import { INTERACTIVE_OBJECTS, OBSERVATORY_WORLD } from '../features/observatory/world';
import { dayKey, nowIso } from '../utils/datetime';
import { uuidv4 } from '../utils/id';
import { enqueueOperation } from './outbox';
import { adariInteractionSyncPayload, observatoryStateSyncPayload } from './syncPayloads';

const OBSERVATORY_STATE_ID = 'observatory-local-state';
const CARE_CALCULATION_VERSION = 1;

export interface ObservatorySnapshot {
  creature: CreatureState;
  inventory: FoodInventoryItem[];
  state: ObservatoryStateRecord;
}

function defaultState(now: string): ObservatoryStateRecord {
  return {
    id: OBSERVATORY_STATE_ID,
    selectedControlMode: 'tap',
    lastSafePlayerPosition: { ...OBSERVATORY_WORLD.startPosition },
    unlockedObjects: INTERACTIVE_OBJECTS.map((object) => object.id),
    seenDialogueKeys: [],
    tutorialCompleted: false,
    reduceMotion: false,
    particlesEnabled: true,
    movementSpeed: 1,
    qualityMode: 'automatic',
    musicEnabled: false,
    effectsEnabled: true,
    hapticsEnabled: true,
    updatedAt: now,
  };
}

async function ensureStateAndStarterFood(now: string): Promise<ObservatoryStateRecord> {
  const db = await getDatabase();
  const existing = await observatoryRepository.state(db);
  if (existing) return existing;
  const state = defaultState(now);
  await db.withTransactionAsync(async () => {
    await observatoryRepository.saveState(db, state);
    for (const food of FOOD_DEFINITIONS) {
      await observatoryRepository.addFood(db, food.id, 1, now);
    }
  });
  return state;
}

export async function loadObservatory(): Promise<ObservatorySnapshot> {
  const db = await getDatabase();
  const now = nowIso();
  const creature = await creatureRepository.get(db);
  if (!creature) throw new Error('Selecione um Adari antes de entrar no Observatório.');
  const satiety = recalculateSatiety(
    { satiety: creature.satiety, lastSatietyCalculationAt: creature.lastSatietyCalculationAt },
    now,
  );
  const hydrated: CreatureState = {
    ...creature,
    satiety: satiety.satiety,
    lastSatietyCalculationAt: satiety.lastSatietyCalculationAt,
  };
  if (satiety.decayed > 0) await creatureRepository.updateCare(db, hydrated);
  const state = await ensureStateAndStarterFood(now);
  const inventory = await observatoryRepository.inventory(db);
  return { creature: hydrated, inventory, state };
}

async function interactionContext(
  creature: CreatureState,
  type: AdariInteractionRecord['interactionType'],
  occurredAt: string,
) {
  const db = await getDatabase();
  const profile = await profileRepository.get(db);
  const timezone = profile?.timezone ?? 'UTC';
  const localDate = dayKey(occurredAt, timezone);
  const [all, sameType] = await Promise.all([
    observatoryRepository.dayAggregate(db, creature.id, localDate),
    observatoryRepository.dayAggregate(db, creature.id, localDate, type),
  ]);
  return { db, timezone, localDate, all, sameType };
}

function makeInteraction(params: {
  clientGeneratedId: string;
  creature: CreatureState;
  type: AdariInteractionRecord['interactionType'];
  foodDefinitionId?: string;
  bondGranted: number;
  satietyGranted?: number;
  occurredAt: string;
  localDate: string;
  timezone: string;
}): AdariInteractionRecord {
  return {
    id: uuidv4(),
    clientGeneratedId: params.clientGeneratedId,
    userAdariId: params.creature.id,
    interactionType: params.type,
    foodDefinitionId: params.foodDefinitionId ?? null,
    bondGranted: params.bondGranted,
    satietyGranted: params.satietyGranted ?? 0,
    occurredAt: params.occurredAt,
    localDate: params.localDate,
    timezone: params.timezone,
    calculationVersion: CARE_CALCULATION_VERSION,
    createdAt: params.occurredAt,
    syncStatus: 'pending',
  };
}

export async function petAdari(
  clientGeneratedId: string = uuidv4(),
  occurredAt: string = nowIso(),
): Promise<{ creature: CreatureState; interaction: AdariInteractionRecord; duplicate: boolean }> {
  const db = await getDatabase();
  const duplicate = await observatoryRepository.interactionByClientId(db, clientGeneratedId);
  const creature = await creatureRepository.get(db);
  if (!creature) throw new Error('Adari indisponível.');
  if (duplicate) return { creature, interaction: duplicate, duplicate: true };
  const context = await interactionContext(creature, 'pet', occurredAt);
  const reward = calculateBondReward({
    interactionType: 'pet',
    currentBond: creature.bond,
    commonGrantedToday: context.all.bondGranted,
    sameTypeCountToday: context.sameType.count,
  });
  const interaction = makeInteraction({
    clientGeneratedId,
    creature,
    type: 'pet',
    bondGranted: reward.granted,
    occurredAt,
    localDate: context.localDate,
    timezone: context.timezone,
  });
  const next: CreatureState = {
    ...creature,
    bond: reward.nextBond,
    activeBehaviorState: 'receivingAffection',
    lastInteractionAt: occurredAt,
  };
  await context.db.withTransactionAsync(async () => {
    await observatoryRepository.insertInteraction(context.db, interaction);
    await creatureRepository.updateCare(context.db, next);
    await enqueueOperation(context.db, {
      entityType: 'adari_interaction',
      entityId: interaction.id,
      operationType: 'upsert',
      updatedAt: occurredAt,
      payload: adariInteractionSyncPayload(interaction),
    });
  });
  return { creature: next, interaction, duplicate: false };
}

export async function feedAdari(
  foodDefinitionId: string,
  clientGeneratedId: string = uuidv4(),
  occurredAt: string = nowIso(),
): Promise<{
  creature: CreatureState;
  interaction: AdariInteractionRecord | null;
  accepted: boolean;
  favorite: boolean;
  duplicate: boolean;
}> {
  const db = await getDatabase();
  const duplicate = await observatoryRepository.interactionByClientId(db, clientGeneratedId);
  const creature = await creatureRepository.get(db);
  if (!creature) throw new Error('Adari indisponível.');
  if (duplicate) {
    return { creature, interaction: duplicate, accepted: true, favorite: false, duplicate: true };
  }
  const food = getFoodDefinition(foodDefinitionId);
  if (!food) throw new Error('Alimento desconhecido.');
  const quantity = await observatoryRepository.inventoryQuantity(db, food.id);
  if (quantity <= 0) throw new Error('Este alimento não está disponível no inventário.');
  const satiety = recalculateSatiety(
    { satiety: creature.satiety, lastSatietyCalculationAt: creature.lastSatietyCalculationAt },
    occurredAt,
  );
  const feeding = applyFood(satiety.satiety, food, creature.creatureKey);
  if (!feeding.accepted) {
    return { creature: { ...creature, satiety: satiety.satiety }, interaction: null, accepted: false, favorite: feeding.favorite, duplicate: false };
  }
  const context = await interactionContext(creature, 'feed', occurredAt);
  const reward = calculateBondReward({
    interactionType: 'feed',
    currentBond: creature.bond,
    commonGrantedToday: context.all.bondGranted,
    sameTypeCountToday: context.sameType.count,
    favoriteFood: feeding.favorite,
  });
  const interaction = makeInteraction({
    clientGeneratedId,
    creature,
    type: 'feed',
    foodDefinitionId: food.id,
    bondGranted: reward.granted,
    satietyGranted: feeding.satietyGranted,
    occurredAt,
    localDate: context.localDate,
    timezone: context.timezone,
  });
  const next: CreatureState = {
    ...creature,
    bond: reward.nextBond,
    satiety: feeding.nextSatiety,
    lastSatietyCalculationAt: occurredAt,
    activeBehaviorState: 'eating',
    lastInteractionAt: occurredAt,
  };
  await context.db.withTransactionAsync(async () => {
    const consumed = await observatoryRepository.consumeFood(context.db, food.id, occurredAt);
    if (!consumed) throw new Error('Alimento indisponível.');
    await observatoryRepository.insertInteraction(context.db, interaction);
    await creatureRepository.updateCare(context.db, next);
    await enqueueOperation(context.db, {
      entityType: 'adari_interaction',
      entityId: interaction.id,
      operationType: 'upsert',
      updatedAt: occurredAt,
      payload: adariInteractionSyncPayload(interaction),
    });
  });
  return { creature: next, interaction, accepted: true, favorite: feeding.favorite, duplicate: false };
}

export async function saveObservatoryState(
  patch: Partial<Omit<ObservatoryStateRecord, 'id' | 'updatedAt'>>,
): Promise<ObservatoryStateRecord> {
  const db = await getDatabase();
  const now = nowIso();
  const current = (await observatoryRepository.state(db)) ?? defaultState(now);
  const next: ObservatoryStateRecord = {
    ...current,
    ...patch,
    lastSafePlayerPosition: patch.lastSafePlayerPosition
      ? nearestWalkable(patch.lastSafePlayerPosition)
      : current.lastSafePlayerPosition,
    updatedAt: now,
  };
  await observatoryRepository.saveState(db, next);
  await enqueueOperation(db, {
    entityType: 'observatory_state',
    entityId: uuidv4(),
    operationType: 'upsert',
    updatedAt: now,
    payload: observatoryStateSyncPayload(next),
  });
  return next;
}

/** Posição é apenas local: nunca cria operação de sincronização. */
export async function saveSafePlayerPosition(position: { x: number; y: number }): Promise<void> {
  const db = await getDatabase();
  const now = nowIso();
  const current = (await observatoryRepository.state(db)) ?? defaultState(now);
  await observatoryRepository.saveState(db, {
    ...current,
    lastSafePlayerPosition: nearestWalkable(position),
    updatedAt: now,
  });
}

/**
 * Conecta uma atividade já validada ao cuidado: a primeira válida do dia concede
 * Vínculo e um alimento. A chave derivada da atividade torna o caso idempotente.
 */
export async function rewardObservatoryFromActivity(
  activityId: string,
  occurredAt: string,
  countsTowardGoal: boolean,
  completedWeekKey?: string,
): Promise<void> {
  if (!countsTowardGoal) return;
  const db = await getDatabase();
  const creature = await creatureRepository.get(db);
  if (!creature) return;
  const context = await interactionContext(creature, 'activity', occurredAt);
  const clientGeneratedId = `activity-care:${activityId}`;
  if (await observatoryRepository.interactionByClientId(db, clientGeneratedId)) return;
  const reward = calculateBondReward({
    interactionType: 'activity',
    currentBond: creature.bond,
    commonGrantedToday: context.all.bondGranted,
    sameTypeCountToday: context.sameType.count,
  });
  const interaction = makeInteraction({
    clientGeneratedId,
    creature,
    type: 'activity',
    bondGranted: reward.granted,
    occurredAt,
    localDate: context.localDate,
    timezone: context.timezone,
  });
  const food = FOOD_DEFINITIONS[
    [...context.localDate].reduce((sum, char) => sum + char.charCodeAt(0), 0) % FOOD_DEFINITIONS.length
  ]!;
  const next = { ...creature, bond: reward.nextBond, lastInteractionAt: occurredAt };
  await db.withTransactionAsync(async () => {
    await observatoryRepository.insertInteraction(db, interaction);
    await observatoryRepository.addFood(db, food.id, 1, occurredAt);
    await creatureRepository.updateCare(db, next);
    await enqueueOperation(db, {
      entityType: 'adari_interaction',
      entityId: interaction.id,
      operationType: 'upsert',
      updatedAt: occurredAt,
      payload: adariInteractionSyncPayload(interaction),
    });
  });

  if (completedWeekKey) {
    await rewardWeeklyGoal(completedWeekKey, occurredAt);
  }
}

async function rewardWeeklyGoal(weekKey: string, occurredAt: string): Promise<void> {
  const db = await getDatabase();
  const creature = await creatureRepository.get(db);
  if (!creature) return;
  const clientGeneratedId = `weekly-goal-care:${weekKey}`;
  if (await observatoryRepository.interactionByClientId(db, clientGeneratedId)) return;
  const context = await interactionContext(creature, 'weekly_goal', occurredAt);
  const reward = calculateBondReward({
    interactionType: 'weekly_goal',
    currentBond: creature.bond,
    commonGrantedToday: context.all.bondGranted,
    sameTypeCountToday: context.sameType.count,
  });
  const interaction = makeInteraction({
    clientGeneratedId,
    creature,
    type: 'weekly_goal',
    bondGranted: reward.granted,
    occurredAt,
    localDate: context.localDate,
    timezone: context.timezone,
  });
  const next = { ...creature, bond: reward.nextBond, lastInteractionAt: occurredAt };
  await db.withTransactionAsync(async () => {
    await observatoryRepository.insertInteraction(db, interaction);
    await observatoryRepository.addFood(db, 'food-celestial-nectar', 1, occurredAt);
    await creatureRepository.updateCare(db, next);
    await enqueueOperation(db, {
      entityType: 'adari_interaction',
      entityId: interaction.id,
      operationType: 'upsert',
      updatedAt: occurredAt,
      payload: adariInteractionSyncPayload(interaction),
    });
  });
}
