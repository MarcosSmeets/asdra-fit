import type { DailyBattleProgressRecord } from '../models';
import type { SqlDatabase } from '../types';

interface DailyBattleProgressRow {
  day_key: string;
  rewarded_wins: number;
  xp_granted: number;
  updated_at: string;
}

function toRecord(row: DailyBattleProgressRow): DailyBattleProgressRecord {
  return {
    dayKey: row.day_key,
    rewardedWins: row.rewarded_wins,
    xpGranted: row.xp_granted,
    updatedAt: row.updated_at,
  };
}

export const dailyBattleProgressRepository = {
  async get(db: SqlDatabase, dayKey: string): Promise<DailyBattleProgressRecord | null> {
    const row = await db.getFirstAsync<DailyBattleProgressRow>(
      'SELECT * FROM daily_battle_progress WHERE day_key = ?',
      [dayKey],
    );
    return row ? toRecord(row) : null;
  },

  /** Vitórias recompensadas hoje (0 se o dia ainda não tem registro). */
  async rewardedWins(db: SqlDatabase, dayKey: string): Promise<number> {
    const record = await this.get(db, dayKey);
    return record?.rewardedWins ?? 0;
  },

  /** Registra uma vitória recompensada no dia (incrementa contagem e XP). */
  async addRewardedWin(
    db: SqlDatabase,
    dayKey: string,
    xp: number,
    nowIso: string,
  ): Promise<void> {
    await db.runAsync(
      `INSERT INTO daily_battle_progress (day_key, rewarded_wins, xp_granted, updated_at)
       VALUES (?, 1, ?, ?)
       ON CONFLICT(day_key) DO UPDATE SET
         rewarded_wins = rewarded_wins + 1,
         xp_granted = xp_granted + excluded.xp_granted,
         updated_at = excluded.updated_at`,
      [dayKey, xp, nowIso],
    );
  },
};
