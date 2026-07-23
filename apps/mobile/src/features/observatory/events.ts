export type ObservatoryEvent =
  | 'PLAYER_MOVED'
  | 'PLAYER_REACHED_TARGET'
  | 'INTERACTION_STARTED'
  | 'INTERACTION_COMPLETED'
  | 'ADARI_FOLLOW_STARTED'
  | 'ADARI_REST_STARTED'
  | 'ADARI_FED'
  | 'ADARI_PETTED'
  | 'BOND_CHANGED'
  | 'SATIETY_CHANGED'
  | 'VIGOR_CHANGED'
  | 'PORTAL_ENTERED'
  | 'WEEKLY_GOAL_COMPLETED';

type Listener = (payload?: unknown) => void;

/** Barramento local à cena; não atravessa persistência nem sincronização. */
export class ObservatoryEventBus {
  private readonly listeners = new Map<ObservatoryEvent, Set<Listener>>();

  on(event: ObservatoryEvent, listener: Listener): () => void {
    const set = this.listeners.get(event) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(event, set);
    return () => set.delete(listener);
  }

  emit(event: ObservatoryEvent, payload?: unknown): void {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }

  clear(): void {
    this.listeners.clear();
  }
}

