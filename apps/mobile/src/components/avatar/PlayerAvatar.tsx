import type { PlayerAvatarAppearance } from '@ad-sidera/shared';
import React from 'react';
import { View } from 'react-native';
import Svg, { G, Rect } from 'react-native-svg';
import { resolveAvatarComposition } from './avatarComposition';

const OUTLINE = '#071521';
type Run = readonly [x: number, y: number, width: number, height: number];

function Pixels({ runs, color }: { runs: readonly Run[]; color: string }): React.ReactElement {
  return <G fill={color}>{runs.map(([x, y, width, height], index) =>
    <Rect key={`${x}-${y}-${index}`} x={x} y={y} width={width} height={height} />)}</G>;
}

const HEAD_OUTLINE: readonly Run[] = [[11, 4, 10, 2], [9, 6, 14, 11], [10, 17, 12, 4], [8, 9, 2, 6], [22, 9, 2, 6]];
const HEAD: readonly Run[] = [[12, 5, 8, 1], [10, 7, 12, 10], [11, 17, 10, 3], [9, 10, 1, 4], [22, 10, 1, 4]];

function PixelHair({ styleKey, colors, layer }: ReturnType<typeof resolveAvatarComposition>['parts']['hairFront'] & { layer: 'back' | 'front' }): React.ReactElement {
  const back: readonly Run[] = styleKey === 'curly'
    ? [[8, 5, 4, 5], [11, 2, 5, 5], [15, 1, 6, 6], [20, 3, 5, 7], [7, 9, 3, 8], [22, 9, 3, 9]]
    : styleKey === 'swept'
      ? [[8, 5, 4, 13], [10, 2, 12, 5], [20, 4, 5, 16], [23, 16, 3, 7]]
      : [[8, 5, 4, 12], [10, 2, 12, 6], [20, 5, 4, 11]];
  const front: readonly Run[] = styleKey === 'curly'
    ? [[9, 5, 5, 4], [13, 3, 5, 5], [17, 3, 5, 5], [20, 6, 4, 5], [10, 8, 3, 3], [16, 7, 3, 3]]
    : styleKey === 'swept'
      ? [[9, 4, 13, 4], [12, 7, 10, 3], [18, 9, 5, 3]]
      : [[9, 4, 14, 5], [10, 8, 4, 3], [16, 8, 3, 2], [21, 8, 2, 4]];
  if (layer === 'back') {
    return <><Pixels runs={back} color={OUTLINE} /><Pixels runs={back.map(([x, y, w, h]) =>
      [x + 1, y + 1, Math.max(1, w - 2), Math.max(1, h - 1)] as Run)} color={colors.shadow} /></>;
  }
  return <><Pixels runs={front} color={colors.base} /><Pixels runs={[[12, 4, 5, 1]]} color={colors.light} /></>;
}

/**
 * Explorador modular em pixel art. As cinco escolhas continuam independentes;
 * a troca de pele, cabelo ou roupa nunca substitui o personagem inteiro.
 */
export function PlayerAvatar({ appearance, height = 160, testID }: {
  appearance: PlayerAvatarAppearance; height?: number; testID?: string;
}): React.ReactElement {
  const { parts } = resolveAvatarComposition(appearance);
  const feminine = parts.body.model === 'feminine';
  const width = Math.round(height * (32 / 48));
  const torsoOutline: readonly Run[] = feminine
    ? [[9, 20, 14, 2], [8, 22, 16, 14], [6, 24, 4, 14], [22, 24, 4, 14]]
    : [[8, 20, 16, 2], [7, 22, 18, 14], [5, 24, 4, 14], [23, 24, 4, 14]];
  const torso: readonly Run[] = feminine
    ? [[10, 21, 12, 2], [9, 23, 14, 12], [7, 25, 2, 11], [23, 25, 2, 11]]
    : [[9, 21, 14, 2], [8, 23, 16, 12], [6, 25, 2, 11], [24, 25, 2, 11]];
  return (
    <View testID={testID} accessible accessibilityRole="image"
      accessibilityLabel={`Explorador em pixel art, modelo ${feminine ? 'feminino' : 'masculino'}, pele ${appearance.skinToneKey}, cabelo ${appearance.hairStyleKey} ${appearance.hairColorKey}, roupa ${appearance.outfitKey}`}
      style={{ width, height }}>
      <Svg width="100%" height="100%" viewBox="0 0 32 48" preserveAspectRatio="xMidYMid meet">
        <Pixels runs={[[6, 45, 20, 2], [9, 44, 14, 1]]} color="rgba(3,10,18,0.42)" />
        <PixelHair {...parts.hairBack} layer="back" />
        <Pixels runs={HEAD_OUTLINE} color={OUTLINE} />
        <Pixels runs={HEAD} color={parts.body.colors.base} />
        <Pixels runs={[[11, 7, 3, 2], [10, 10, 1, 5]]} color={parts.body.colors.light} />
        <Pixels runs={[[14, 19, 4, 4], [7, 36, 3, 4], [22, 36, 3, 4]]} color={parts.body.colors.base} />
        <Pixels runs={torsoOutline} color={OUTLINE} />
        <Pixels runs={torso} color={parts.outfit.colors.primary} />
        <Pixels runs={[[10, 24, 12, 2], [12, 26, 8, 9]]} color={parts.outfit.colors.secondary} />
        <Pixels runs={[[15, 25, 2, 8], [10, 34, 12, 2]]} color={parts.outfit.colors.accent} />
        <Pixels runs={[[8, 35, 7, 10], [17, 35, 7, 10]]} color={OUTLINE} />
        <Pixels runs={[[9, 36, 5, 8], [18, 36, 5, 8]]} color={parts.outfit.colors.secondary} />
        <Pixels runs={[[7, 43, 8, 3], [17, 43, 9, 3]]} color="#10283B" />
        <Pixels runs={[[13, 12, 2, 2], [18, 12, 2, 2], [15, 17, 3, 1]]} color={OUTLINE} />
        <Pixels runs={[[13, 12, 1, 1], [18, 12, 1, 1]]} color="#F8F3E7" />
        <PixelHair {...parts.hairFront} layer="front" />
      </Svg>
    </View>
  );
}
