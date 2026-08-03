import { JOURNEY_REGION_ASSETS, journeyRegionAssets } from './tiles';

describe('assets pixel da Jornada', () => {
  it('cada região tem chão, caminho e portal', () => {
    for (const region of ['r1', 'r2', 'r3']) {
      const assets = JOURNEY_REGION_ASSETS[region]!;
      expect(assets.ground).toBeDefined();
      expect(assets.path).toBeDefined();
      expect(assets.portal).toBeDefined();
    }
  });

  it('região desconhecida cai na primeira (a Jornada nunca quebra por asset)', () => {
    expect(journeyRegionAssets('r99')).toBe(JOURNEY_REGION_ASSETS.r1);
    expect(journeyRegionAssets('')).toBe(JOURNEY_REGION_ASSETS.r1);
  });
});
