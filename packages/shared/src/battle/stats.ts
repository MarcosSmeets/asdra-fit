import type { AttributeSet } from '../types';
import type { BattleStats } from './types';

/**
 * Deriva os stats de batalha (v2) a partir dos atributos da criatura.
 * Determinístico e puro. Sem energia de combate — o Vigor governa a ENTRADA e as
 * recargas governam o ritmo. A Vida de batalha reseta a cada batalha.
 */
export function toBattleStats(attrs: AttributeSet): BattleStats {
  return {
    maxHealth: Math.max(1, Math.round(attrs.health + attrs.endurance * 2)),
    attack: Math.max(1, Math.round(attrs.strength * 1.2 + attrs.spirit * 0.3)),
    defense: Math.max(0, Math.round(attrs.endurance * 0.8 + attrs.discipline * 0.4)),
    speed: Math.max(1, Math.round(attrs.agility * 1 + attrs.spirit * 0.2)),
  };
}
