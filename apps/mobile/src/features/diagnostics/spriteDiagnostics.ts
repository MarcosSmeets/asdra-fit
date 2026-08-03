/**
 * Registro em memória das falhas de carregamento de sprite.
 *
 * Existe porque o `onError` do `<Image>` era descartado: sem o `nativeEvent.error`
 * não há como distinguir "o Metro não serviu o asset" de "o Android não conseguiu
 * decodificar o bitmap" — e as duas causas pedem correções opostas.
 *
 * Fica só em memória de propósito. O `analyticsService` é opt-in e desligado por
 * padrão, o que o torna inútil para investigação aguda.
 */

export interface SpriteFailure {
  at: number;
  sourceKey: string;
  uri?: string;
  error?: string;
  tag?: string;
  size?: number;
  columns?: number;
  rows?: number;
  attempt: number;
}

const MAX_ENTRIES = 50;
const failures: SpriteFailure[] = [];
let recoveries = 0;

export function recordSpriteFailure(entry: Omit<SpriteFailure, 'at'>): void {
  failures.push({ ...entry, at: Date.now() });
  if (failures.length > MAX_ENTRIES) failures.shift();
  if (__DEV__) {
    // Aparece no log do Metro, que é o canal mais barato quando o app roda por túnel.
    console.warn(
      `[sprite] falhou ${entry.tag ?? entry.sourceKey} (tentativa ${entry.attempt})` +
        `${entry.error ? ` — ${entry.error}` : ''}${entry.uri ? ` — ${entry.uri}` : ''}`,
    );
  }
}

export function recordSpriteRecovery(sourceKey: string, attempt: number): void {
  recoveries += 1;
  if (__DEV__) console.warn(`[sprite] recuperou ${sourceKey} na tentativa ${attempt}`);
}

export function readSpriteDiagnostics(): { failures: SpriteFailure[]; recoveries: number } {
  return { failures: [...failures], recoveries };
}

export function clearSpriteDiagnostics(): void {
  failures.length = 0;
  recoveries = 0;
}
