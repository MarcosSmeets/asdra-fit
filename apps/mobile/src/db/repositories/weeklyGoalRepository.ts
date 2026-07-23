import type { ActivityType } from '@ad-sidera/shared';
import type { WeeklyGoalRecord } from '../models';
import type { SqlDatabase, SqlValue } from '../types';

interface GoalRow {
  id: string;
  target_count: number;
  preferred_days: string;
  activity_types: string;
  starts_at: string;
  ends_at: string | null;
  active: number;
  allow_extra_activities: number;
  created_at: string;
  updated_at: string;
  sync_status: string;
}

function toRecord(row: GoalRow): WeeklyGoalRecord {
  return {
    id: row.id,
    targetCount: row.target_count,
    preferredDays: JSON.parse(row.preferred_days) as number[],
    activityTypes: JSON.parse(row.activity_types) as ActivityType[],
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    active: row.active === 1,
    allowExtraActivities: row.allow_extra_activities === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status as WeeklyGoalRecord['syncStatus'],
  };
}

export const weeklyGoalRepository = {
  async getActive(db: SqlDatabase): Promise<WeeklyGoalRecord | null> {
    const row = await db.getFirstAsync<GoalRow>(
      'SELECT * FROM weekly_goals WHERE active = 1 ORDER BY starts_at DESC LIMIT 1',
    );
    return row ? toRecord(row) : null;
  },

  async history(db: SqlDatabase): Promise<WeeklyGoalRecord[]> {
    const rows = await db.getAllAsync<GoalRow>(
      'SELECT * FROM weekly_goals ORDER BY starts_at DESC',
    );
    return rows.map(toRecord);
  },

  async upsertActive(
    db: SqlDatabase,
    goal: WeeklyGoalRecord,
    withinTransaction = false,
  ): Promise<void> {
    const persist = async (): Promise<void> => {
      await db.runAsync('UPDATE weekly_goals SET active = 0 WHERE id != ?', [goal.id]);
      await db.runAsync(
        `INSERT INTO weekly_goals
         (id, target_count, preferred_days, activity_types, starts_at, ends_at, active,
          allow_extra_activities, created_at, updated_at, sync_status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET
          target_count = excluded.target_count, preferred_days = excluded.preferred_days,
          activity_types = excluded.activity_types, starts_at = excluded.starts_at,
          ends_at = excluded.ends_at, active = 1, allow_extra_activities = excluded.allow_extra_activities,
          updated_at = excluded.updated_at, sync_status = excluded.sync_status`,
        [
          goal.id,
          goal.targetCount,
          JSON.stringify(goal.preferredDays),
          JSON.stringify(goal.activityTypes),
          goal.startsAt,
          goal.endsAt,
          goal.active ? 1 : 0,
          goal.allowExtraActivities ? 1 : 0,
          goal.createdAt,
          goal.updatedAt,
          goal.syncStatus,
        ] as SqlValue[],
      );
    };
    if (withinTransaction) {
      await persist();
    } else {
      await db.withTransactionAsync(persist);
    }
  },

  async countCompletedWeeks(db: SqlDatabase): Promise<number> {
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM weekly_progress WHERE completed = 1',
    );
    return row?.count ?? 0;
  },
};
