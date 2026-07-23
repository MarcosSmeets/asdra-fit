import type { SyncPushResponse } from '@ad-sidera/shared';
import type { SyncServerChange } from '@ad-sidera/shared';
import { apiRequest } from './client';

export interface SyncPushBody {
  deviceId: string;
  lastSyncAt?: string | null;
  operations: Array<{
    operationId: string;
    entityType: string;
    entityId: string;
    operationType: string;
    updatedAt: string;
    payload?: Record<string, unknown> | null;
  }>;
}

export function pushSync(body: SyncPushBody): Promise<SyncPushResponse> {
  return apiRequest<SyncPushResponse>('/sync/push', { method: 'POST', body });
}

export interface SyncPullResponse {
  serverChanges: SyncServerChange[];
  nextSyncToken: string;
  serverTime: string;
}

export function pullSync(body: {
  deviceId: string;
  lastSyncAt?: string | null;
}, full = false): Promise<SyncPullResponse> {
  return apiRequest<SyncPullResponse>(full ? '/sync/full' : '/sync/pull', {
    method: 'POST', body,
  });
}
