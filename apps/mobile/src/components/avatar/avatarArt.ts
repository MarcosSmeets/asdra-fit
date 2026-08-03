/**
 * Arte do Explorador em pixel art 32-bit (Build 6).
 *
 * O avatar do Build 5 era desenhado em 32×48 com blocos chapados — lia como
 * 8-bit e destoava dos Adaris. Aqui a arte passa para a grade 64×80, com três
 * tons por material (sombra/base/luz), CONTORNO SELETIVO (só a silhueta
 * externa e as separações internas fortes), rosto legível e traje astral.
 *
 * A arte é autorada em RUNS (x, y, largura, altura) no espaço 64×80 e a metade
 * esquerda é espelhada, garantindo simetria e mantendo o código legível.
 */

export const AVATAR_ART = {
  /** Grade lógica da arte (todas as resoluções derivam desta). */
  GRID_WIDTH: 64,
  GRID_HEIGHT: 80,
  /** Eixo de simetria: runs até aqui são espelhados para a direita. */
  MIRROR_AXIS: 32,
} as const;

/** Resoluções canônicas de apresentação (spec §2). */
export const AVATAR_RESOLUTIONS = {
  map: { width: 64, height: 80 },
  portrait: { width: 96, height: 128 },
  editor: { width: 128, height: 160 },
} as const;

export type AvatarVariant = keyof typeof AVATAR_RESOLUTIONS;

/**
 * Ordem de composição (trás → frente). Cada camada é independente: trocar
 * `hairStyleKey` não redesenha corpo, pele nem roupa.
 */
export const AVATAR_ART_LAYERS = [
  'shadow',
  'hairBack',
  'body',
  'skin',
  'outfit',
  'face',
  'hairFront',
  'accessory',
  'highlights',
] as const;

export type AvatarArtLayer = (typeof AVATAR_ART_LAYERS)[number];

/** Run horizontal/vertical de pixels: [x, y, largura, altura]. */
export type Run = readonly [x: number, y: number, width: number, height: number];

/** Espelha os runs da metade esquerda para a direita (simetria do personagem). */
export function mirrored(runs: readonly Run[]): Run[] {
  const out: Run[] = [...runs];
  for (const [x, y, width, height] of runs) {
    const flippedX = AVATAR_ART.GRID_WIDTH - x - width;
    if (flippedX !== x) {
      out.push([flippedX, y, width, height]);
    }
  }
  return out;
}

export interface BodyGeometry {
  /** Contorno externo (silhueta) — o contorno é seletivo, não envolve tudo. */
  outline: readonly Run[];
  /** Preenchimento de pele exposta (rosto, pescoço, mãos). */
  skin: readonly Run[];
  skinShadow: readonly Run[];
  skinLight: readonly Run[];
  /** Massa do torso/pernas sob a roupa. */
  body: readonly Run[];
}

/**
 * Silhueta masculina: ombros mais largos, torso reto.
 * Cabeça 24×24 no topo, torso 28 de largura, pernas até a base.
 */
const MASCULINE: BodyGeometry = {
  outline: mirrored([
    // crânio
    [20, 8, 12, 2], [17, 10, 3, 2], [16, 12, 2, 14], [17, 26, 3, 2],
    // mandíbula e pescoço
    [20, 28, 6, 2], [27, 30, 5, 2],
    // ombros e braços
    [14, 32, 4, 2], [12, 34, 2, 18], [13, 52, 3, 2],
    // torso
    [18, 32, 2, 22],
    // quadril e pernas
    [17, 54, 3, 2], [18, 56, 2, 18], [24, 56, 2, 18],
    // botas
    [16, 74, 6, 3],
  ]),
  skin: mirrored([
    [20, 10, 12, 18], [21, 28, 11, 3], [27, 31, 5, 3],
    [14, 46, 4, 7],
  ]),
  skinShadow: mirrored([
    [20, 24, 12, 4], [21, 30, 10, 1], [14, 51, 4, 2],
  ]),
  skinLight: mirrored([
    [22, 11, 8, 2], [20, 13, 2, 6],
  ]),
  body: mirrored([
    [20, 32, 12, 22], [14, 34, 6, 18], [19, 56, 6, 18],
  ]),
};

/** Silhueta feminina: ombros mais estreitos, cintura marcada, quadril definido. */
const FEMININE: BodyGeometry = {
  outline: mirrored([
    [20, 8, 12, 2], [17, 10, 3, 2], [16, 12, 2, 14], [17, 26, 3, 2],
    [20, 28, 6, 2], [27, 30, 5, 2],
    [16, 32, 3, 2], [14, 34, 2, 17], [15, 51, 3, 2],
    [19, 32, 2, 10], [20, 42, 2, 4], [19, 46, 2, 8],
    [17, 54, 3, 2], [19, 56, 2, 18], [24, 56, 2, 18],
    [17, 74, 5, 3],
  ]),
  skin: mirrored([
    [20, 10, 12, 18], [21, 28, 11, 3], [27, 31, 5, 3],
    [16, 45, 4, 7],
  ]),
  skinShadow: mirrored([
    [20, 24, 12, 4], [21, 30, 10, 1], [16, 50, 4, 2],
  ]),
  skinLight: mirrored([
    [22, 11, 8, 2], [20, 13, 2, 6],
  ]),
  body: mirrored([
    [21, 32, 11, 10], [22, 42, 10, 4], [21, 46, 11, 8],
    [16, 34, 5, 17], [20, 56, 5, 18],
  ]),
};

