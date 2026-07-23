import type { SyncPushResponse } from '@ad-sidera/shared';

export interface Reconciliation {
  syncedIds: string[];
  failedIds: string[];
  conflicts: number;
  nextSyncAt: string;
}

/** Deriva, de forma pura, o resultado de um flush para atualizar a fila local. */
export function reconcileFlush(response: SyncPushResponse): Reconciliation {
  return {
    syncedIds: [...response.processedOperationIds],
    failedIds: response.failedOperations.map((f) => f.operationId),
    conflicts: response.failedOperations.length,
    nextSyncAt: response.serverTime,
  };
}
