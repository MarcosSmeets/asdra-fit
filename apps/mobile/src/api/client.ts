import { tokenStore } from '../platform/secureStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  /** Uso interno para evitar loop de refresh. */
  _retried?: boolean;
}

let refreshInFlight: Promise<boolean> | null = null;

async function performTokenRefresh(): Promise<boolean> {
  const refreshToken = await tokenStore.getRefresh();
  if (!refreshToken) {
    return false;
  }
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      await tokenStore.clear();
      return false;
    }
    throw new ApiError('NÃ£o foi possÃ­vel renovar sua sessÃ£o agora.', res.status, 'REFRESH_UNAVAILABLE');
  }
  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  if (!data.accessToken || !data.refreshToken) {
    throw new ApiError('Resposta de autenticaÃ§Ã£o invÃ¡lida.', 502, 'INVALID_REFRESH_RESPONSE');
  }
  await tokenStore.setTokens(data.accessToken, data.refreshToken);
  return true;
}

/** Serializa a rotaÃ§Ã£o: requests simultÃ¢neos nunca reutilizam o mesmo refresh token. */
function refreshTokens(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = performTokenRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    let token = await tokenStore.getAccess();
    if (!token) {
      const refreshed = await refreshTokens();
      if (refreshed) token = await tokenStore.getAccess();
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      throw new ApiError('Sua sessÃ£o expirou. Entre novamente para sincronizar.', 401, 'SESSION_EXPIRED');
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && !options._retried) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, _retried: true });
    }
    await tokenStore.clear();
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const json = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const err = json as { message?: string; error?: string } | null;
    throw new ApiError(err?.message ?? 'Erro na requisição.', res.status, err?.error);
  }
  return json as T;
}
