/**
 * Contrato de camadas da cena Meu Adari (Build 6).
 *
 * O Build 5 desenhava a "luz média" como um retângulo TEAL sólido de 78%×46%
 * atrás do personagem — na tela isso lia como uma placa verde recortada, não
 * como iluminação. Aqui a luz vira um halo em degraus (bandas concêntricas
 * translúcidas) e a ordem das camadas passa a ser um contrato testável.
 *
 * Regra de ouro: NENHUMA camada atrás do Adari pode ser opaca, e o sprite
 * nunca recebe preenchimento próprio — o fundo dele é o cenário.
 */

export const HOME_SCENE_LAYERS = [
  'Background',
  'EnvironmentalGlow',
  'AdariShadow',
  'AdariSprite',
  'ForegroundParticles',
  'HUD',
] as const;

export type HomeSceneLayer = (typeof HOME_SCENE_LAYERS)[number];

/** Banda do halo: fração do envelope de luz e opacidade (sempre translúcida). */
export interface GlowBand {
  scale: number;
  opacity: number;
}

/**
 * Halo ambiente em degraus (radial "pixelado"): da banda maior e mais fraca
 * para a menor e mais forte. Empilhadas, somam ~0.20 de luz no centro — o
 * bastante para destacar a silhueta sem virar um bloco de cor.
 */
export const ENVIRONMENTAL_GLOW_BANDS: readonly GlowBand[] = [
  { scale: 1, opacity: 0.04 },
  { scale: 0.76, opacity: 0.05 },
  { scale: 0.54, opacity: 0.06 },
  { scale: 0.32, opacity: 0.07 },
];

/** Teto de opacidade de qualquer camada desenhada ATRÁS do Adari. */
export const MAX_BACKDROP_OPACITY = 0.14;

/** O sprite não tem preenchimento: o fundo dele é sempre o cenário. */
export const ADARI_SPRITE_BACKGROUND = 'transparent' as const;

/**
 * Faixa vertical (em % da cena) onde o rosto do Adari costuma ficar. Partículas
 * de primeiro plano são proibidas aqui — nada pode cobrir a expressão dele.
 */
export const FACE_SAFE_BAND = { top: 28, bottom: 62 } as const;

export interface SceneParticle {
  left: number;
  top: number;
  size: number;
}

/** Poeira estelar de primeiro plano — só abaixo da faixa do rosto. */
export const FOREGROUND_PARTICLES: readonly SceneParticle[] = [
  { left: 12, top: 72, size: 2 },
  { left: 30, top: 84, size: 1 },
  { left: 68, top: 76, size: 2 },
  { left: 86, top: 88, size: 1 },
];

/** Partículas ambientes distantes (atrás do personagem). */
export const AMBIENT_PARTICLES: readonly SceneParticle[] = [
  { left: 16, top: 18, size: 2 },
  { left: 72, top: 14, size: 1 },
  { left: 88, top: 24, size: 2 },
  { left: 34, top: 12, size: 1 },
];

/** true quando a partícula respeita a faixa segura do rosto. */
export function isBelowFaceSafeBand(particle: SceneParticle): boolean {
  return particle.top >= FACE_SAFE_BAND.bottom;
}

/**
 * Presença do Adari na home. O Build 5 usava 0.82/0.42/350; o Build 6 sobe
 * ~12% para o companheiro dominar a cena sem estourar as safe areas.
 */
export const ADARI_PRESENCE = {
  MIN_SIZE: 246,
  MAX_SIZE: 392,
  WIDTH_RATIO: 0.92,
  HEIGHT_RATIO: 0.47,
  /** Crescimento aplicado sobre o dimensionamento do Build 5. */
  BUILD5_GROWTH: 0.12,
} as const;

/** Tamanho-base do Adari na home, respeitando os limites da tela. */
export function adariHomeBaseSize(width: number, height: number): number {
  return Math.max(
    ADARI_PRESENCE.MIN_SIZE,
    Math.min(
      width * ADARI_PRESENCE.WIDTH_RATIO,
      height * ADARI_PRESENCE.HEIGHT_RATIO,
      ADARI_PRESENCE.MAX_SIZE,
    ),
  );
}
