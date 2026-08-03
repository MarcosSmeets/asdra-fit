import { CALCULATION_VERSION } from '@ad-sidera/config';
import {
  calculateActivityReward,
  DURATION,
  isRewardEligibleDuration,
  zeroReward,
  type ActivityReward,
  type AdariAttributeProgress,
  type AttributeSet,
} from '@ad-sidera/shared';
import { getDatabase } from '../db/database';
import type { ActivityRecord, WeeklyProgressRecord } from '../db/models';
import { activityRepository } from '../db/repositories/activityRepository';
import { profileRepository } from '../db/repositories/profileRepository';
import { creatureRepository } from '../db/repositories/creatureRepository';
import type { SqlDatabase } from '../db/types';
import { dayBounds, nowIso } from '../utils/datetime';
import { uuidv4 } from '../utils/id';
import { track } from './analyticsService';
import { enqueueOperation } from './outbox';
import { deletePrivatePhoto } from './photoService';
import { recalcDay } from './rewardRecalcService';
import { activitySyncPayload } from './syncPayloads';
import { rewardObservatoryFromActivity } from './observatoryService';

export interface RegisterActivityInput {
  activityType: string;
  perceivedIntensity: string;
  durationMinutes: number;
  occurredAt: string;
  notes?: string;
  location?: string;
  moodBefore?: string;
  moodAfter?: string;
  /** Caminho da foto JÁ armazenada no diretório privado (opcional). */
  localPhotoUri?: string;
  /** Sinal de movimento coletado pela tela — informativo, nunca afeta recompensa. */
  movementSteps?: number | null;
  movementSignal?: ActivityRecord['movementSignal'];
}

export interface RegisterActivityResult {
  activity: ActivityRecord;
  /** Recompensa efetiva desta atividade (após aplicar a posição diária). */
  reward: ActivityReward;
  leveledUp: boolean;
  evolutionAvailable: boolean;
  weeklyProgress: WeeklyProgressRecord | null;
  /** Progresso de treino por atributo depois desta atividade. */
  attributeProgress: AdariAttributeProgress[];
  /** Atributos e nível antes/depois — a celebração de nível usa isto. */
  previousAttributes: AttributeSet | null;
  newAttributes: AttributeSet | null;
  previousLevel: number | null;
  newLevel: number | null;
}

async function timezoneOf(db: SqlDatabase): Promise<string> {
  const profile = await profileRepository.get(db);
  return profile?.timezone ?? 'UTC';
}

/**
 * Prévia da recompensa ANTES de salvar: calcula a posição que a nova atividade
 * ocuparia no dia (nº de elegíveis existentes + 1) e a recompensa correspondente.
 */
export async function previewReward(
  input: { activityType: string; perceivedIntensity: string; durationMinutes: number },
  occurredAtIso: string,
): Promise<ActivityReward> {
  const db = await getDatabase();
  const tz = await timezoneOf(db);
  const { start, end } = dayBounds(occurredAtIso, tz);
  const eligibleCount = await activityRepository.countEligibleOnDay(
    db,
    start,
    end,
    DURATION.MIN_MINUTES,
  );
  const position = isRewardEligibleDuration(input.durationMinutes) ? eligibleCount + 1 : 0;
  return calculateActivityReward(input, position);
}

