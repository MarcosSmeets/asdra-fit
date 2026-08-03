import React, { useEffect, useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import type { AdariVisualState } from '../../features/my-adari/state';
import { resolveAdariManifest, resolveVisualState } from '../../content/adari';
import { AtlasFrame } from '../sprites/AtlasFrame';
import { adariSpriteSequence, safeAdariAtlasColumn } from './adariActionSpriteFrames';

export { adariSpriteSequence } from './adariActionSpriteFrames';

export interface AdariActionSpriteProps {
  creatureKey: string;
  state: AdariVisualState;
  size: number;
  /** Estágio evolutivo persistido (0..3). Ausente: deriva de `evolved`. */
  stage?: number;
  /** @deprecated Compat Build 4 (evoluído = EV 1). Prefira `stage`. */
  evolved?: boolean;
  /** Pose fixa (coluna do atlas). Ignora a sequência do estado — usado em retratos. */
  frame?: number;
  reduceMotion?: boolean;
  accessibilityLabel?: string;
}

export function AdariActionSprite({ creatureKey, state, size, stage,
  evolved = false, frame, reduceMotion = false, accessibilityLabel }: AdariActionSpriteProps): React.ReactElement {
  const stageInt = stage ?? (evolved ? 1 : 0);
  const manifest = useMemo(() => resolveAdariManifest(creatureKey, stageInt), [creatureKey, stageInt]);
  const resolvedState = resolveVisualState(manifest, state);
  const sequence = useMemo(() => adariSpriteSequence(resolvedState), [resolvedState]);
  const [index, setIndex] = useState(0);
  const still = reduceMotion || frame !== undefined;
  useEffect(() => {
    setIndex(0);
    if (still || sequence.length < 2) return undefined;
    const interval = setInterval(() => setIndex((value) => (value + 1) % sequence.length),
      resolvedState === 'idle' || resolvedState === 'sleeping' ? 620 : 180);
    return () => clearInterval(interval);
  }, [still, sequence, resolvedState]);
  const rawColumn = frame ?? sequence[index] ?? sequence[0] ?? 0;
  const column = manifest.atlas.applyLegacyColumnSafety
    ? safeAdariAtlasColumn(creatureKey, rawColumn)
    : rawColumn;
  // Fallback é a silhueta do próprio estágio: o lineup legado tinha fundo chroma.
  // Sem placa nem aura atrás do sprite: iluminação é camada da CENA
  // (EnvironmentalGlow). Aqui só sai o recorte transparente do atlas.
  return (
    <View style={{ width: size, height: size }}>
      <AtlasFrame source={manifest.atlas.source} columns={manifest.atlas.columns} rows={manifest.atlas.rows}
        column={column} row={manifest.atlas.row} size={size} atlasAspectRatio={manifest.atlas.aspectRatio}
        accessibilityLabel={accessibilityLabel}
        onErrorFallback={<Image source={manifest.silhouette} style={{ width: size, height: size }}
          resizeMode="contain" accessibilityLabel={accessibilityLabel ?? 'Adari'} />} />
    </View>
  );
}
