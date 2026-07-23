import type { SqlDatabase } from '../types';

/** Armazém chave-valor local (onboarding, modo, deviceId, lastSyncAt, etc.). */
export const appStateRepository = {
  async get(db: SqlDatabase, key: string): Promise<string | null> {
    const row = await db.getFirstAsync<{ value: string | null }>(
      'SELECT value FROM app_state WHERE key = ?',
      [key],
    );
    return row?.value ?? null;
  },

  async set(db: SqlDatabase, key: string, value: string): Promise<void> {
    await db.runAsync(
      'INSERT INTO app_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value],
    );
  },

  async getBool(db: SqlDatabase, key: string): Promise<boolean> {
    return (await this.get(db, key)) === 'true';
  },

  async setBool(db: SqlDatabase, key: string, value: boolean): Promise<void> {
    await this.set(db, key, value ? 'true' : 'false');
  },

  async remove(db: SqlDatabase, key: string): Promise<void> {
    await db.runAsync('DELETE FROM app_state WHERE key = ?', [key]);
  },
};

export const APP_STATE_KEYS = {
  ONBOARDING_COMPLETE: 'onboarding_complete',
  MODE: 'mode', // 'local' | 'account'
  DEVICE_ID: 'device_id',
  LAST_SYNC_AT: 'last_sync_at',
  INTRO_SEEN: 'intro_seen',
  ONBOARDING_DRAFT: 'onboarding_draft_v2',
  ONBOARDING_COMPLETED_STEPS: 'onboarding_completed_steps_v2',
  LOCAL_PROFILE_BOUND: 'local_profile_bound',
  CONVERSION_OPERATION_ID: 'local_profile_conversion_operation_id',
  CONVERSION_STATE: 'local_profile_conversion_state',
  LAST_SYNC_ATTEMPT_AT: 'last_sync_attempt_at',
  LAST_SYNC_ERROR: 'last_sync_error',
} as const;
