import type { WeeklyProgressRecord } from '../models';
import type { SqlDatabase, SqlValue } from '../types';

interface ProgressRow {
  week_key: string;
  week_start: string;
  week_end: string;
  target_count: number;
  valid_activity_count: number;
  percentage: number;
  completed: number;
  completed_at: string | null;
}

function toRecord(row: ProgressRow): WeeklyProgressRecord {
  return {
    weekKey: row.week_key,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    targetCount: row.target_count,
    validActivityCount: row.valid_activity_count,
    percentage: row.percentage,
    completed: row.completed === 1,
    completedAt: row.completed_at,
  };
}

export const weeklyProgressRepository = {
  async get(db: SqlDatabase, weekKey: string): Promise<WeeklyProgressRecord | null> {
    const row = await db.getFirstAsync<ProgressRow>(
      'SELECT * FROM weekly_progress WHERE week_key = ?',
      [weekKey],
    );
    return row ? toRecord(row) : null;
  },

  async history(db: SqlDatabase): Promise<WeeklyProgressRecord[]> {
    const rows = await db.getAllAsync<ProgressRow>(
      'SELECT * FROM weekly_progress ORDER BY week_start DESC',
    );
    return rows.map(toRecord);
  },

  /** Semanas finalizadas (week_end < agora) em ordem cronológica. */
  async finished(db: SqlDatabase, nowIso: string): Promise<WeeklyProgressRecord[]> {
    const rows = await db.getAllAsync<ProgressRow>(
      'SELECT * FROM weekly_progress WHERE week_end < ? ORDER BY week_start ASC',
      [nowIso],
    );
    return rows.map(toRecord);
  },

  async upsert(db: SqlDatabase, p: WeeklyProgressRecord, nowIso: string): Promise<void> {
    await db.runAsync(
      `INSERT INTO weekly_progress
       (week_key, week_start, week_end, target_count, valid_activity_count, percentage, completed, completed_at, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(week_key) DO UPDATE SET
        week_start = excluded.week_start, week_end = excluded.week_end,
        target_count = excluded.target_count, valid_activity_count = excluded.valid_activity_count,
        percentage = excluded.percentage, completed = excluded.completed,
        completed_at = excluded.completed_at, updated_at = excluded.updated_at`,
      [
        p.weekKey,
        p.weekStart,
        p.weekEnd,
        p.targetCount,
        p.validActivityCount,
        p.percentage,
        p.completed ? 1 : 0,
        p.completedAt,
        nowIso,
        nowIso,
      ] as SqlValue[],
    );
  },
};
