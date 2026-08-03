import type { ProfileRecord } from '../models';
import type { SqlDatabase, SqlValue } from '../types';

interface ProfileRow {
  id: string;
  display_name: string;
  timezone: string;
  locale: string;
  avatar_type: string;
  share_creature_level: number;
  goal: string | null;
  created_at: string;
  updated_at: string;
  sync_status: string;
}

function toRecord(row: ProfileRow): ProfileRecord {
  return {
    id: row.id,
    displayName: row.display_name,
    timezone: row.timezone,
    locale: row.locale,
    avatarType: row.avatar_type,
    shareCreatureLevel: row.share_creature_level === 1,
    goal: row.goal,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status as ProfileRecord['syncStatus'],
  };
}

export const profileRepository = {
  async get(db: SqlDatabase): Promise<ProfileRecord | null> {
    const row = await db.getFirstAsync<ProfileRow>('SELECT * FROM profile LIMIT 1');
    return row ? toRecord(row) : null;
  },

  /**
   * `avatar_appearance_json` saiu do INSERT junto com o Explorador — omitir é
   * legal porque a coluna tem DEFAULT.
   *
   * A coluna em si permanece na tabela: o array de migrations é indexado por
   * `PRAGMA user_version`, então apagar o slot v7 deslocaria v8/v9/v10 e
   * corromperia bancos já instalados.
   */
  async upsert(db: SqlDatabase, p: ProfileRecord): Promise<void> {
    await db.runAsync(
      `INSERT INTO profile
       (id, display_name, timezone, locale, avatar_type, share_creature_level, goal, created_at, updated_at, sync_status)
       VALUES (?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
        display_name = excluded.display_name, timezone = excluded.timezone, locale = excluded.locale,
        avatar_type = excluded.avatar_type, share_creature_level = excluded.share_creature_level,
        goal = excluded.goal, updated_at = excluded.updated_at, sync_status = excluded.sync_status`,
      [
        p.id,
        p.displayName,
        p.timezone,
        p.locale,
        p.avatarType,
        p.shareCreatureLevel ? 1 : 0,
        p.goal,
        p.createdAt,
        p.updatedAt,
        p.syncStatus,
      ] as SqlValue[],
    );
  },
};
