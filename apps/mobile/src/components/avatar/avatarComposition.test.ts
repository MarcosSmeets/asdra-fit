import { DEFAULT_PLAYER_AVATAR_APPEARANCE } from '@ad-sidera/shared';
import { AVATAR_LAYER_ORDER, resolveAvatarComposition, updateAvatarAppearance } from './avatarComposition';

describe('modular avatar composition', () => {
  it('changes skin tone without replacing hair or outfit', () => {
    const current = { ...DEFAULT_PLAYER_AVATAR_APPEARANCE, hairStyleKey: 'curly' as const, outfitKey: 'mist' as const };
    expect(updateAvatarAppearance(current, { skinToneKey: 'deep' })).toEqual({
      ...current,
      skinToneKey: 'deep',
    });
  });

  it('changes hair without replacing body, skin or outfit', () => {
    const current = { ...DEFAULT_PLAYER_AVATAR_APPEARANCE, bodyModel: 'feminine' as const, skinToneKey: 'warm' as const };
    expect(updateAvatarAppearance(current, { hairStyleKey: 'swept', hairColorKey: 'auburn' })).toEqual({
      ...current,
      hairStyleKey: 'swept',
      hairColorKey: 'auburn',
    });
  });

  it('changes outfit without replacing body, skin or hair', () => {
    const current = { ...DEFAULT_PLAYER_AVATAR_APPEARANCE, skinToneKey: 'brown' as const, hairStyleKey: 'short' as const };
    expect(updateAvatarAppearance(current, { outfitKey: 'constellation' })).toEqual({
      ...current,
      outfitKey: 'constellation',
    });
  });

  it('changes body model while preserving compatible selected parts', () => {
    const current = {
      bodyModel: 'masculine' as const,
      skinToneKey: 'deep' as const,
      hairStyleKey: 'curly' as const,
      hairColorKey: 'golden' as const,
      outfitKey: 'mist' as const,
    };
    expect(updateAvatarAppearance(current, { bodyModel: 'feminine' })).toEqual({ ...current, bodyModel: 'feminine' });
  });

  it('uses a deterministic back-to-front layer order and restores the exact selection', () => {
    const appearance = {
      bodyModel: 'feminine' as const,
      skinToneKey: 'luminous' as const,
      hairStyleKey: 'curly' as const,
      hairColorKey: 'midnight' as const,
      outfitKey: 'astral' as const,
    };
    const composition = resolveAvatarComposition(JSON.parse(JSON.stringify(appearance)));

    expect(composition.appearance).toEqual(appearance);
    expect(composition.layerOrder).toEqual(AVATAR_LAYER_ORDER);
    expect(composition.parts.hairBack.styleKey).toBe('curly');
    expect(composition.parts.hairFront.colorKey).toBe('midnight');
    expect(composition.parts.outfit.key).toBe('astral');
  });
});
