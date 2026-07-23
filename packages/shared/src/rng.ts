/**
 * PRNG determinístico (mulberry32). Aceita seed → batalhas e cálculos
 * probabilísticos são reproduzíveis nos testes.
 */
export interface Rng {
  /** Próximo float em [0, 1). */
  next(): number;
  /** Inteiro em [min, max] inclusivo. */
  int(min: number, max: number): number;
  /** Float em [min, max). */
  float(min: number, max: number): number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    int(min: number, max: number): number {
      if (max < min) {
        throw new Error('rng.int: max deve ser >= min');
      }
      return min + Math.floor(next() * (max - min + 1));
    },
    float(min: number, max: number): number {
      return min + next() * (max - min);
    },
  };
}
