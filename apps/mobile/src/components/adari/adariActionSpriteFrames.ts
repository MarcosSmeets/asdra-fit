import type { AdariVisualState } from '../../features/my-adari/state';

export const ADARI_ACTION_FRAME: Partial<Record<AdariVisualState, number>> = {
  receivingAffection: 2,
  eating: 3,
  resting: 4,
  battleReady: 5,
  attacking: 6,
  takingDamage: 7,
};

/**
 * Sequências de colunas do atlas de ações por estado visual. Semântica das
 * colunas (válida para o atlas v2 e para os placeholders por estágio):
 * 0 idle · 1 idle-alt · 2 carinho/feliz · 3 comendo · 4 descansando ·
 * 5 pronto p/ batalha · 6 atacando · 7 recebendo dano.
 */
/**
 * Estados CONTÍNUOS (repouso, sono, cansaço, prontidão) usam pose ÚNICA: voltar
 * ao frame 0 no meio do ciclo fazia o Adari alternar entre em pé e deitado, o
 * que lê como defeito. Só ações e transições percorrem vários frames.
 */
export const ADARI_SPRITE_SEQUENCES: Record<AdariVisualState, readonly number[]> = {
  idle: [0], blink: [0, 1, 0], breathing: [0, 0, 1, 1],
  happy: [0, 2, 2, 1], curious: [0, 1, 2, 1],
  receivingAffection: [0, 2, 2, 1], eating: [0, 3, 3, 1], refusingFood: [3, 0, 1],
  talkingReaction: [0, 1, 2, 1], resting: [4], sleeping: [4], wakingUp: [4, 0, 1],
  tired: [4], excitedAfterActivity: [0, 2, 1, 2], askingForWalk: [0, 1, 5, 1],
  battleReady: [5], attacking: [5, 6, 6, 5], defending: [0, 5, 5],
  takingDamage: [5, 7, 5], victory: [5, 2, 2, 1], defeat: [7, 4],
  evolving: [5, 2, 5, 2],
};

export function adariSpriteSequence(state: AdariVisualState): readonly number[] {
  return ADARI_SPRITE_SEQUENCES[state] ?? ADARI_SPRITE_SEQUENCES.idle;
}

/** Evita a célula de recuo v2 que não preservou a silhueta de Velune. */
export function safeAdariAtlasColumn(creatureKey: string, column: number): number {
  return creatureKey === 'lumora' && column === 7 ? 6 : column;
}
