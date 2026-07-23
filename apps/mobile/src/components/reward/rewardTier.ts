export type RewardTier = 'full' | 'reduced' | 'none';

/** Classifica a recompensa pela política diária (100% / 25% / 0%). */
export function rewardTier(multiplier: number): RewardTier {
  if (multiplier >= 1) {
    return 'full';
  }
  if (multiplier > 0) {
    return 'reduced';
  }
  return 'none';
}

export const REWARD_TIER_LABEL: Record<RewardTier, string> = {
  full: 'Recompensa completa',
  reduced: 'Recompensa extra — 25%',
  none: 'Sem recompensa adicional',
};