export const BODY_GEOMETRY: Readonly<Record<'masculine' | 'feminine', BodyGeometry>> = {
  masculine: MASCULINE,
  feminine: FEMININE,
};

export interface HairGeometry {
  /** Massa atrás da cabeça (nuca, mechas longas). */
  back: readonly Run[];
  /** Franja e mechas na frente do rosto. */
  front: readonly Run[];
  /** Fios iluminados (brilho seletivo). */
  highlight: readonly Run[];
}

/** Três estilos com silhuetas claramente distintas na grade 64×80. */
export const HAIR_GEOMETRY: Readonly<Record<'short' | 'swept' | 'curly', HairGeometry>> = {
  short: {
    back: mirrored([[17, 8, 15, 6], [16, 12, 3, 12]]),
    front: mirrored([[19, 8, 13, 5], [18, 12, 3, 5], [24, 12, 8, 2]]),
    highlight: mirrored([[22, 9, 6, 1], [20, 11, 2, 2]]),
  },
  swept: {
    back: mirrored([[17, 7, 15, 7], [15, 13, 4, 18], [14, 28, 4, 10]]),
    front: mirrored([[19, 7, 13, 5], [18, 11, 4, 7], [26, 11, 6, 3], [29, 13, 3, 5]]),
    highlight: mirrored([[23, 8, 7, 1], [19, 12, 2, 4]]),
  },
  curly: {
    back: mirrored([[16, 7, 16, 8], [14, 14, 4, 14], [15, 27, 4, 6]]),
    front: mirrored([
      [18, 6, 6, 5], [23, 5, 7, 5], [17, 11, 4, 5], [26, 10, 6, 4], [21, 10, 4, 3],
    ]),
    highlight: mirrored([[19, 7, 3, 2], [26, 6, 3, 2]]),
  },
};

export interface OutfitGeometry {
  /** Tecido principal. */
  primary: readonly Run[];
  /** Sombra do tecido e recortes. */
  secondary: readonly Run[];
  /** Detalhes tecnológicos (circuitos, fivelas, gola). */
  accent: readonly Run[];
  /** Pontos de energia (luz do traje astral). */
  glow: readonly Run[];
}

/** Trajes astrais/tecnológicos: painéis, gola alta e linhas de circuito. */
export const OUTFIT_GEOMETRY: Readonly<Record<'astral' | 'mist' | 'constellation', OutfitGeometry>> = {
  astral: {
    primary: mirrored([[19, 32, 13, 22], [14, 34, 6, 16], [19, 56, 6, 16]]),
    secondary: mirrored([[22, 36, 10, 12], [15, 36, 4, 12], [20, 60, 5, 12]]),
    accent: mirrored([[20, 32, 12, 2], [19, 50, 13, 3], [15, 34, 5, 2]]),
    glow: mirrored([[25, 38, 3, 3], [21, 51, 2, 1]]),
  },
  mist: {
    primary: mirrored([[19, 32, 13, 22], [14, 34, 6, 16], [19, 56, 6, 16]]),
    secondary: mirrored([[20, 40, 12, 10], [15, 40, 4, 10], [20, 58, 5, 8]]),
    accent: mirrored([[20, 32, 12, 3], [22, 46, 10, 2], [19, 52, 13, 2]]),
    glow: mirrored([[27, 34, 2, 2], [23, 47, 2, 1]]),
  },
  constellation: {
    primary: mirrored([[19, 32, 13, 22], [14, 34, 6, 16], [19, 56, 6, 16]]),
    secondary: mirrored([[21, 35, 11, 14], [15, 38, 4, 11], [20, 59, 5, 10]]),
    accent: mirrored([[20, 32, 12, 2], [19, 49, 13, 2], [23, 40, 2, 8]]),
    glow: mirrored([[24, 36, 2, 2], [28, 42, 2, 2], [22, 44, 2, 2]]),
  },
};

export interface FaceGeometry {
  /** Traço escuro dos olhos e sobrancelhas. */
  ink: readonly Run[];
  /** Íris/luz do olhar. */
  spark: readonly Run[];
}

/** Rosto legível na grade 64×80: olhos com brilho, sobrancelha e boca. */
export const FACE_GEOMETRY: FaceGeometry = {
  ink: mirrored([
    [22, 17, 4, 3],   // olho
    [22, 15, 5, 1],   // sobrancelha
    [28, 24, 4, 1],   // boca (centralizada pelo espelho)
  ]),
  spark: mirrored([
    [23, 18, 2, 2],
  ]),
};

export interface AccessoryGeometry {
  base: readonly Run[];
  accent: readonly Run[];
}

/** Acessórios opcionais, cada um em camada própria. */
export const ACCESSORY_GEOMETRY: Readonly<Record<'visor' | 'starpin' | 'scarf', AccessoryGeometry>> = {
  visor: {
    base: mirrored([[19, 15, 13, 6]]),
    accent: mirrored([[20, 17, 11, 2]]),
  },
  starpin: {
    base: mirrored([[16, 10, 4, 4]]),
    accent: mirrored([[17, 9, 2, 1], [17, 13, 2, 1], [15, 11, 1, 2]]),
  },
  scarf: {
    base: mirrored([[18, 30, 14, 4], [15, 34, 4, 10]]),
    accent: mirrored([[18, 33, 14, 1], [15, 42, 4, 2]]),
  },
};

/** Sombra de contato no chão (camada separada, nunca colada ao corpo). */
export const SHADOW_GEOMETRY: readonly Run[] = mirrored([
  [18, 76, 14, 3], [14, 77, 4, 2],
]);
