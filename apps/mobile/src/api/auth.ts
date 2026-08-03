import type { AuthTokens } from '@ad-sidera/shared';
import { tokenStore } from '../platform/secureStore';
import { apiRequest } from './client';

export interface AuthUserSummary {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  hasCreature: boolean;
}

interface AuthResult {
  user: AuthUserSummary;
  tokens: AuthTokens;
}

export async function registerAccount(input: {
  displayName: string;
  email: string;
  password: string;
  timezone: string;
}): Promise<AuthUserSummary> {
  const result = await apiRequest<AuthResult>('/auth/register', {
    method: 'POST',
    body: input,
    auth: false,
  });
  await tokenStore.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
  await tokenStore.setAccountUserId(result.user.id);
  return result.user;
}

export async function convertLocalProfileAccount(input: {
  displayName: string;
  email: string;
  password: string;
  timezone: string;
  operationId: string;
  localProfileId: string;
}): Promise<AuthUserSummary> {
  const result = await apiRequest<AuthResult>('/auth/local-profile/convert', {
    method: 'POST', body: input, auth: false,
  });
  await tokenStore.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
  await tokenStore.setAccountUserId(result.user.id);
  return result.user;
}

export async function confirmLocalProfileConversion(operationId: string): Promise<void> {
  await apiRequest<void>('/auth/local-profile/convert/complete', {
    method: 'POST', body: { operationId },
  });
}

export async function login(email: string, password: string): Promise<AuthUserSummary> {
  const result = await apiRequest<AuthResult>('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  await tokenStore.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
  await tokenStore.setAccountUserId(result.user.id);
  return result.user;
}

export async function logout(): Promise<void> {
  const refreshToken = await tokenStore.getRefresh();
  if (refreshToken) {
    await apiRequest<void>('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    }).catch(() => undefined);
  }
  await tokenStore.clear();
}

export async function fetchMe(): Promise<AuthUserSummary> {
  return apiRequest<AuthUserSummary>('/auth/me');
}

/** Resposta neutra do backend: não revela se o e-mail está cadastrado. */
export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
    auth: false,
  });
}

export async function resetPassword(input: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<void> {
  await apiRequest<void>('/auth/reset-password', {
    method: 'POST',
    body: input,
    auth: false,
  });
}
