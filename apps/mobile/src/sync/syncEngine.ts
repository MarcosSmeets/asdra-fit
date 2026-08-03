import { pullSync, pushSync } from '../api/sync';
import { getDatabase } from '../db/database';
import { appStateRepository, APP_STATE_KEYS } from '../db/repositories/appStateRepository';
import { syncOutboxRepository } from '../db/repositories/syncOutboxRepository';
import { creatureRepository } from '../db/repositories/creatureRepository';
import { observatoryRepository } from '../db/repositories/observatoryRepository';
import type { AdariInteractionRecord } from '../db/models';
import type {
  ActivityRecord,
  CreatureState,
  ProfileRecord,
  WeeklyGoalRecord,
  WeeklyProgressRecord,
} from '../db/models';
import { evolutionHistoryRepository } from '../db/repositories/evolutionHistoryRepository';
import { profileRepository } from '../db/repositories/profileRepository';
import { weeklyGoalRepository } from '../db/repositories/weeklyGoalRepository';
import { weeklyProgressRepository } from '../db/repositories/weeklyProgressRepository';
import { activityRepository } from '../db/repositories/activityRepository';
import type { SyncServerChange } from '@ad-sidera/shared';
import { normalizePlayerAvatarAppearance } from '@ad-sidera/shared';
import { uuidv4 } from '../utils/id';
import { reconcileFlush } from './reconcile';

async function ensureDeviceId(): Promise<string> {
  const db = await getDatabase();
  const existing = await appStateRepository.get(db, APP_STATE_KEYS.DEVICE_ID);
  if (existing) {
    return existing;
  }
  const id = uuidv4();
  await appStateRepository.set(db, APP_STATE_KEYS.DEVICE_ID, id);
  return id;
}

export interface FlushResult {
  pushed: number;
  failed: number;
  conflicts: number;
}

export interface SyncSnapshot {
  state: 'local' | 'pending' | 'syncing' | 'synced' | 'conflict';
  pending: number;
  lastAttemptAt: string | null;
  lastError: string | null;
}

