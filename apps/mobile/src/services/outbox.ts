import type { SyncEntityType, SyncOperationType } from '@ad-sidera/shared';
import { syncOutboxRepository } from '../db/repositories/syncOutboxRepository';
import type { SqlDatabase } from '../db/types';
import { nowIso } from '../utils/datetime';
import { uuidv4 } from '../utils/id';

/** Enfileira uma operação de sincronização (fila de alterações pendentes). */
export async function enqueueOperation(
  db: SqlDatabase,
  params: {
    entityType: SyncEntityType;
    entityId: string;
    operationType: SyncOperationType;
    updatedAt: string;
    payload: Record<string, unknown> | null;
  },
): Promise<void> {
  const now = nowIso();
  await syncOutboxRepository.enqueue(db, {
    id: uuidv4(),
    operationId: uuidv4(),
    entityType: params.entityType,
    entityId: params.entityId,
    operationType: params.operationType,
    payload: params.payload,
    updatedAt: params.updatedAt,
    createdAt: now,
    attempts: 0,
    status: 'pending',
  });
}
