import type { AdariEvolutionHistoryRecord } from '../models';
import type { SqlDatabase, SqlValue } from '../types';

interface HistoryRow {
  id: string;
  user_adari_id: string;
  from_stage: number;
  to_stage: number;
  unlocked_at: string;
  triggering_reason: string;
  calculation_version: number;
  created_at: string;
  sync_status: string;
}

function toRecord(row: HistoryRow): AdariEvolutionHistoryRecord {
  return {
    id: row.id,
    userAdariId: row.user_adari_id,
    fromStage: row.from_stage,
    toStage: row.to_stage,
    unlockedAt: row.unlocked_at,
    triggeringReason: row.triggering_reason,
    calculationVersion: row.calculation_version,
    createdAt: row.created_at,
    syncStatus: row.sync_status as AdariEvolutionHistoryRecord['syncStatus'],
  };
}

export const evolutionHistoryRepository = {
  async listByAdari(db: SqlDatabase, userAdariId: string): Promise<AdariEvolutionHistoryRecord[]> {
    const rows = await db.getAllAsync<HistoryRow>(
      'SELECT * FROM adari_evolution_history WHERE user_adari_id = ? ORDER BY to_stage ASC',
      [userAdariId],
    );
    return rows.map(toRecord);
  },

  async findTransition(
    db: SqlDatabase,
    userAdariId: string,
    fromStage: number,
    toStage: number,
  ): Promise<AdariEvolutionHistoryRecord | null> {
    const row = await db.getFirstAsync<HistoryRow>(
      'SELECT * FROM adari_evolution_history WHERE user_adari_id = ? AND from_stage = ? AND to_stage = ?',
      [userAdariId, fromStage, toStage],
    );
    return row ? toRecord(row) : null;
  },

  /** Insere ignorando duplicatas (histórico é único por transição). */
  async insert(db: SqlDatabase, record: AdariEvolutionHistoryRecord): Promise<void> {
    await db.runAsync(
      `INSERT OR IGNORE INTO adari_evolution_history
       (id, user_adari_id, from_stage, to_stage, unlocked_at, triggering_reason,
        calculation_version, created_at, sync_status)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        record.id,
        record.userAdariId,
        record.fromStage,
        record.toStage,
        record.unlockedAt,
        record.triggeringReason,
        record.calculationVersion,
        record.createdAt,
        record.syncStatus,
      ] as SqlValue[],
    );
  },

  async markSynced(db: SqlDatabase, id: string): Promise<void> {
    await db.runAsync('UPDATE adari_evolution_history SET sync_status = ? WHERE id = ?', [
      'synced',
      id,
    ]);
  },
};
