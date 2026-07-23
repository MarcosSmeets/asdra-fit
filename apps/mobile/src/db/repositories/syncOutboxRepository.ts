import type { SyncEntityType, SyncOperationType } from '@ad-sidera/shared';
import type { SqlDatabase, SqlValue } from '../types';

export interface OutboxOperation {
  id: string;
  operationId: string;
  entityType: SyncEntityType;
  entityId: string;
  operationType: SyncOperationType;
  payload: Record<string, unknown> | null;
  updatedAt: string;
  createdAt: string;
  attempts: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
}

interface OutboxRow {
  id: string;
  operation_id: string;
  entity_type: string;
  entity_id: string;
  operation_type: string;
  payload: string | null;
  updated_at: string;
  created_at: string;
  attempts: number;
  status: string;
}

function toOp(row: OutboxRow): OutboxOperation {
  return {
    id: row.id,
    operationId: row.operation_id,
    entityType: row.entity_type as SyncEntityType,
    entityId: row.entity_id,
    operationType: row.operation_type as SyncOperationType,
    payload: row.payload ? (JSON.parse(row.payload) as Record<string, unknown>) : null,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    attempts: row.attempts,
    status: row.status as OutboxOperation['status'],
  };
}

export const syncOutboxRepository = {
  async enqueue(db: SqlDatabase, op: OutboxOperation): Promise<void> {
    await db.runAsync(
      `INSERT INTO sync_outbox
       (id, operation_id, entity_type, entity_id, operation_type, payload, updated_at, created_at, attempts, status)
       VALUES (?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(operation_id) DO NOTHING`,
      [
        op.id,
        op.operationId,
        op.entityType,
        op.entityId,
        op.operationType,
        op.payload ? JSON.stringify(op.payload) : null,
        op.updatedAt,
        op.createdAt,
        op.attempts,
        op.status,
      ] as SqlValue[],
    );
  },

  async pending(db: SqlDatabase, limit = 100): Promise<OutboxOperation[]> {
    const rows = await db.getAllAsync<OutboxRow>(
      "SELECT * FROM sync_outbox WHERE status IN ('pending','failed') ORDER BY created_at ASC LIMIT ?",
      [limit],
    );
    return rows.map(toOp);
  },

  async markSynced(db: SqlDatabase, operationIds: readonly string[]): Promise<void> {
    if (operationIds.length === 0) {
      return;
    }
    const placeholders = operationIds.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE sync_outbox SET status = 'synced' WHERE operation_id IN (${placeholders})`,
      operationIds as SqlValue[],
    );
  },

  async markSyncing(db: SqlDatabase, operationIds: readonly string[]): Promise<void> {
    if (operationIds.length === 0) return;
    const placeholders = operationIds.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE sync_outbox SET status = 'syncing' WHERE operation_id IN (${placeholders})`,
      operationIds as SqlValue[],
    );
  },

  async resetSyncing(db: SqlDatabase): Promise<void> {
    await db.runAsync("UPDATE sync_outbox SET status = 'pending', attempts = attempts + 1 WHERE status = 'syncing'");
  },

  async markFailed(db: SqlDatabase, operationIds: readonly string[]): Promise<void> {
    if (operationIds.length === 0) {
      return;
    }
    const placeholders = operationIds.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE sync_outbox SET status = 'failed', attempts = attempts + 1 WHERE operation_id IN (${placeholders})`,
      operationIds as SqlValue[],
    );
  },

  async pendingCount(db: SqlDatabase): Promise<number> {
    const row = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM sync_outbox WHERE status IN ('pending','failed')",
    );
    return row?.count ?? 0;
  },
};
