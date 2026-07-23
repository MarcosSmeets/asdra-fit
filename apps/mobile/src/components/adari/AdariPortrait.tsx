import { getCreatureByKey } from '@ad-sidera/shared';
import React from 'react';
import { BRAND } from '../../constants/brand';
import { CharacterSprite, type CharacterSpriteMood } from '../characters/CharacterSprite';

export type AdariMood = CharacterSpriteMood;

export interface AdariPortraitProps {
  creatureKey: string;
  size?: number;
  mood?: AdariMood;
  evolved?: boolean;
  accessibilityLabel?: string;
}

/** Retrato bitmap original e coerente com a perspectiva do Observatório. */
export function AdariPortrait({
  creatureKey,
  size = 128,
  mood = 'normal',
  evolved = false,
  accessibilityLabel,
}: AdariPortraitProps): React.ReactElement {
  const definition = getCreatureByKey(creatureKey);
  const kind = creatureKey === 'terravok' || creatureKey === 'lumora' ? creatureKey : 'solivar';
  return (
    <CharacterSprite
      kind={kind}
      size={size}
      mood={mood}
      evolved={evolved}
      accessibilityLabel={accessibilityLabel ?? `${definition?.name ?? BRAND.companionSingular}, ${definition?.visualDescription ?? BRAND.companionSingular}`}
    />
  );
}
