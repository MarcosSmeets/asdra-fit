export type PersistedAppMode = 'local' | 'account' | null;

/** Nunca apresenta modo Conta quando o dispositivo não possui credencial recuperável. */
export function resolveSessionMode(
  persistedMode: PersistedAppMode,
  hasCredentials: boolean,
): PersistedAppMode {
  if (persistedMode === 'account' && !hasCredentials) return 'local';
  return persistedMode ?? (hasCredentials ? 'account' : null);
}
