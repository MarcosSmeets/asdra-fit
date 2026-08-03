import { DEFAULT_PLAYER_AVATAR_APPEARANCE } from '@ad-sidera/shared';
import { AVATAR_ART, AVATAR_RESOLUTIONS, mirrored, type Run } from './avatarArt';
import { AVATAR_LAYER_ORDER, resolveAvatarComposition, updateAvatarAppearance } from './avatarComposition';

const FULL = {
  ...DEFAULT_PLAYER_AVATAR_APPEARANCE,
  bodyModel: 'feminine' as const,
  skinToneKey: 'brown' as const,
  hairStyleKey: 'curly' as const,
  hairColorKey: 'golden' as const,
  outfitKey: 'constellation' as const,
  accessoryKey: 'visor' as const,
};

function allRuns(composition: ReturnType<typeof resolveAvatarComposition>): Run[] {
  const { parts } = composition;
  return [
    ...parts.body.geometry.outline, ...parts.body.geometry.skin,
    ...parts.body.geometry.skinShadow, ...parts.body.geometry.skinLight,
    ...parts.body.geometry.body,
    ...parts.hairBack.geometry.back, ...parts.hairFront.geometry.front,
    ...parts.outfit.geometry.primary, ...parts.outfit.geometry.secondary,
    ...parts.outfit.geometry.accent, ...parts.outfit.geometry.glow,
    ...parts.face.geometry.ink, ...parts.face.geometry.spark,
    ...parts.shadow.geometry,
    ...(parts.accessory ? [...parts.accessory.geometry.base, ...parts.accessory.geometry.accent] : []),
  ];
}

describe('resolução e grade 32-bit', () => {
  it('a grade da arte é 64×80 (dobro do detalhe do avatar 8-bit anterior)', () => {
    expect(AVATAR_ART.GRID_WIDTH).toBe(64);
    expect(AVATAR_ART.GRID_HEIGHT).toBe(80);
    const previous = 32 * 48;
    expect(AVATAR_ART.GRID_WIDTH * AVATAR_ART.GRID_HEIGHT).toBeGreaterThan(previous * 3);
  });

  it('expõe as resoluções canônicas de mapa, retrato e editor', () => {
    expect(AVATAR_RESOLUTIONS.map).toEqual({ width: 64, height: 80 });
    expect(AVATAR_RESOLUTIONS.portrait).toEqual({ width: 96, height: 128 });
    expect(AVATAR_RESOLUTIONS.editor).toEqual({ width: 128, height: 160 });
  });

  it('toda arte cabe dentro da grade (nada é cortado)', () => {
    for (const model of ['masculine', 'feminine'] as const) {
      for (const hair of ['short', 'swept', 'curly'] as const) {
        const composition = resolveAvatarComposition({ ...FULL, bodyModel: model, hairStyleKey: hair });
        for (const [x, y, width, height] of allRuns(composition)) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(x + width).toBeLessThanOrEqual(AVATAR_ART.GRID_WIDTH);
          expect(y + height).toBeLessThanOrEqual(AVATAR_ART.GRID_HEIGHT);
        }
      }
    }
  });

  it('o espelhamento mantém a simetria em torno do eixo', () => {
    const runs = mirrored([[10, 4, 6, 2]]);
    expect(runs).toContainEqual([10, 4, 6, 2]);
    expect(runs).toContainEqual([AVATAR_ART.GRID_WIDTH - 10 - 6, 4, 6, 2]);
  });
});