async function applyServerChanges(
  db: Awaited<ReturnType<typeof getDatabase>>,
  changes: SyncServerChange[],
): Promise<void> {
  for (const change of changes) {
    const payload = change.payload;
    if (change.entityType === 'activity' && change.operationType === 'delete') {
      await activityRepository.softDelete(db, change.entityId, change.updatedAt);
      continue;
    }
    if (!payload || change.operationType === 'delete') continue;
    if (change.entityType === 'profile') {
      const current = await profileRepository.get(db);
      const profile: ProfileRecord = {
        id: current?.id ?? change.entityId,
        displayName: String(payload.displayName),
        timezone: String(payload.timezone ?? 'UTC'),
        locale: String(payload.locale ?? 'pt-BR'),
        avatarType: String(payload.avatarType ?? 'star'),
        avatarAppearance: normalizePlayerAvatarAppearance(
          payload.avatarAppearance ?? current?.avatarAppearance,
        ),
        shareCreatureLevel: Boolean(payload.shareCreatureLevel ?? true),
        goal: payload.goal ? String(payload.goal) : (current?.goal ?? null),
        createdAt: current?.createdAt ?? change.updatedAt,
        updatedAt: change.updatedAt,
        syncStatus: 'synced',
      };
      await profileRepository.upsert(db, profile);
    } else if (change.entityType === 'weekly_goal') {
      const current = await weeklyGoalRepository.getActive(db);
      const goal: WeeklyGoalRecord = {
        id: change.entityId,
        targetCount: Number(payload.targetCount),
        preferredDays: payload.preferredDays as number[],
        activityTypes: payload.activityTypes as WeeklyGoalRecord['activityTypes'],
        startsAt: String(payload.startsAt),
        endsAt: null,
        active: Boolean(payload.active ?? true),
        allowExtraActivities: Boolean(payload.allowExtraActivities ?? true),
        createdAt: current?.id === change.entityId ? current.createdAt : change.updatedAt,
        updatedAt: change.updatedAt,
        syncStatus: 'synced',
      };
      await weeklyGoalRepository.upsertActive(db, goal);
    } else if (change.entityType === 'weekly_progress') {
      const progress: WeeklyProgressRecord = {
        weekKey: String(payload.weekKey),
        weekStart: String(payload.weekStart),
        weekEnd: String(payload.weekEnd),
        targetCount: Number(payload.targetCount),
        validActivityCount: Number(payload.validActivityCount),
        percentage: Number(payload.percentage),
        completed: Boolean(payload.completed),
        completedAt: payload.completedAt ? String(payload.completedAt) : null,
      };
      await weeklyProgressRepository.upsert(db, progress, change.updatedAt);
    } else if (change.entityType === 'activity') {
      const existing = await activityRepository.get(db, change.entityId);
      const activity: ActivityRecord = {
        id: change.entityId,
        clientGeneratedId: String(payload.clientGeneratedId),
        activityType: String(payload.activityType) as ActivityRecord['activityType'],
        occurredAt: String(payload.occurredAt),
        durationMinutes: Number(payload.durationMinutes),
        perceivedIntensity: String(payload.perceivedIntensity) as ActivityRecord['perceivedIntensity'],
        notes: payload.notes ? String(payload.notes) : null,
        location: payload.location ? String(payload.location) : null,
        moodBefore: payload.moodBefore ? String(payload.moodBefore) as ActivityRecord['moodBefore'] : null,
        moodAfter: payload.moodAfter ? String(payload.moodAfter) as ActivityRecord['moodAfter'] : null,
        hasLocalPhoto: existing?.hasLocalPhoto ?? false,
        localPhotoUri: existing?.localPhotoUri ?? null,
        movementSteps:
          payload.movementSteps != null
            ? Number(payload.movementSteps)
            : (existing?.movementSteps ?? null),
        movementSignal: payload.movementSignal
          ? (String(payload.movementSignal) as ActivityRecord['movementSignal'])
          : (existing?.movementSignal ?? null),
        isScored: existing?.isScored ?? false,
        createdAt: existing?.createdAt ?? change.updatedAt,
        updatedAt: change.updatedAt,
        deletedAt: null,
        syncStatus: 'synced',
      };
      if (existing) await activityRepository.update(db, activity);
      else await activityRepository.insert(db, activity);
    } else if (change.entityType === 'user_creature') {
      const current = await creatureRepository.get(db);
      const creature: CreatureState = {
        id: change.entityId,
        creatureKey: String(payload.creatureKey),
        nickname: payload.nickname ? String(payload.nickname) : null,
        level: Number(payload.level),
        xp: Number(payload.xp),
        // Estágio NUNCA regride pelo pull: uma evolução local ainda não
        // validada no servidor não pode ser desfeita pela reconciliação.
        evolutionStage: Math.max(Number(payload.evolutionStage), current?.evolutionStage ?? 0),
        evolvedAt: payload.evolvedAt ? String(payload.evolvedAt) : (current?.evolvedAt ?? null),
        attributes: {
          strength: Number(payload.strength), endurance: Number(payload.endurance),
          agility: Number(payload.agility), discipline: Number(payload.discipline),
          recovery: Number(payload.recovery), spirit: Number(payload.spirit),
          health: Number(payload.health), energy: Number(payload.energy),
        },
        maxVigor: Number(payload.maxVigor ?? 100),
        vigorRecoveryRate: Number(payload.vigorRecoveryRate ?? 5),
        lastVigorCalculationAt: String(payload.lastVigorCalculationAt ?? change.updatedAt),
        bond: Number(payload.bond ?? 0),
        satiety: Number(payload.satiety ?? 60),
        lastSatietyCalculationAt: String(payload.lastSatietyCalculationAt ?? change.updatedAt),
        activeBehaviorState: String(payload.activeBehaviorState ?? 'idle') as CreatureState['activeBehaviorState'],
        lastInteractionAt: payload.lastInteractionAt ? String(payload.lastInteractionAt) : null,
        equippedAbilities: (payload.equippedAbilities as string[] | undefined) ?? [],
        defeatedMilestones: (payload.defeatedMilestones as string[] | undefined) ?? [],
        totalActivities: current?.totalActivities ?? 0,
        updatedAt: change.updatedAt,
        syncStatus: 'synced',
      };
      await creatureRepository.upsertFromServer(db, creature);
    } else
    if (change.entityType === 'food_inventory') {
      await observatoryRepository.setFood(
        db,
        String(payload.foodDefinitionId),
        Number(payload.quantity),
        change.updatedAt,
      );
    } else if (change.entityType === 'observatory_state') {
      const current = await observatoryRepository.state(db);
      if (current) {
        await observatoryRepository.saveState(db, {
          ...current,
          selectedControlMode: String(payload.selectedControlMode) as typeof current.selectedControlMode,
          unlockedObjects: payload.unlockedObjects as string[],
          seenDialogueKeys: payload.seenDialogueKeys as string[],
          reduceMotion: Boolean(payload.reduceMotion),
          particlesEnabled: Boolean(payload.particlesEnabled),
          movementSpeed: Number(payload.movementSpeed),
          qualityMode: String(payload.qualityMode) as typeof current.qualityMode,
          musicEnabled: Boolean(payload.musicEnabled),
          effectsEnabled: Boolean(payload.effectsEnabled),
          hapticsEnabled: Boolean(payload.hapticsEnabled),
          updatedAt: change.updatedAt,
        });
      }
    } else if (change.entityType === 'adari_evolution') {
      // Evolução validada no servidor (ex.: feita em outro aparelho): grava o
      // histórico (INSERT OR IGNORE) e garante que o estágio local não fique atrás.
      await evolutionHistoryRepository.insert(db, {
        id: change.entityId,
        userAdariId: String(payload.userAdariId),
        fromStage: Number(payload.fromStage),
        toStage: Number(payload.toStage),
        unlockedAt: String(payload.unlockedAt),
        triggeringReason: String(payload.triggeringReason ?? 'server_sync'),
        calculationVersion: Number(payload.calculationVersion ?? 1),
        createdAt: change.updatedAt,
        syncStatus: 'synced',
      });
      const local = await creatureRepository.get(db);
      if (local && local.evolutionStage < Number(payload.toStage)) {
        await creatureRepository.update(db, {
          ...local,
          evolutionStage: Number(payload.toStage),
          evolvedAt: String(payload.unlockedAt),
          updatedAt: change.updatedAt,
          syncStatus: 'synced',
        });
      }
    } else if (change.entityType === 'adari_interaction') {
      await observatoryRepository.insertInteraction(db, {
        id: change.entityId,
        clientGeneratedId: String(payload.clientGeneratedId),
        userAdariId: String(payload.userAdariId),
        interactionType: String(payload.interactionType) as AdariInteractionRecord['interactionType'],
        foodDefinitionId: payload.foodDefinitionId ? String(payload.foodDefinitionId) : null,
        bondGranted: Number(payload.bondGranted),
        satietyGranted: Number(payload.satietyGranted),
        occurredAt: String(payload.occurredAt),
        localDate: String(payload.localDate),
        timezone: String(payload.timezone),
        calculationVersion: Number(payload.calculationVersion),
        createdAt: change.updatedAt,
        syncStatus: 'synced',
      });
    }
  }
}

