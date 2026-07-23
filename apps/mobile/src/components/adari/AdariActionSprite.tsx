import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import type { AdariVisualState } from '../../features/my-adari/state';
import { AtlasFrame } from '../sprites/AtlasFrame';
import { CharacterSprite } from '../characters/CharacterSprite';
import { safeAdariAtlasColumn } from './adariActionSpriteFrames';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ADARI_ACTION_ATLAS = require('../../../assets/adaris/sheets/adari-action-atlas-v2.png');

const ROW_BY_CREATURE: Record<string, number> = { terravok: 0, lumora: 1, solivar: 2 };
const SEQUENCES: Record<AdariVisualState, readonly number[]> = {
  idle: [0, 1, 0, 1], happy: [0, 2, 2, 1], curious: [0, 1, 2, 1],
  receivingAffection: [0, 2, 2, 1], eating: [0, 3, 3, 1], refusingFood: [3, 0, 1],
  talkingReaction: [0, 1, 2, 1], resting: [0, 4, 4], sleeping: [4], wakingUp: [4, 0, 1],
  tired: [4, 0], excitedAfterActivity: [0, 2, 1, 2], askingForWalk: [0, 1, 5, 1],
  battleReady: [5, 0, 5, 1], attacking: [5, 6, 6, 5], defending: [0, 5, 5],
  takingDamage: [5, 7, 5], victory: [5, 2, 2, 1], defeat: [7, 4],
};

export function adariSpriteSequence(state: AdariVisualState): readonly number[] {
  return SEQUENCES[state] ?? SEQUENCES.idle;
}

export function AdariActionSprite({ creatureKey, state, size, evolved = false,
  reduceMotion = false, accessibilityLabel }: { creatureKey: string; state: AdariVisualState;
  size: number; evolved?: boolean; reduceMotion?: boolean; accessibilityLabel?: string }): React.ReactElement {
  const sequence = useMemo(() => adariSpriteSequence(state), [state]);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
    if (reduceMotion || sequence.length < 2) return undefined;
    const interval = setInterval(() => setIndex((value) => (value + 1) % sequence.length),
      state === 'idle' || state === 'sleeping' ? 620 : 180);
    return () => clearInterval(interval);
  }, [reduceMotion, sequence, state]);
  const row = ROW_BY_CREATURE[creatureKey] ?? ROW_BY_CREATURE.solivar!;
  const fallbackKind = creatureKey === 'terravok' || creatureKey === 'lumora' ? creatureKey : 'solivar';
  return (
    <View style={{ width: size, height: size }}>
      {evolved ? <View style={{ position: 'absolute', inset: size * 0.08, borderRadius: 999,
        backgroundColor: 'rgba(232,192,112,0.18)' }} /> : null}
      <AtlasFrame source={ADARI_ACTION_ATLAS} columns={8} rows={3}
        column={safeAdariAtlasColumn(creatureKey, sequence[index] ?? sequence[0] ?? 0)}
        row={row} size={size} atlasAspectRatio={8 / 3}
        accessibilityLabel={accessibilityLabel}
        onErrorFallback={<CharacterSprite kind={fallbackKind} size={size}
          accessibilityLabel={accessibilityLabel ?? 'Adari'} />} />
    </View>
  );
}
