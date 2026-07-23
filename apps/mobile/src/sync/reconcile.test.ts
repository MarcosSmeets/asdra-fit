import type { SyncPushResponse } from '@ad-sidera/shared';
import { reconcileFlush } from './reconcile';

describe('reconcileFlush', () => {
  it('separa operações processadas de conflitos e captura o serverTime', () => {
    const response: SyncPushResponse = {
      processedOperationIds: ['op1', 'op2'],
      failedOperations: [
        {
          operationId: 'op3',
          entityType: 'activity',
          entityId: 'a3',
          reason: 'stale_update',
          message: 'servidor mais novo',
        },
      ],
      serverChanges: [],
      nextSyncToken: '2026-01-07T12:00:00.000Z',
      serverTime: '2026-01-07T12:00:00.000Z',
    };
    const result = reconcileFlush(response);
    expect(result.syncedIds).toEqual(['op1', 'op2']);
    expect(result.failedIds).toEqual(['op3']);
    expect(result.conflicts).toBe(1);
    expect(result.nextSyncAt).toBe('2026-01-07T12:00:00.000Z');
  });

  it('resposta vazia não sincroniza nada', () => {
    const result = reconcileFlush({
      processedOperationIds: [],
      failedOperations: [],
      serverChanges: [],
      nextSyncToken: 't',
      serverTime: 't',
    });
    expect(result.syncedIds).toHaveLength(0);
    expect(result.failedIds).toHaveLength(0);
  });
});
