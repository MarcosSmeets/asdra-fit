import { TRAINABLE_ATTRIBUTES, type AttributeChanges } from '@ad-sidera/shared';
import type { SqlDatabase } from '../types';
import { uuidv4 } from '../../utils/id';

interface AttributeStateRow {
  attribute: string;
  training_total: number;
}

/**
 * Pontos de treino acumulados por atributo. É a ÚNICA coisa persistida da
 * progressão: valor e progresso são derivados daqui (ver `materializeAttributes`).
 */
export const attributeStateRepository = {
  async trainingTotals(db: SqlDatabase, userAdariId: string): Promise<AttributeChanges> {
    const rows = await db.getAllAsync<AttributeStateRow>(
      'SELECT attribute, training_total FROM adari_attribute_state WHERE user_adari_id = ?',
      [userAdariId],
    );
    const totals: AttributeChanges = {};
    for (const row of rows) {
      totals[row.attribute as keyof AttributeChanges] = row.training_total;
    }
    return totals;
  },

  /** Grava o total absoluto de cada atributo (nunca soma — o caller já somou). */
  async setTrainingTotals(
    db: SqlDatabase,
    userAdariId: string,
    totals: AttributeChanges,
    updatedAt: string,
  ): Promise<void> {
    for (const attribute of TRAINABLE_ATTRIBUTES) {
      const total = Math.max(0, Math.floor(totals[attribute] ?? 0));
      await db.runAsync(
        `INSERT INTO adari_attribute_state (id, user_adari_id, attribute, training_total, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_adari_id, attribute) DO UPDATE SET
           training_total = excluded.training_total,
           updated_at = excluded.updated_at`,
        [uuidv4(), userAdariId, attribute, total, updatedAt],
      );
    }
  },
};
