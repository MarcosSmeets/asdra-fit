import type { ImageSourcePropType } from 'react-native';

/**
 * Assets pixel da Jornada por região (gerados por tools/pixel-art). Cada
 * região tem paleta própria: r1 teal, r2 dourado, r3 violeta. O runtime só
 * conhece este módulo — trocar a arte é trocar o require (backlog de assets).
 */
export interface JourneyRegionAssets {
  ground: ImageSourcePropType;
  path: ImageSourcePropType;
  portal: ImageSourcePropType;
}

/* eslint-disable @typescript-eslint/no-var-requires */
export const JOURNEY_REGION_ASSETS: Readonly<Record<string, JourneyRegionAssets>> = {
  r1: {
    ground: require('../../../assets/pixel-art/journey/r1/tile-ground-v1.png'),
    path: require('../../../assets/pixel-art/journey/r1/tile-path-v1.png'),
    portal: require('../../../assets/pixel-art/journey/r1/portal-v1.png'),
  },
  r2: {
    ground: require('../../../assets/pixel-art/journey/r2/tile-ground-v1.png'),
    path: require('../../../assets/pixel-art/journey/r2/tile-path-v1.png'),
    portal: require('../../../assets/pixel-art/journey/r2/portal-v1.png'),
  },
  r3: {
    ground: require('../../../assets/pixel-art/journey/r3/tile-ground-v1.png'),
    path: require('../../../assets/pixel-art/journey/r3/tile-path-v1.png'),
    portal: require('../../../assets/pixel-art/journey/r3/portal-v1.png'),
  },
};
/* eslint-enable @typescript-eslint/no-var-requires */

/** Região desconhecida cai na primeira — a Jornada nunca quebra por asset. */
export function journeyRegionAssets(regionKey: string): JourneyRegionAssets {
  return JOURNEY_REGION_ASSETS[regionKey] ?? JOURNEY_REGION_ASSETS.r1!;
}
