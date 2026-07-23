export type PersistedAppMode = 'local' | 'account' | null;

/** Nunca apresenta modo Conta quando o dispositivo nÃ£o possui credencial recuperÃ¡vel. */
export function resolveSessionMode(
  persistedMode: PersistedAppMode,
  hasCredentials: boolean,
): PersistedAppMode {
  if (persistedMode === 'account' && !hasCredentials) return 'local';
  return persistedMode ?? (hasCredentials ? 'account' : null);
}
