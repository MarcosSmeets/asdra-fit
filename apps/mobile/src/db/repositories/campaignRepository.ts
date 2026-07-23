import type { SqlDatabase } from '../types';

export const campaignRepository = {
  async defeatedIds(db: SqlDatabase): Promise<string[]> {
    const rows = await db.getAllAsync<{ adversary_id: string }>(
      'SELECT adversary_id FROM campaign_progress WHERE defeated = 1',
    );
    return rows.map((r) => r.adversary_id);
  },

  async markDefeated(db: SqlDatabase, adversaryId: string, nowIso: string): Promise<void> {
    await db.runAsync(
      `INSERT INTO campaign_progress (adversary_id, defeated, defeated_at)
       VALUES (?, 1, ?)
       ON CONFLICT(adversary_id) DO UPDATE SET defeated = 1, defeated_at = excluded.defeated_at`,
      [adversaryId, nowIso],
    );
  },

  async isDefeated(db: SqlDatabase, adversaryId: string): Promise<boolean> {
    const row = await db.getFirstAsync<{ defeated: number }>(
      'SELECT defeated FROM campaign_progress WHERE adversary_id = ?',
      [adversaryId],
    );
    return row?.defeated === 1;
  },
};
