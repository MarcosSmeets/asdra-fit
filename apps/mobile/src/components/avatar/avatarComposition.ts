import {
  normalizePlayerAvatarAppearance,
  type PlayerAvatarAppearance,
} from '@ad-sidera/shared';

export const AVATAR_LAYER_ORDER = [
  'shadow', 'hairBack', 'body', 'outfit', 'face', 'hairFront', 'highlight',
] as const;

const SKIN_COLORS: Record<PlayerAvatarAppearance['skinToneKey'], { base: string; shadow: string; light: string }> = {
  luminous: { base: '#F4CFB5', shadow: '#C99278', light: '#FFE9D6' },
  warm: { base: '#D69A72', shadow: '#A7654E', light: '#EDBE99' },
  brown: { base: '#9B644B', shadow: '#6E4034', light: '#C48768' },
  deep: { base: '#603C35', shadow: '#3D2527', light: '#8A5949' },
};

const HAIR_COLORS: Record<PlayerAvatarAppearance['hairColorKey'], { base: string; shadow: string; light: string }> = {
  midnight: { base: '#15243C', shadow: '#081321', light: '#304668' },
  auburn: { base: '#7F3D2F', shadow: '#4D241F', light: '#B66745' },
  golden: { base: '#C89745', shadow: '#79562F', light: '#F2CB72' },
  silver: { base: '#B8C2CF', shadow: '#687789', light: '#EDF3F7' },
};

const OUTFITS: Record<PlayerAvatarAppearance['outfitKey'], { primary: string; secondary: string; accent: string }> = {
  astral: { primary: '#173C59', secondary: '#0B263E', accent: '#E4BC65' },
  mist: { primary: '#4B817D', secondary: '#234D50', accent: '#D9E9D8' },
  constellation: { primary: '#444D86', secondary: '#222B58', accent: '#F0D58A' },
};

export interface AvatarComposition {
  appearance: PlayerAvatarAppearance;
  layerOrder: typeof AVATAR_LAYER_ORDER;
  parts: {
    body: { model: PlayerAvatarAppearance['bodyModel']; colors: (typeof SKIN_COLORS)[PlayerAvatarAppearance['skinToneKey']] };
    hairBack: { styleKey: PlayerAvatarAppearance['hairStyleKey']; colorKey: PlayerAvatarAppearance['hairColorKey']; colors: (typeof HAIR_COLORS)[PlayerAvatarAppearance['hairColorKey']] };
    hairFront: { styleKey: PlayerAvatarAppearance['hairStyleKey']; colorKey: PlayerAvatarAppearance['hairColorKey']; colors: (typeof HAIR_COLORS)[PlayerAvatarAppearance['hairColorKey']] };
    outfit: { key: PlayerAvatarAppearance['outfitKey']; colors: (typeof OUTFITS)[PlayerAvatarAppearance['outfitKey']] };
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
  const hair = { styleKey: appearance.hairStyleKey, colorKey: appearance.hairColorKey, colors: HAIR_COLORS[appearance.hairColorKey] };
  return {
    appearance,
    layerOrder: AVATAR_LAYER_ORDER,
    parts: {
      body: { model: appearance.bodyModel, colors: SKIN_COLORS[appearance.skinToneKey] },
      hairBack: hair,
      hairFront: hair,
      outfit: { key: appearance.outfitKey, colors: OUTFITS[appearance.outfitKey] },
    },
  };
}