/**
 * Envia a fila de alterações pendentes ao backend (idempotente por operationId).
 * A perda de conexão apenas mantém as operações na fila para reenvio.
 */
export async function flushOutbox(): Promise<FlushResult> {
  const db = await getDatabase();
  const pending = await syncOutboxRepository.pending(db);
  const deviceId = await ensureDeviceId();
  const lastSyncAt = await appStateRepository.get(db, APP_STATE_KEYS.LAST_SYNC_AT);
  await appStateRepository.set(db, APP_STATE_KEYS.LAST_SYNC_ATTEMPT_AT, new Date().toISOString());
  await syncOutboxRepository.markSyncing(db, pending.map((operation) => operation.operationId));
  try {
  const response = pending.length > 0
    ? await pushSync({
        deviceId,
        lastSyncAt,
        operations: pending.map((op) => ({
          operationId: op.operationId,
          entityType: op.entityType,
          entityId: op.entityId,
          operationType: op.operationType,
          updatedAt: op.updatedAt,
          payload: op.payload,
        })),
      })
    : {
        ...(await pullSync({ deviceId, lastSyncAt })),
        processedOperationIds: [],
        failedOperations: [],
      };

  const reconciled = reconcileFlush(response);
  await applyServerChanges(db, response.serverChanges);
  await syncOutboxRepository.markSynced(db, reconciled.syncedIds);
  await syncOutboxRepository.markFailed(db, reconciled.failedIds);
  await appStateRepository.set(db, APP_STATE_KEYS.LAST_SYNC_AT, reconciled.nextSyncAt);
  await appStateRepository.remove(db, APP_STATE_KEYS.LAST_SYNC_ERROR);

  return {
    pushed: reconciled.syncedIds.length,
    failed: reconciled.failedIds.length,
    conflicts: reconciled.conflicts,
  };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Falha de sincronização.';
    await syncOutboxRepository.resetSyncing(db);
    await appStateRepository.set(db, APP_STATE_KEYS.LAST_SYNC_ERROR, message);
    throw cause;
  }
}

export async function fullAccountSync(): Promise<FlushResult> {
  const db = await getDatabase();
  const deviceId = await ensureDeviceId();
  const response = await pullSync({ deviceId, lastSyncAt: null }, true);
  await applyServerChanges(db, response.serverChanges);
  await appStateRepository.set(db, APP_STATE_KEYS.LAST_SYNC_AT, response.serverTime);
  return { pushed: 0, failed: 0, conflicts: 0 };
}

export async function pendingSyncCount(): Promise<number> {
  const db = await getDatabase();
  return syncOutboxRepository.pendingCount(db);
}

export async function syncSnapshot(mode: 'local' | 'account' | null): Promise<SyncSnapshot> {
  if (mode !== 'account') return { state: 'local', pending: 0, lastAttemptAt: null, lastError: null };
  const db = await getDatabase();
  const [pending, lastAttemptAt, lastError] = await Promise.all([
    syncOutboxRepository.pendingCount(db),
    appStateRepository.get(db, APP_STATE_KEYS.LAST_SYNC_ATTEMPT_AT),
    appStateRepository.get(db, APP_STATE_KEYS.LAST_SYNC_ERROR),
  ]);
  return {
    state: lastError ? 'conflict' : pending > 0 ? 'pending' : 'synced',
    pending,
    lastAttemptAt,
    lastError,
  };
}
