import { XP } from './constants';

/**
 * XP necessário para avançar do nível `level` para `level + 1`.
 * Curva documentada: floor(BASE * level^EXPONENT).
 */
export function xpToNextLevel(level: number): number {
  if (level < 1) {
    throw new Error('xpToNextLevel: nível deve ser >= 1');
  }
  if (level >= XP.MAX_LEVEL) {
    return Infinity;
  }
  return Math.floor(XP.BASE * Math.pow(level, XP.EXPONENT));
}

/** XP acumulado total necessário para alcançar o início de `level`. */
export function totalXpForLevel(level: number): number {
  if (level < 1) {
    throw new Error('totalXpForLevel: nível deve ser >= 1');
  }
  let total = 0;
  for (let l = 1; l < level; l += 1) {
    total += xpToNextLevel(l);
  }
  return total;
}

export interface LevelProgress {
  level: number;
  /** XP já acumulado dentro do nível atual. */
  xpIntoLevel: number;
  /** XP total necessário para completar o nível atual (Infinity no nível máximo). */
  xpForLevel: number;
  /** Fração [0, 1] de progresso dentro do nível atual. */
  progress: number;
}

/** Deriva nível e progresso a partir do XP total acumulado. */
export function levelFromTotalXp(totalXp: number): LevelProgress {
  if (totalXp < 0) {
    throw new Error('levelFromTotalXp: XP total não pode ser negativo');
  }
  let level = 1;
  let remaining = Math.floor(totalXp);

  while (level < XP.MAX_LEVEL) {
    const needed = xpToNextLevel(level);
    if (remaining < needed) {
      break;
    }
    remaining -= needed;
    level += 1;
  }

  const xpForLevel = xpToNextLevel(level);
  const progress = Number.isFinite(xpForLevel) && xpForLevel > 0 ? remaining / xpForLevel : 1;

  return { level, xpIntoLevel: remaining, xpForLevel, progress };
}

/**
 * Aplica um ganho de XP ao total e reporta se houve subida de nível.
 */
export function applyXpGain(
  currentTotalXp: number,
  gainedXp: number,
): { totalXp: number; before: LevelProgress; after: LevelProgress; leveledUp: boolean } {
  const before = levelFromTotalXp(currentTotalXp);
  const totalXp = Math.max(0, Math.floor(currentTotalXp + gainedXp));
  const after = levelFromTotalXp(totalXp);
  return { totalXp, before, after, leveledUp: after.level > before.level };
}
