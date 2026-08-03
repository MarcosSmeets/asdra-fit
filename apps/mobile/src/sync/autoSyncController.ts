export interface AutoSyncDeps {
  isAccountMode: () => boolean;
  pendingCount: () => Promise<number>;
  flush: () => Promise<unknown>;
  debounceMs?: number;
}

export interface AutoSyncController {
  /** Sinaliza uma janela de oportunidade (reconexão, foreground, boot). */
  signal: () => void;
  dispose: () => void;
}

const DEFAULT_DEBOUNCE_MS = 2_500;

/**
 * Decide QUANDO tentar esvaziar a outbox. Sem dependência de React Native para
 * permitir teste unitário puro; o wiring com NetInfo/AppState fica em autoSync.ts.
 */
export function createAutoSyncController(deps: AutoSyncDeps): AutoSyncController {
  const debounceMs = deps.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let disposed = false;

  const run = async (): Promise<void> => {
    if (running || disposed || !deps.isAccountMode()) return;
    running = true;
    try {
      if ((await deps.pendingCount()) > 0) await deps.flush();
    } catch {
      // Falha de rede: as operações continuam na fila para a próxima janela.
    } finally {
      running = false;
    }
  };

  return {
    signal: () => {
      if (disposed) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void run();
      }, debounceMs);
    },
    dispose: () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}

/** Considera restaurada uma conexão sem veredito negativo de alcance. */
export function connectionRestored(state: {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}
