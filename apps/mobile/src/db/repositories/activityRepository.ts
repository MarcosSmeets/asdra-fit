import type { ActivityType, Intensity, Mood } from '@ad-sidera/shared';
import type { ActivityRecord, ActivityRewardRecord } from '../models';
import type { SqlDatabase, SqlValue } from '../types';

/** Recompensa final resumida (usada no recálculo e nos badges do diário). */
export interface RewardSummary {
  finalXp: number;
  finalEnergy: number;
  finalAttributeChanges: Record<string, number>;
  dailyRewardPosition: number;
  dailyRewardMultiplier: number;
}

interface ActivityRow {
  id: string;
  client_generated_id: string;
  activity_type: string;
  occurred_at: string;
  duration_minutes: number;
  perceived_intensity: string;
  notes: string | null;
  location: string | null;
  mood_before: string | null;
  mood_after: string | null;
  has_local_photo: number;
  local_photo_uri: string | null;
  is_scored: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: string;
}

function toRecord(row: ActivityRow): ActivityRecord {
  return {
    id: row.id,
    clientGeneratedId: row.client_generated_id,
    activityType: row.activity_type as ActivityType,
    occurredAt: row.occurred_at,
    durationMinutes: row.duration_minutes,
    perceivedIntensity: row.perceived_intensity as Intensity,
    notes: row.notes,
    location: row.location,
    moodBefore: row.mood_before as Mood | null,
    moodAfter: row.mood_after as Mood | null,
    hasLocalPhoto: row.has_local_photo === 1,
    localPhotoUri: row.local_photo_uri,
    isScored: row.is_scored === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncStatus: row.sync_status as ActivityRecord['syncStatus'],
  };
}

