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

/**
 * Sem isto, um endereço de API errado (IP da máquina mudou, servidor fora do ar)
 * deixa o botão girando por mais de um minuto e parece que o app "não chamou"
 * o login. Com o corte, a tela mostra em segundos o que está errado.
 */
const REQUEST_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    throw new ApiError(
      controller.signal.aborted
        ? `O servidor em ${BASE_URL} não respondeu a tempo. Confira se a API está no ar.`
        : `Não foi possível falar com o servidor em ${BASE_URL}. Confira a conexão e o endereço da API.`,
      503,
      controller.signal.aborted ? 'NETWORK_TIMEOUT' : 'NETWORK_UNREACHABLE',
    );
  } finally {
    clearTimeout(timer);
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function performTokenRefresh(): Promise<boolean> {
  const refreshToken = await tokenStore.getRefresh();
  if (!refreshToken) {
    return false;
  }
  const res = await fetchWithTimeout(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      await tokenStore.clear();
      return false;
    }
    throw new ApiError('Não foi possível renovar sua sessão agora.', res.status, 'REFRESH_UNAVAILABLE');
  }
  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  if (!data.accessToken || !data.refreshToken) {
    throw new ApiError('Resposta de autenticação inválida.', 502, 'INVALID_REFRESH_RESPONSE');
  }
  await tokenStore.setTokens(data.accessToken, data.refreshToken);
  return true;
}

/** Serializa a rotação: requests simultâneos nunca reutilizam o mesmo refresh token. */
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
      throw new ApiError('Sua sessão expirou. Entre novamente para sincronizar.', 401, 'SESSION_EXPIRED');
    }
  }

  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
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
