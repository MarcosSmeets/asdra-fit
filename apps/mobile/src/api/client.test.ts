const mockTokenStore = {
  getAccess: jest.fn<Promise<string | null>, []>(),
  getRefresh: jest.fn<Promise<string | null>, []>(),
  setTokens: jest.fn<Promise<void>, [string, string]>(),
  clear: jest.fn<Promise<void>, []>(),
};

jest.mock('../platform/secureStore', () => ({ tokenStore: mockTokenStore }));

import { apiRequest } from './client';

function response(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

describe('apiRequest authentication', () => {
  const fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as typeof fetch;
  });

  it('renova preventivamente e nunca envia sync sem Authorization', async () => {
    let access: string | null = null;
    mockTokenStore.getAccess.mockImplementation(async () => access);
    mockTokenStore.getRefresh.mockResolvedValue('refresh-1');
    mockTokenStore.setTokens.mockImplementation(async (nextAccess) => { access = nextAccess; });
    fetchMock.mockImplementation(async (url) => {
      if (String(url).endsWith('/auth/refresh')) {
        return response(200, { accessToken: 'access-2', refreshToken: 'refresh-2' });
      }
      return response(200, { processedOperationIds: [], failedOperations: [], serverChanges: [], nextSyncToken: 'n', serverTime: 'now' });
    });

    await apiRequest('/sync/push', { method: 'POST', body: { operations: [] } });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/auth/refresh');
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({ Authorization: 'Bearer access-2' });
  });

  it('falha localmente sem fazer request protegido quando nÃ£o existe credencial', async () => {
    mockTokenStore.getAccess.mockResolvedValue(null);
    mockTokenStore.getRefresh.mockResolvedValue(null);

    await expect(apiRequest('/sync/push', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 401,
      code: 'SESSION_EXPIRED',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('serializa refresh concorrente e reutiliza o novo access token', async () => {
    let access: string | null = null;
    mockTokenStore.getAccess.mockImplementation(async () => access);
    mockTokenStore.getRefresh.mockResolvedValue('refresh-1');
    mockTokenStore.setTokens.mockImplementation(async (nextAccess) => { access = nextAccess; });
    fetchMock.mockImplementation(async (url) => {
      if (String(url).endsWith('/auth/refresh')) {
        return response(200, { accessToken: 'access-shared', refreshToken: 'refresh-2' });
      }
      return response(200, { ok: true });
    });

    await Promise.all([apiRequest('/auth/me'), apiRequest('/sync/pull', { method: 'POST', body: {} })]);

    const refreshCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
    expect(fetchMock.mock.calls.slice(1).every(([, init]) => (init?.headers as Record<string, string>).Authorization === 'Bearer access-shared')).toBe(true);
  });

  it('preserva credenciais em falha temporÃ¡ria do servidor de refresh', async () => {
    mockTokenStore.getAccess.mockResolvedValue(null);
    mockTokenStore.getRefresh.mockResolvedValue('refresh-1');
    fetchMock.mockResolvedValue(response(503, { message: 'indisponÃ­vel' }));

    await expect(apiRequest('/sync/push', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 503,
      code: 'REFRESH_UNAVAILABLE',
    });
    expect(mockTokenStore.clear).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