export const activityRepository = {
  async insert(db: SqlDatabase, a: ActivityRecord): Promise<void> {
    await db.runAsync(
      `INSERT INTO activities
       (id, client_generated_id, activity_type, occurred_at, duration_minutes, perceived_intensity,
        notes, location, mood_before, mood_after, has_local_photo, local_photo_uri, is_scored,
        created_at, updated_at, deleted_at, sync_status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        a.id,
        a.clientGeneratedId,
        a.activityType,
        a.occurredAt,
        a.durationMinutes,
        a.perceivedIntensity,
        a.notes,
        a.location,
        a.moodBefore,
        a.moodAfter,
        a.hasLocalPhoto ? 1 : 0,
        a.localPhotoUri,
        a.isScored ? 1 : 0,
        a.createdAt,
        a.updatedAt,
        a.deletedAt,
        a.syncStatus,
      ] as SqlValue[],
    );
  },

  async get(db: SqlDatabase, id: string): Promise<ActivityRecord | null> {
    const row = await db.getFirstAsync<ActivityRow>(
      'SELECT * FROM activities WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
    return row ? toRecord(row) : null;
  },

  async list(db: SqlDatabase, limit = 50, offset = 0): Promise<ActivityRecord[]> {
    const rows = await db.getAllAsync<ActivityRow>(
      'SELECT * FROM activities WHERE deleted_at IS NULL ORDER BY occurred_at DESC LIMIT ? OFFSET ?',
      [limit, offset],
    );
    return rows.map(toRecord);
  },

  async listBetween(db: SqlDatabase, startIso: string, endIso: string): Promise<ActivityRecord[]> {
    const rows = await db.getAllAsync<ActivityRow>(
      'SELECT * FROM activities WHERE deleted_at IS NULL AND occurred_at >= ? AND occurred_at <= ? ORDER BY occurred_at ASC',
      [startIso, endIso],
    );
    return rows.map(toRecord);
  },

  async listByType(db: SqlDatabase, activityType: string): Promise<ActivityRecord[]> {
    const rows = await db.getAllAsync<ActivityRow>(
      'SELECT * FROM activities WHERE deleted_at IS NULL AND activity_type = ? ORDER BY occurred_at DESC',
      [activityType],
    );
    return rows.map(toRecord);
  },

  async update(db: SqlDatabase, a: ActivityRecord): Promise<void> {
    await db.runAsync(
      `UPDATE activities SET
        activity_type = ?, occurred_at = ?, duration_minutes = ?, perceived_intensity = ?,
        notes = ?, location = ?, mood_before = ?, mood_after = ?, has_local_photo = ?,
        local_photo_uri = ?, is_scored = ?, updated_at = ?, deleted_at = ?, sync_status = ?
       WHERE id = ?`,
      [
        a.activityType,
        a.occurredAt,
        a.durationMinutes,
        a.perceivedIntensity,
        a.notes,
        a.location,
        a.moodBefore,
        a.moodAfter,
        a.hasLocalPhoto ? 1 : 0,
        a.localPhotoUri,
        a.isScored ? 1 : 0,
        a.updatedAt,
        a.deletedAt,
        a.syncStatus,
        a.id,
      ] as SqlValue[],
    );
  },

  async softDelete(db: SqlDatabase, id: string, nowIso: string): Promise<void> {
    await db.runAsync(
      "UPDATE activities SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?",
      [nowIso, nowIso, id],
    );
  },

  /** Todas as atividades do dia (INCLUINDO excluídas), para recálculo de posições. */
  async listDayActivities(
    db: SqlDatabase,
    dayStartIso: string,
    dayEndIso: string,
  ): Promise<ActivityRecord[]> {
    const rows = await db.getAllAsync<ActivityRow>(
      'SELECT * FROM activities WHERE occurred_at >= ? AND occurred_at <= ? ORDER BY occurred_at ASC, created_at ASC, id ASC',
      [dayStartIso, dayEndIso],
    );
    return rows.map(toRecord);
  },

  async countActive(db: SqlDatabase): Promise<number> {
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM activities WHERE deleted_at IS NULL',
    );
    return row?.count ?? 0;
  },

  /** Nº de atividades ELEGÍVEIS (não excluídas, duração >= mínimo) no dia. */
  async countEligibleOnDay(
    db: SqlDatabase,
    dayStartIso: string,
    dayEndIso: string,
    minDurationMinutes: number,
  ): Promise<number> {
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM activities
       WHERE deleted_at IS NULL AND duration_minutes >= ? AND occurred_at >= ? AND occurred_at <= ?`,
      [minDurationMinutes, dayStartIso, dayEndIso],
    );
    return row?.count ?? 0;
  },

  async setScored(db: SqlDatabase, activityId: string, scored: boolean): Promise<void> {
    await db.runAsync('UPDATE activities SET is_scored = ? WHERE id = ?', [
      scored ? 1 : 0,
      activityId,
    ]);
  },

  /** Recompensas finais armazenadas para um conjunto de atividades (delta de recálculo + badges). */
  async getRewardsForActivities(
    db: SqlDatabase,
    activityIds: readonly string[],
  ): Promise<Map<string, RewardSummary>> {
    const map = new Map<string, RewardSummary>();
    if (activityIds.length === 0) {
      return map;
    }
    const placeholders = activityIds.map(() => '?').join(',');
    const rows = await db.getAllAsync<{
      activity_id: string;
      final_xp: number;
      final_energy: number;
      final_attribute_changes: string;
      daily_reward_position: number;
      daily_reward_multiplier: number;
    }>(
      `SELECT activity_id, final_xp, final_energy, final_attribute_changes,
              daily_reward_position, daily_reward_multiplier
       FROM activity_rewards WHERE activity_id IN (${placeholders})`,
      activityIds as SqlValue[],
    );
    for (const row of rows) {
      map.set(row.activity_id, {
        finalXp: row.final_xp,
        finalEnergy: row.final_energy,
        finalAttributeChanges: JSON.parse(row.final_attribute_changes) as Record<string, number>,
        dailyRewardPosition: row.daily_reward_position,
        dailyRewardMultiplier: row.daily_reward_multiplier,
      });
    }
    return map;
  },

  /**
   * Grava/substitui a recompensa de uma atividade. Delete+insert (em vez de
   * ON CONFLICT) é robusto porque activity_id e reward_key são ambos UNIQUE.
   */
  async upsertReward(db: SqlDatabase, r: ActivityRewardRecord): Promise<void> {
    await db.runAsync('DELETE FROM activity_rewards WHERE activity_id = ? OR reward_key = ?', [
      r.activityId,
      r.rewardKey,
    ]);
    await db.runAsync(
      `INSERT INTO activity_rewards
       (id, activity_id, reward_key, xp_granted, energy_granted, attribute_changes,
        base_xp, final_xp, base_energy, final_energy, base_attribute_changes, final_attribute_changes,
        daily_reward_position, daily_reward_multiplier, calculated_at, calculation_version)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        r.id,
        r.activityId,
        r.rewardKey,
        r.finalXp,
        r.finalEnergy,
        JSON.stringify(r.finalAttributeChanges),
        r.baseXp,
        r.finalXp,
        r.baseEnergy,
        r.finalEnergy,
        JSON.stringify(r.baseAttributeChanges),
        JSON.stringify(r.finalAttributeChanges),
        r.rewardEligiblePosition,
        r.dailyRewardMultiplier,
        r.calculatedAt,
        r.calculationVersion,
      ] as SqlValue[],
    );
  },
};
