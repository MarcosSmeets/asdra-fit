import type { AdariVisualState } from '../../features/my-adari/state';

export const ADARI_ACTION_FRAME: Partial<Record<AdariVisualState, number>> = {
  receivingAffection: 2,
  eating: 3,
  resting: 4,
  battleReady: 5,
  attacking: 6,
  takingDamage: 7,
};

/** Evita a cÃ©lula de recuo v2 que nÃ£o preservou a silhueta de Velune. */
export function safeAdariAtlasColumn(creatureKey: string, column: number): number {
  return creatureKey === 'lumora' && column === 7 ? 6 : column;
}
