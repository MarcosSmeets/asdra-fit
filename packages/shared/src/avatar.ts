export const PLAYER_AVATAR_BODY_MODELS = ['masculine', 'feminine'] as const;
export const PLAYER_AVATAR_SKIN_TONES = ['luminous', 'warm', 'brown', 'deep'] as const;
export const PLAYER_AVATAR_HAIR_STYLES = ['short', 'swept', 'curly'] as const;
export const PLAYER_AVATAR_HAIR_COLORS = ['midnight', 'auburn', 'golden', 'silver'] as const;
export const PLAYER_AVATAR_OUTFITS = ['astral', 'mist', 'constellation'] as const;
/** Acessório opcional (camada independente). 'none' = sem acessório. */
export const PLAYER_AVATAR_ACCESSORIES = ['none', 'visor', 'starpin', 'scarf'] as const;

export type PlayerAvatarBodyModel = (typeof PLAYER_AVATAR_BODY_MODELS)[number];
export type PlayerAvatarSkinTone = (typeof PLAYER_AVATAR_SKIN_TONES)[number];
export type PlayerAvatarHairStyle = (typeof PLAYER_AVATAR_HAIR_STYLES)[number];
export type PlayerAvatarHairColor = (typeof PLAYER_AVATAR_HAIR_COLORS)[number];
export type PlayerAvatarOutfit = (typeof PLAYER_AVATAR_OUTFITS)[number];
export type PlayerAvatarAccessory = (typeof PLAYER_AVATAR_ACCESSORIES)[number];

export interface PlayerAvatarAppearance {
  bodyModel: PlayerAvatarBodyModel;
  skinToneKey: PlayerAvatarSkinTone;
  hairStyleKey: PlayerAvatarHairStyle;
  hairColorKey: PlayerAvatarHairColor;
  outfitKey: PlayerAvatarOutfit;
  /** Opcional para compatibilidade com contas antigas (normalizado p/ 'none'). */
  accessoryKey?: PlayerAvatarAccessory;
}

export const DEFAULT_PLAYER_AVATAR_APPEARANCE: PlayerAvatarAppearance = {
  bodyModel: 'masculine',
  skinToneKey: 'warm',
  hairStyleKey: 'short',
  hairColorKey: 'midnight',
  outfitKey: 'astral',
  accessoryKey: 'none',
};

function memberOf<const T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value as T[number]);
}

/** Mantém contas antigas renderizáveis mesmo diante de payload parcial ou desconhecido. */
export function normalizePlayerAvatarAppearance(value: unknown): PlayerAvatarAppearance {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    bodyModel: memberOf(PLAYER_AVATAR_BODY_MODELS, input.bodyModel)
      ? input.bodyModel
      : DEFAULT_PLAYER_AVATAR_APPEARANCE.bodyModel,
    skinToneKey: memberOf(PLAYER_AVATAR_SKIN_TONES, input.skinToneKey)
      ? input.skinToneKey
      : DEFAULT_PLAYER_AVATAR_APPEARANCE.skinToneKey,
    hairStyleKey: memberOf(PLAYER_AVATAR_HAIR_STYLES, input.hairStyleKey)
      ? input.hairStyleKey
      : DEFAULT_PLAYER_AVATAR_APPEARANCE.hairStyleKey,
    hairColorKey: memberOf(PLAYER_AVATAR_HAIR_COLORS, input.hairColorKey)
      ? input.hairColorKey
      : DEFAULT_PLAYER_AVATAR_APPEARANCE.hairColorKey,
    outfitKey: memberOf(PLAYER_AVATAR_OUTFITS, input.outfitKey)
      ? input.outfitKey
      : DEFAULT_PLAYER_AVATAR_APPEARANCE.outfitKey,
    accessoryKey: memberOf(PLAYER_AVATAR_ACCESSORIES, input.accessoryKey)
      ? input.accessoryKey
      : 'none',
  };
}