describe('camadas da composição', () => {
  it('mantém a ordem trás → frente exigida', () => {
    expect([...AVATAR_LAYER_ORDER]).toEqual([
      'shadow', 'hairBack', 'body', 'skin', 'outfit', 'face', 'hairFront', 'accessory', 'highlights',
    ]);
  });

  it('a sombra é a primeira camada e o acessório vem depois do cabelo da frente', () => {
    const order = AVATAR_LAYER_ORDER.indexOf.bind(AVATAR_LAYER_ORDER);
    expect(order('shadow')).toBe(0);
    expect(order('hairBack')).toBeLessThan(order('body'));
    expect(order('face')).toBeLessThan(order('hairFront'));
    expect(order('hairFront')).toBeLessThan(order('accessory'));
  });

  it('cada material tem três tons (sombra, base, luz)', () => {
    const { parts } = resolveAvatarComposition(FULL);
    for (const ramp of [parts.body.colors, parts.hairFront.colors]) {
      expect(ramp.shadow).toMatch(/^#/);
      expect(ramp.base).toMatch(/^#/);
      expect(ramp.light).toMatch(/^#/);
      expect(new Set([ramp.shadow, ramp.base, ramp.light]).size).toBe(3);
    }
  });

  it('o traje tem tecido, recorte, detalhe tecnológico e energia', () => {
    const { parts } = resolveAvatarComposition(FULL);
    expect(parts.outfit.geometry.primary.length).toBeGreaterThan(0);
    expect(parts.outfit.geometry.secondary.length).toBeGreaterThan(0);
    expect(parts.outfit.geometry.accent.length).toBeGreaterThan(0);
    expect(parts.outfit.geometry.glow.length).toBeGreaterThan(0);
  });

  it('o rosto é legível: olhos com brilho e boca', () => {
    const { parts } = resolveAvatarComposition(FULL);
    expect(parts.face.geometry.ink.length).toBeGreaterThanOrEqual(3);
    expect(parts.face.geometry.spark.length).toBeGreaterThan(0);
  });
});

describe('modularidade: uma troca nunca altera as demais partes', () => {
  it('tom de pele preserva cabelo e roupa', () => {
    const before = resolveAvatarComposition(FULL);
    const after = resolveAvatarComposition(updateAvatarAppearance(FULL, { skinToneKey: 'deep' }));
    expect(after.parts.body.colors).not.toEqual(before.parts.body.colors);
    expect(after.parts.hairFront).toEqual(before.parts.hairFront);
    expect(after.parts.outfit).toEqual(before.parts.outfit);
  });

  it('cabelo preserva corpo, pele e roupa', () => {
    const before = resolveAvatarComposition(FULL);
    const after = resolveAvatarComposition(
      updateAvatarAppearance(FULL, { hairStyleKey: 'swept', hairColorKey: 'silver' }),
    );
    expect(after.parts.hairFront).not.toEqual(before.parts.hairFront);
    expect(after.parts.body).toEqual(before.parts.body);
    expect(after.parts.outfit).toEqual(before.parts.outfit);
  });

  it('roupa preserva cabelo e pele', () => {
    const before = resolveAvatarComposition(FULL);
    const after = resolveAvatarComposition(updateAvatarAppearance(FULL, { outfitKey: 'mist' }));
    expect(after.parts.outfit).not.toEqual(before.parts.outfit);
    expect(after.parts.body.colors).toEqual(before.parts.body.colors);
    expect(after.parts.hairBack).toEqual(before.parts.hairBack);
  });

  it('acessório é camada independente e pode ser removido', () => {
    const withVisor = resolveAvatarComposition(FULL);
    expect(withVisor.parts.accessory?.key).toBe('visor');
    const without = resolveAvatarComposition(updateAvatarAppearance(FULL, { accessoryKey: 'none' }));
    expect(without.parts.accessory).toBeNull();
    expect(without.parts.outfit).toEqual(withVisor.parts.outfit);
  });

  it('modelo masculino e feminino têm silhuetas distintas', () => {
    const masculine = resolveAvatarComposition({ ...FULL, bodyModel: 'masculine' });
    const feminine = resolveAvatarComposition({ ...FULL, bodyModel: 'feminine' });
    expect(masculine.parts.body.geometry.outline).not.toEqual(feminine.parts.body.geometry.outline);
    expect(masculine.parts.body.geometry.body).not.toEqual(feminine.parts.body.geometry.body);
    // A troca de modelo preserva as demais escolhas.
    expect(feminine.parts.hairFront).toEqual(masculine.parts.hairFront);
    expect(feminine.parts.outfit).toEqual(masculine.parts.outfit);
  });

  it('a aparência escolhida persiste e é restaurada exatamente', () => {
    const restored = resolveAvatarComposition(JSON.parse(JSON.stringify(FULL)));
    expect(restored.appearance).toEqual(FULL);
  });

  it('payload desconhecido cai em fallback coerente, sem quebrar o render', () => {
    const composition = resolveAvatarComposition({ hairStyleKey: 'moicano', outfitKey: 'x' });
    expect(composition.appearance).toEqual(DEFAULT_PLAYER_AVATAR_APPEARANCE);
    expect(composition.parts.body.geometry.outline.length).toBeGreaterThan(0);
    expect(composition.parts.accessory).toBeNull();
  });

  it('conta antiga sem accessoryKey continua renderizável', () => {
    const legacy = {
      bodyModel: 'masculine' as const, skinToneKey: 'warm' as const,
      hairStyleKey: 'short' as const, hairColorKey: 'midnight' as const, outfitKey: 'astral' as const,
    };
    const composition = resolveAvatarComposition(legacy);
    expect(composition.appearance.accessoryKey).toBe('none');
    expect(composition.parts.accessory).toBeNull();
  });
});
