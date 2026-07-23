import {
  ADVERSARIES,
  REGIONS,
  getAdversariesByRegion,
  type AdversaryDefinition,
  type RegionDefinition,
} from '@ad-sidera/shared';

export interface AdversaryState {
  adversary: AdversaryDefinition;
  defeated: boolean;
  unlocked: boolean;
}

export interface RegionState {
  region: RegionDefinition;
  unlocked: boolean;
  adversaries: AdversaryState[];
}

export function isRegionUnlocked(region: RegionDefinition, defeated: ReadonlySet<string>): boolean {
  return region.unlockAfterBoss === null || defeated.has(region.unlockAfterBoss);
}

export function isAdversaryUnlocked(
  adversary: AdversaryDefinition,
  region: RegionDefinition,
  defeated: ReadonlySet<string>,
): boolean {
  if (!isRegionUnlocked(region, defeated)) {
    return false;
  }
  return adversary.unlockAfter === null || defeated.has(adversary.unlockAfter);
}

export function getCampaignState(defeatedIds: readonly string[]): RegionState[] {
  const defeated = new Set(defeatedIds);
  return [...REGIONS]
    .sort((a, b) => a.order - b.order)
    .map((region) => ({
      region,
      unlocked: isRegionUnlocked(region, defeated),
      adversaries: getAdversariesByRegion(region.key).map((adversary) => ({
        adversary,
        defeated: defeated.has(adversary.id),
        unlocked: isAdversaryUnlocked(adversary, region, defeated),
      })),
    }));
}

export function nextAvailableAdversary(defeatedIds: readonly string[]): AdversaryDefinition | null {
  const defeated = new Set(defeatedIds);
  for (const region of [...REGIONS].sort((a, b) => a.order - b.order)) {
    if (!isRegionUnlocked(region, defeated)) {
      continue;
    }
    for (const adversary of getAdversariesByRegion(region.key)) {
      if (!defeated.has(adversary.id) && isAdversaryUnlocked(adversary, region, defeated)) {
        return adversary;
      }
    }
  }
  return null;
}

export const TOTAL_ADVERSARIES = ADVERSARIES.length;