export async function registerActivity(
  input: RegisterActivityInput,
): Promise<RegisterActivityResult> {
  const db = await getDatabase();
  const creature = await creatureRepository.get(db);
  if (!creature) {
    throw new Error('Selecione um Adari antes de registrar atividades.');
  }
  const tz = await timezoneOf(db);
  const now = nowIso();
  const id = uuidv4();

  const activity: ActivityRecord = {
    id,
    clientGeneratedId: id,
    activityType: input.activityType as ActivityRecord['activityType'],
    occurredAt: input.occurredAt,
    durationMinutes: input.durationMinutes,
    perceivedIntensity: input.perceivedIntensity as ActivityRecord['perceivedIntensity'],
    notes: input.notes ?? null,
    location: input.location ?? null,
    moodBefore: (input.moodBefore ?? null) as ActivityRecord['moodBefore'],
    moodAfter: (input.moodAfter ?? null) as ActivityRecord['moodAfter'],
    hasLocalPhoto: Boolean(input.localPhotoUri),
    localPhotoUri: input.localPhotoUri ?? null,
    movementSteps: input.movementSteps ?? null,
    movementSignal: input.movementSignal ?? null,
    isScored: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: 'pending',
  };

  const result: { recalc?: Awaited<ReturnType<typeof recalcDay>> } = {};
  await db.withTransactionAsync(async () => {
    await activityRepository.insert(db, activity);
    await enqueueOperation(db, {
      entityType: 'activity', entityId: id, operationType: 'upsert', updatedAt: now,
      payload: activitySyncPayload(activity),
    });
    result.recalc = await recalcDay(input.occurredAt, tz, { db, withinTransaction: true });
  });
  const recalc = result.recalc;
  if (!recalc) throw new Error('Não foi possível consolidar a recompensa da atividade.');
  void track('activity_registered', { activityType: input.activityType });
  const reward = recalc.rewardByActivityId.get(id) ?? zeroReward(id, CALCULATION_VERSION);
  await rewardObservatoryFromActivity(
    id,
    input.occurredAt,
    reward.countsTowardGoal,
    recalc.weeklyProgress?.completed ? recalc.weeklyProgress.weekKey : undefined,
  );

  return {
    activity,
    reward,
    leveledUp: recalc.leveledUp,
    evolutionAvailable: recalc.evolutionAvailable,
    weeklyProgress: recalc.weeklyProgress,
    attributeProgress: recalc.attributeProgress,
    previousAttributes: recalc.previousAttributes,
    newAttributes: recalc.creature?.attributes ?? null,
    previousLevel: recalc.previousLevel,
    newLevel: recalc.creature?.level ?? null,
  };
}

export async function listActivities(limit = 50, offset = 0): Promise<ActivityRecord[]> {
  const db = await getDatabase();
  return activityRepository.list(db, limit, offset);
}

export async function getActivity(id: string): Promise<ActivityRecord | null> {
  const db = await getDatabase();
  return activityRepository.get(db, id);
}

/** Recompensas resumidas (badges) para uma lista de atividades. */
export async function getRewardSummaries(activityIds: readonly string[]) {
  const db = await getDatabase();
  return activityRepository.getRewardsForActivities(db, activityIds);
}

export async function updateActivity(
  id: string,
  patch: Partial<RegisterActivityInput>,
): Promise<void> {
  const db = await getDatabase();
  const current = await activityRepository.get(db, id);
  if (!current) {
    throw new Error('Atividade não encontrada.');
  }
  const tz = await timezoneOf(db);
  const now = nowIso();
  const updated: ActivityRecord = {
    ...current,
    activityType: (patch.activityType ?? current.activityType) as ActivityRecord['activityType'],
    perceivedIntensity: (patch.perceivedIntensity ??
      current.perceivedIntensity) as ActivityRecord['perceivedIntensity'],
    durationMinutes: patch.durationMinutes ?? current.durationMinutes,
    occurredAt: patch.occurredAt ?? current.occurredAt,
    notes: patch.notes ?? current.notes,
    location: patch.location ?? current.location,
    moodBefore: (patch.moodBefore ?? current.moodBefore) as ActivityRecord['moodBefore'],
    moodAfter: (patch.moodAfter ?? current.moodAfter) as ActivityRecord['moodAfter'],
    updatedAt: now,
    syncStatus: 'pending',
  };
  await db.withTransactionAsync(async () => {
    await activityRepository.update(db, updated);
    await enqueueOperation(db, {
      entityType: 'activity', entityId: id, operationType: 'upsert', updatedAt: now,
      payload: activitySyncPayload(updated),
    });
    await recalcDay(current.occurredAt, tz, { db, withinTransaction: true });
    if (updated.occurredAt !== current.occurredAt) {
      await recalcDay(updated.occurredAt, tz, { db, withinTransaction: true });
    }
  });
}

export async function deleteActivity(id: string, removePhoto = true): Promise<void> {
  const db = await getDatabase();
  const current = await activityRepository.get(db, id);
  if (!current) {
    return;
  }
  const tz = await timezoneOf(db);
  const now = nowIso();

  await db.withTransactionAsync(async () => {
    await activityRepository.softDelete(db, id, now);
    await enqueueOperation(db, {
      entityType: 'activity', entityId: id, operationType: 'delete', updatedAt: now, payload: null,
    });
    await recalcDay(current.occurredAt, tz, { db, withinTransaction: true });
  });
  if (removePhoto) await deletePrivatePhoto(current.localPhotoUri);
}
