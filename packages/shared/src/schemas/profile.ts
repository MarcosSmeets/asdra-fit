import { z } from 'zod';
import { AVATAR_TYPES } from '../enums';
import { GOALS } from '../enums';
import {
  PLAYER_AVATAR_BODY_MODELS,
  PLAYER_AVATAR_HAIR_COLORS,
  PLAYER_AVATAR_HAIR_STYLES,
  PLAYER_AVATAR_OUTFITS,
  PLAYER_AVATAR_SKIN_TONES,
} from '../avatar';

export const playerAvatarAppearanceSchema = z.object({
  bodyModel: z.enum(PLAYER_AVATAR_BODY_MODELS),
  skinToneKey: z.enum(PLAYER_AVATAR_SKIN_TONES),
  hairStyleKey: z.enum(PLAYER_AVATAR_HAIR_STYLES),
  hairColorKey: z.enum(PLAYER_AVATAR_HAIR_COLORS),
  outfitKey: z.enum(PLAYER_AVATAR_OUTFITS),
}).strict();

export const updateProfileSchema = z
  .object({
    displayName: z.string().min(1).max(60).optional(),
    timezone: z.string().min(1).optional(),
    locale: z.string().min(2).max(10).optional(),
    avatarType: z.enum(AVATAR_TYPES).optional(),
    shareCreatureLevel: z.boolean().optional(),
    goal: z.enum(GOALS).nullable().optional(),
    avatarAppearance: playerAvatarAppearanceSchema.optional(),
  })
  .strict();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
