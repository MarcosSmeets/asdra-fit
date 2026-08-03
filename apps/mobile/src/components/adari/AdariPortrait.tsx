import { displayNameForStage, getCreatureByKey } from '@ad-sidera/shared';
import React from 'react';
import { BRAND } from '../../constants/brand';
import { AdariActionSprite } from './AdariActionSprite';

export type AdariMood = 'normal' | 'happy' | 'resting' | 'ready';

/** Pose fixa do retrato por humor (colunas do atlas de ações). */
const MOOD_FRAME: Readonly<Record<AdariMood, number>> = {
  normal: 0,
  happy: 2,
  resting: 4,
  ready: 5,
};

export interface AdariPortraitProps {
  creatureKey: string;
  size?: number;
  mood?: AdariMood;
  /** Estágio evolutivo persistido (0..3). Ausente: deriva de `evolved`. */
  stage?: number;
  /** @deprecated Compat Build 4 (evoluído = EV 1). Prefira `stage`. */
  evolved?: boolean;
  accessibilityLabel?: string;
}

/**
 * Retrato parado do Adari. Usa o MESMO atlas de ações das cenas (via manifest do
 * estágio), então o companheiro é idêntico em onboarding, jornada, perfil e home
 * — antes daqui saía o lineup legado, que tinha fundo chroma e proporção errada.
 */
export function AdariPortrait({
  creatureKey,
  size = 128,
  mood = 'normal',
  stage,
  evolved = false,
  accessibilityLabel,
}: AdariPortraitProps): React.ReactElement {
  const stageInt = stage ?? (evolved ? 1 : 0);
  const definition = getCreatureByKey(creatureKey);
  const label = accessibilityLabel
    ?? `${displayNameForStage(creatureKey, stageInt)}, ${definition?.visualDescription ?? BRAND.companionSingular}`;
  return (
    <AdariActionSprite
      creatureKey={creatureKey}
      state="idle"
      frame={MOOD_FRAME[mood]}
      size={size}
      stage={stageInt}
      accessibilityLabel={label}
    />
  );
}
