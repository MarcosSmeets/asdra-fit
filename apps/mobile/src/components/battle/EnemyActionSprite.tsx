import React, { useEffect, useMemo, useState } from 'react';
import type { BattleActionPhase } from '../../features/battle/actionSequence';
import { AtlasFrame } from '../sprites/AtlasFrame';
import { enemyAtlasRow } from './enemySpriteCatalog';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ENEMY_ACTION_ATLAS = require('../../../assets/enemies/sheets/enemy-action-atlas-v2.png');

export function EnemyActionSprite({ regionKey, isBoss, size, phase, isAttacking, isTakingDamage,
  reduceMotion, accessibilityLabel, fallback }: { regionKey: string; isBoss: boolean; size: number;
  phase: BattleActionPhase; isAttacking: boolean; isTakingDamage: boolean; reduceMotion: boolean;
  accessibilityLabel: string; fallback?: React.ReactNode }): React.ReactElement {
  const sequence = useMemo<readonly number[]>(() => {
    if (isTakingDamage && (phase === 'impact' || phase === 'targetReaction')) return [0, 3, 3, 0];
    if (isAttacking && ['preparing', 'advancing', 'attacking', 'impact'].includes(phase)) return [0, 2, 2, 0];
    return [0, 1, 0, 1];
  }, [isAttacking, isTakingDamage, phase]);
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    setFrame(0);
    if (reduceMotion || sequence.length < 2) return undefined;
    const interval = setInterval(() => setFrame((value) => (value + 1) % sequence.length),
      isAttacking || isTakingDamage ? 150 : 640);
    return () => clearInterval(interval);
  }, [isAttacking, isTakingDamage, reduceMotion, sequence]);
  return <AtlasFrame source={ENEMY_ACTION_ATLAS} columns={4} rows={6}
    column={sequence[frame] ?? 0} row={enemyAtlasRow(regionKey, isBoss)} size={size}
    atlasAspectRatio={1} accessibilityLabel={accessibilityLabel} onErrorFallback={fallback} />;
}
