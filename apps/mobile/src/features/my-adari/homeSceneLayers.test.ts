import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ADARI_PRESENCE,
  ADARI_SPRITE_BACKGROUND,
  adariHomeBaseSize,
  AMBIENT_PARTICLES,
  ENVIRONMENTAL_GLOW_BANDS,
  FACE_SAFE_BAND,
  FOREGROUND_PARTICLES,
  HOME_SCENE_LAYERS,
  isBelowFaceSafeBand,
  MAX_BACKDROP_OPACITY,
} from './homeSceneLayers';

const FEATURE_DIR = join(__dirname);
const COMPONENTS_DIR = join(__dirname, '..', '..', 'components');

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('contrato de camadas da cena Meu Adari', () => {
  it('mantém a ordem obrigatória de camadas', () => {
    expect([...HOME_SCENE_LAYERS]).toEqual([
      'Background',
      'EnvironmentalGlow',
      'AdariShadow',
      'AdariSprite',
      'ForegroundParticles',
      'HUD',
    ]);
  });

  it('desenha a luz antes da sombra, e a sombra antes do sprite', () => {
    const order = HOME_SCENE_LAYERS.indexOf.bind(HOME_SCENE_LAYERS);
    expect(order('EnvironmentalGlow')).toBeLessThan(order('AdariShadow'));
    expect(order('AdariShadow')).toBeLessThan(order('AdariSprite'));
  });

  it('a sombra é camada independente do sprite', () => {
    expect(HOME_SCENE_LAYERS).toContain('AdariShadow');
    expect(HOME_SCENE_LAYERS).toContain('AdariSprite');
    expect(HOME_SCENE_LAYERS.indexOf('AdariShadow')).not.toBe(
      HOME_SCENE_LAYERS.indexOf('AdariSprite'),
    );
  });
});

describe('luz de ambiente nunca vira placa de cor', () => {
  it('toda banda é translúcida e abaixo do teto de opacidade', () => {
    for (const band of ENVIRONMENTAL_GLOW_BANDS) {
      expect(band.opacity).toBeGreaterThan(0);
      expect(band.opacity).toBeLessThanOrEqual(MAX_BACKDROP_OPACITY);
    }
  });

  it('as bandas são concêntricas: escala sempre decrescente', () => {
    for (let i = 1; i < ENVIRONMENTAL_GLOW_BANDS.length; i += 1) {
      expect(ENVIRONMENTAL_GLOW_BANDS[i]!.scale).toBeLessThan(ENVIRONMENTAL_GLOW_BANDS[i - 1]!.scale);
    }
  });

  it('empilhadas, as bandas continuam translúcidas (nunca opacas)', () => {
    const combined = 1 - ENVIRONMENTAL_GLOW_BANDS.reduce((rest, band) => rest * (1 - band.opacity), 1);
    expect(combined).toBeLessThan(0.35);
  });

  it('o sprite do Adari não tem preenchimento próprio', () => {
    expect(ADARI_SPRITE_BACKGROUND).toBe('transparent');
  });
});

describe('partículas não cobrem o rosto do Adari', () => {
  it('toda partícula de primeiro plano fica abaixo da faixa do rosto', () => {
    for (const particle of FOREGROUND_PARTICLES) {
      expect(isBelowFaceSafeBand(particle)).toBe(true);
    }
  });

  it('partículas ambientes ficam acima da faixa do rosto', () => {
    for (const particle of AMBIENT_PARTICLES) {
      expect(particle.top).toBeLessThan(FACE_SAFE_BAND.top);
    }
  });
});

describe('presença do Adari na home', () => {
  it('cresce ~12% em relação ao dimensionamento do Build 5', () => {
    const build5 = (w: number, h: number) => Math.max(220, Math.min(w * 0.82, h * 0.42, 350));
    for (const [width, height] of [[390, 844], [430, 932], [360, 780]] as const) {
      const growth = adariHomeBaseSize(width, height) / build5(width, height) - 1;
      expect(growth).toBeGreaterThanOrEqual(0.1);
      expect(growth).toBeLessThanOrEqual(0.15);
    }
  });

  it('respeita os limites de tela para não cortar cauda, asas e chifres', () => {
    expect(adariHomeBaseSize(320, 600)).toBeLessThanOrEqual(320 * ADARI_PRESENCE.WIDTH_RATIO);
    expect(adariHomeBaseSize(1200, 2000)).toBe(ADARI_PRESENCE.MAX_SIZE);
  });
});

describe('regressão: nenhuma placa sólida atrás do Adari', () => {
  it('a cena não reintroduz o retângulo de luz do Build 5', () => {
    const scene = source(join(FEATURE_DIR, 'MyAdariScene.tsx'));
    expect(scene).not.toContain('midLight');
    expect(scene).toContain('ENVIRONMENTAL_GLOW_BANDS');
  });

  it('o sprite e o animador não pintam fundo atrás do personagem', () => {
    const sprite = source(join(COMPONENTS_DIR, 'adari', 'AdariActionSprite.tsx'));
    const animator = source(join(COMPONENTS_DIR, 'adari', 'AdariAnimator.tsx'));
    // A placa dourada dos estágios evoluídos saiu: luz é responsabilidade da cena.
    expect(sprite).not.toContain('rgba(232,192,112,0.18)');
    expect(sprite).not.toMatch(/backgroundColor/);
    expect(animator).not.toMatch(/borderRadius:\s*999/);
  });
});
