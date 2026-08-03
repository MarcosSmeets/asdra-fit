import type { AttributeChanges } from '@ad-sidera/shared';
import type { SqlDatabase } from '../types';

export interface LevelUpRewardRecord {
  id: string;
  userAdariId: string;
  fromLevel: number;
  toLevel: number;
  attributeGains: AttributeChanges;
  operationId: string;
  calculationVersion: number;
  createdAt: string;
}

interface LevelUpRow {
  id: string;
  user_adari_id: string;
  from_level: number;
  to_level: number;
  attribute_gains_json: string;
  operation_id: string;
  calculation_version: number;
  created_at: string;
}

function toRecord(row: LevelUpRow): LevelUpRewardRecord {
  return {
    id: row.id,
    userAdariId: row.user_adari_id,
    fromLevel: row.from_level,
    toLevel: row.to_level,
    attributeGains: JSON.parse(row.attribute_gains_json) as AttributeChanges,
    operationId: row.operation_id,
    calculationVersion: row.calculation_version,
    createdAt: row.created_at,
  };
}

/**
 * Histórico de ganhos por nível. Serve à celebração e à auditoria — o VALOR do
 * atributo não vem daqui (é derivado do nível), então um registro perdido nunca
 * corrompe os stats. A UNIQUE por nível impede duplicar ao sincronizar.
 */
export const levelUpRewardRepository = {
  /** Insere se ainda não existe registro para o nível alcançado (idempotente). */
  async record(db: SqlDatabase, record: LevelUpRewardRecord): Promise<boolean> {
    const result = await db.runAsync(
      `INSERT INTO adari_level_up_reward
         (id, user_adari_id, from_level, to_level, attribute_gains_json, operation_id,
          calculation_version, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_adari_id, to_level) DO NOTHING`,
      [
        record.id,
        record.userAdariId,
        record.fromLevel,
        record.toLevel,
        JSON.stringify(record.attributeGains),
        record.operationId,
        record.calculationVersion,
        record.createdAt,
      ],
    );
    return result.changes === 1;
  },

  async listFor(db: SqlDatabase, userAdariId: string): Promise<LevelUpRewardRecord[]> {
    const rows = await db.getAllAsync<LevelUpRow>(
      'SELECT * FROM adari_level_up_reward WHERE user_adari_id = ? ORDER BY to_level ASC',
      [userAdariId],
    );
    return rows.map(toRecord);
  },

  async highestLevelRecorded(db: SqlDatabase, userAdariId: string): Promise<number> {
    const row = await db.getFirstAsync<{ max_level: number | null }>(
      'SELECT MAX(to_level) AS max_level FROM adari_level_up_reward WHERE user_adari_id = ?',
      [userAdariId],
    );
    return row?.max_level ?? 0;
  },
};
