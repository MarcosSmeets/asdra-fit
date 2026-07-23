import type { BattleSessionRecord } from '../models';
import type { SqlDatabase, SqlValue } from '../types';

interface BattleSessionRow {
  id: string;
  client_generated_id: string;
  battle_type: string;
  adversary_id: string | null;
  day_key: string;
  result: string;
  rewarded: number;
  xp_granted: number;
  vigor_spent: number;
  seed: number | null;
  turns: number | null;
  battle_calculation_version: number;
  created_at: string;
  sync_status: string;
}

function toRecord(row: BattleSessionRow): BattleSessionRecord {
  return {
    id: row.id,
    clientGeneratedId: row.client_generated_id,
    battleType: row.battle_type as BattleSessionRecord['battleType'],
    adversaryId: row.adversary_id,
    dayKey: row.day_key,
    result: row.result as BattleSessionRecord['result'],
    rewarded: row.rewarded === 1,
    xpGranted: row.xp_granted,
    vigorSpent: row.vigor_spent,
    seed: row.seed,
    turns: row.turns,
    battleCalculationVersion: row.battle_calculation_version,
    createdAt: row.created_at,
    syncStatus: row.sync_status as BattleSessionRecord['syncStatus'],
  };
}

export const battleSessionRepository = {
  async latest(db: SqlDatabase): Promise<BattleSessionRecord | null> {
    const row = await db.getFirstAsync<BattleSessionRow>(
      'SELECT * FROM battle_sessions ORDER BY created_at DESC LIMIT 1',
    );
    return row ? toRecord(row) : null;
  },

  async getByClientId(
    db: SqlDatabase,
    clientGeneratedId: string,
  ): Promise<BattleSessionRecord | null> {
    const row = await db.getFirstAsync<BattleSessionRow>(
      'SELECT * FROM battle_sessions WHERE client_generated_id = ?',
      [clientGeneratedId],
    );
    return row ? toRecord(row) : null;
  },

  async insert(db: SqlDatabase, session: BattleSessionRecord): Promise<void> {
    await db.runAsync(
      `INSERT INTO battle_sessions
       (id, client_generated_id, battle_type, adversary_id, day_key, result, rewarded,
        xp_granted, vigor_spent, seed, turns, battle_calculation_version, created_at, sync_status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        session.id,
        session.clientGeneratedId,
        session.battleType,
        session.adversaryId,
        session.dayKey,
        session.result,
        session.rewarded ? 1 : 0,
        session.xpGranted,
        session.vigorSpent,
        session.seed,
        session.turns,
        session.battleCalculationVersion,
        session.createdAt,
        session.syncStatus,
      ] as SqlValue[],
    );
  },

  /** Vitórias recompensadas registradas para um dia local (para reconciliação). */
  async rewardedWinsForDay(db: SqlDatabase, dayKey: string): Promise<number> {
    const row = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM battle_sessions
       WHERE day_key = ? AND battle_type = 'pve' AND result = 'victory' AND rewarded = 1`,
      [dayKey],
    );
    return row?.n ?? 0;
  },
};
