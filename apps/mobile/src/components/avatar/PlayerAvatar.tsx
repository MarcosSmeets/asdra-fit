import type { PlayerAvatarAppearance } from '@ad-sidera/shared';
import React from 'react';
import { View } from 'react-native';
import Svg, { G, Rect } from 'react-native-svg';
import { AVATAR_ART, AVATAR_RESOLUTIONS, type AvatarVariant, type Run } from './avatarArt';
import {
  AVATAR_FACE_INK,
  AVATAR_GROUND_SHADOW,
  AVATAR_OUTLINE,
  AVATAR_SPECULAR,
  resolveAvatarComposition,
} from './avatarComposition';

/** Desenha um conjunto de runs em uma cor (um <G> por camada de cor). */
function Pixels({ runs, color, opacity }: {
  runs: readonly Run[];
  color: string;
  opacity?: number;
}): React.ReactElement {
  return (
    <G fill={color} opacity={opacity}>
      {runs.map(([x, y, width, height], index) => (
        <Rect key={`${x}-${y}-${index}`} x={x} y={y} width={width} height={height} />
      ))}
    </G>
  );
}

export interface PlayerAvatarProps {
  appearance: PlayerAvatarAppearance;
  /** Altura renderizada; a largura segue a proporção 64×80 da grade. */
  height?: number;
  /** Contexto de uso — define a resolução canônica (mapa/retrato/editor). */
  variant?: AvatarVariant;
  testID?: string;
}

/**
 * Explorador em pixel art 32-bit, composto em camadas independentes sobre a
 * grade 64×80 (contrato em `avatarArt.ts`). Cada material tem três tons
 * (sombra/base/luz), o contorno é seletivo e a sombra do chão é camada própria.
 *
 * Trocar pele, cabelo, roupa ou acessório afeta SOMENTE aquela camada.
 */
export function PlayerAvatar({
  appearance,
  height,
  variant = 'map',
  testID,
}: PlayerAvatarProps): React.ReactElement {
  const { parts, appearance: resolved } = resolveAvatarComposition(appearance);
  const resolution = AVATAR_RESOLUTIONS[variant];
  const renderedHeight = height ?? resolution.height;
  const renderedWidth = Math.round(
    renderedHeight * (AVATAR_ART.GRID_WIDTH / AVATAR_ART.GRID_HEIGHT),
  );
  const feminine = parts.body.model === 'feminine';

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        `Explorador em pixel art, modelo ${feminine ? 'feminino' : 'masculino'}, `
        + `pele ${resolved.skinToneKey}, cabelo ${resolved.hairStyleKey} ${resolved.hairColorKey}, `
        + `roupa ${resolved.outfitKey}${parts.accessory ? `, acessório ${parts.accessory.key}` : ''}`
      }
      style={{ width: renderedWidth, height: renderedHeight }}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${AVATAR_ART.GRID_WIDTH} ${AVATAR_ART.GRID_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* shadow — camada própria, nunca colada ao corpo */}
        <Pixels runs={parts.shadow.geometry} color={AVATAR_GROUND_SHADOW} />

        {/* hairBack — massa atrás da cabeça */}
        <Pixels runs={parts.hairBack.geometry.back} color={parts.hairBack.colors.shadow} />

        {/* body — contorno seletivo + massa sob a roupa */}
        <Pixels runs={parts.body.geometry.outline} color={AVATAR_OUTLINE} />
        <Pixels runs={parts.body.geometry.body} color={parts.body.colors.shadow} />

        {/* skin — pele exposta com sombra e luz */}
        <Pixels runs={parts.body.geometry.skin} color={parts.body.colors.base} />
        <Pixels runs={parts.body.geometry.skinShadow} color={parts.body.colors.shadow} opacity={0.55} />
        <Pixels runs={parts.body.geometry.skinLight} color={parts.body.colors.light} />

        {/* outfit — traje astral: tecido, recortes, circuitos e energia */}
        <Pixels runs={parts.outfit.geometry.primary} color={parts.outfit.colors.primary} />
        <Pixels runs={parts.outfit.geometry.secondary} color={parts.outfit.colors.secondary} />
        <Pixels runs={parts.outfit.geometry.accent} color={parts.outfit.colors.accent} />
        <Pixels runs={parts.outfit.geometry.glow} color={parts.outfit.colors.glow} />

        {/* face — olhos, sobrancelha e boca legíveis */}
        <Pixels runs={parts.face.geometry.ink} color={AVATAR_FACE_INK} />
        <Pixels runs={parts.face.geometry.spark} color={AVATAR_SPECULAR} />

        {/* hairFront — franja e mechas sobre o rosto */}
        <Pixels runs={parts.hairFront.geometry.front} color={parts.hairFront.colors.base} />
        <Pixels runs={parts.hairFront.geometry.highlight} color={parts.hairFront.colors.light} />

        {/* accessory — camada opcional independente */}
        {parts.accessory ? (
          <>
            <Pixels runs={parts.accessory.geometry.base} color={parts.accessory.colors.base} />
            <Pixels runs={parts.accessory.geometry.accent} color={parts.accessory.colors.accent} />
          </>
        ) : null}

        {/* highlights — luz especular final (topo da cabeça e ombro) */}
        <Pixels runs={[[24, 9, 6, 1]]} color={AVATAR_SPECULAR} opacity={0.35} />
      </Svg>
    </View>
  );
}
