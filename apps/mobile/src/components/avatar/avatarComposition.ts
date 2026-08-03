import {
  normalizePlayerAvatarAppearance,
  type PlayerAvatarAppearance,
} from '@ad-sidera/shared';
import {
  ACCESSORY_GEOMETRY,
  AVATAR_ART_LAYERS,
  BODY_GEOMETRY,
  FACE_GEOMETRY,
  HAIR_GEOMETRY,
  OUTFIT_GEOMETRY,
  SHADOW_GEOMETRY,
  type AccessoryGeometry,
  type BodyGeometry,
  type FaceGeometry,
  type HairGeometry,
  type OutfitGeometry,
  type Run,
} from './avatarArt';

/**
 * Composição modular do Explorador (Build 6). Cada camada resolve a PRÓPRIA
 * geometria e a PRÓPRIA paleta; trocar uma escolha nunca redesenha as outras.
 */

export const AVATAR_LAYER_ORDER = AVATAR_ART_LAYERS;

/** Três tons por material — a base do visual 32-bit (sombra, base, luz). */
export interface ToneRamp {
  shadow: string;
  base: string;
  light: string;
}

const SKIN_COLORS: Record<PlayerAvatarAppearance['skinToneKey'], ToneRamp> = {
  luminous: { shadow: '#C99278', base: '#F4CFB5', light: '#FFE9D6' },
  warm: { shadow: '#A7654E', base: '#D69A72', light: '#EDBE99' },
  brown: { shadow: '#6E4034', base: '#9B644B', light: '#C48768' },
  deep: { shadow: '#3D2527', base: '#603C35', light: '#8A5949' },
};

const HAIR_COLORS: Record<PlayerAvatarAppearance['hairColorKey'], ToneRamp> = {
  midnight: { shadow: '#081321', base: '#15243C', light: '#304668' },
  auburn: { shadow: '#4D241F', base: '#7F3D2F', light: '#B66745' },
  golden: { shadow: '#79562F', base: '#C89745', light: '#F2CB72' },
  silver: { shadow: '#687789', base: '#B8C2CF', light: '#EDF3F7' },
};

export interface OutfitPalette {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
}

const OUTFITS: Record<PlayerAvatarAppearance['outfitKey'], OutfitPalette> = {
  astral: { primary: '#22496B', secondary: '#0B263E', accent: '#E4BC65', glow: '#59DDE8' },
  mist: { primary: '#4B817D', secondary: '#234D50', accent: '#D9E9D8', glow: '#8FE6D2' },
  constellation: { primary: '#4A5599', secondary: '#222B58', accent: '#F0D58A', glow: '#A98BF5' },
};

const ACCESSORY_COLORS: Record<'visor' | 'starpin' | 'scarf', { base: string; accent: string }> = {
  visor: { base: '#1E4E5C', accent: '#59DDE8' },
  starpin: { base: '#79562F', accent: '#F2CB72' },
  scarf: { base: '#3B2F6B', accent: '#8F7BE8' },
};

/** Contorno seletivo: escuro azulado, aplicado só na silhueta e cortes fortes. */
export const AVATAR_OUTLINE = '#0A1220';
/** Traço do rosto — mais claro que o contorno, para não pesar a expressão. */
export const AVATAR_FACE_INK = '#1B2740';
/** Luz especular comum (ombro, topo da cabeça). */
export const AVATAR_SPECULAR = '#F8F3E7';
/** Sombra projetada no chão. */
export const AVATAR_GROUND_SHADOW = 'rgba(5, 8, 23, 0.45)';

export interface AvatarComposition {
  appearance: PlayerAvatarAppearance;
  layerOrder: typeof AVATAR_LAYER_ORDER;
  parts: {
    body: {
      model: PlayerAvatarAppearance['bodyModel'];
      geometry: BodyGeometry;
      colors: ToneRamp;
    };
    hairBack: {
      styleKey: PlayerAvatarAppearance['hairStyleKey'];
      colorKey: PlayerAvatarAppearance['hairColorKey'];
      geometry: HairGeometry;
      colors: ToneRamp;
    };
    hairFront: {
      styleKey: PlayerAvatarAppearance['hairStyleKey'];
      colorKey: PlayerAvatarAppearance['hairColorKey'];
      geometry: HairGeometry;
      colors: ToneRamp;
    };
    outfit: {
      key: PlayerAvatarAppearance['outfitKey'];
      geometry: OutfitGeometry;
      colors: OutfitPalette;
    };
    face: { geometry: FaceGeometry };
    shadow: { geometry: readonly Run[] };
    /** null quando o acessório é 'none'. */
    accessory: {
      key: 'visor' | 'starpin' | 'scarf';
      geometry: AccessoryGeometry;
      colors: { base: string; accent: string };
    } | null;
  };
}

export function updateAvatarAppearance(
  current: PlayerAvatarAppearance,
  patch: Partial<PlayerAvatarAppearance>,
): PlayerAvatarAppearance {
  return normalizePlayerAvatarAppearance({ ...current, ...patch });
}

export function resolveAvatarComposition(value: unknown): AvatarComposition {
  const appearance = normalizePlayerAvatarAppearance(value);
  const hairColors = HAIR_COLORS[appearance.hairColorKey];
  const hairGeometry = HAIR_GEOMETRY[appearance.hairStyleKey];
  const hair = {
    styleKey: appearance.hairStyleKey,
    colorKey: appearance.hairColorKey,
    geometry: hairGeometry,
    colors: hairColors,
  };
  const accessoryKey = appearance.accessoryKey ?? 'none';
  return {
    appearance,
    layerOrder: AVATAR_LAYER_ORDER,
    parts: {
      body: {
        model: appearance.bodyModel,
        geometry: BODY_GEOMETRY[appearance.bodyModel],
        colors: SKIN_COLORS[appearance.skinToneKey],
      },
      hairBack: hair,
      hairFront: hair,
      outfit: {
        key: appearance.outfitKey,
        geometry: OUTFIT_GEOMETRY[appearance.outfitKey],
        colors: OUTFITS[appearance.outfitKey],
      },
      face: { geometry: FACE_GEOMETRY },
      shadow: { geometry: SHADOW_GEOMETRY },
      accessory: accessoryKey === 'none'
        ? null
        : {
            key: accessoryKey,
            geometry: ACCESSORY_GEOMETRY[accessoryKey],
            colors: ACCESSORY_COLORS[accessoryKey],
          },
    },
  };
}
