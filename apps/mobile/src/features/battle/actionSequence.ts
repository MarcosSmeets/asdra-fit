import type { BattleStatus } from '@ad-sidera/shared';

export type BattleActionPhase =
  | 'idle'
  | 'preparing'
  | 'advancing'
  | 'attacking'
  | 'impact'
  | 'targetReaction'
  | 'returning'
  | 'victory'
  | 'defeat';

export const BATTLE_ACTION_SEQUENCE: readonly BattleActionPhase[] = [
  'preparing', 'advancing', 'attacking', 'impact', 'targetReaction', 'returning',
];

export function isBattleCommandLocked(phase: BattleActionPhase): boolean {
  return phase !== 'idle';
}

export function beginBattleAction(phase: BattleActionPhase): BattleActionPhase {
  return isBattleCommandLocked(phase) ? phase : 'preparing';
}

export function phaseAfterAction(status: BattleStatus): BattleActionPhase {
  return status === 'victory' ? 'victory' : status === 'defeat' ? 'defeat' : 'idle';
}

export const BATTLE_PHASE_LABEL: Record<BattleActionPhase, string> = {
  idle: 'Escolha sua ação', preparing: 'Preparando…', advancing: 'Avançando…',
  attacking: 'Atacando!', impact: 'Impacto', targetReaction: 'Reação ao golpe',
  returning: 'Retornando', victory: 'Vitória', defeat: 'Derrota',
};

