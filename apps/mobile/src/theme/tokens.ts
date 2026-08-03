/**
 * Design tokens do Ad Sidera (v3 — Build 5). Identidade oficial: RPG futurista
 * em pixel art 32-bit — cosmos profundo, tecnologia astral, energia estelar.
 * Tema ESCURO ÚNICO (decisão de produto do Build 5). Nenhum hexadecimal fora
 * deste arquivo. Sem gradientes suaves nem neon excessivo (spec §7).
 */

/** Paleta oficial pixel art (spec §7). Fonte única de verdade cromática. */
export const pixelPalette = {
  cosmic: {
    deepest: '#050817',
    deep: '#091128',
    midnight: '#101A3B',
    indigo: '#252460',
  },
  energy: {
    violet: '#7753E6',
    purple: '#9A63FF',
    cyan: '#3FD8E5',
    teal: '#3DABA8',
    magenta: '#D05BDD',
  },
  stellar: {
    gold: '#D5A84F',
    lightGold: '#F4CC77',
    white: '#F5F5FF',
  },
  neutral: {
    slate: '#75809D',
    panel: '#0D1733',
    border: '#273762',
    /** Sombra dura deslocada dos painéis pixel. */
    shadow: '#03040D',
  },
  /** Tons de feedback derivados (bordas/realces de estados). */
  feedback: {
    errorBright: '#F0938E',
    inkOnLight: '#17314A',
    mist: '#DCE8F2',
  },
} as const;

export interface ThemeColors {
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceAlt: string;
  surfaceElevated: string;
  primary: string;
  primaryMuted: string;
  onPrimary: string;
  secondary: string;
  onSecondary: string;
  brandGold: string;
  brandTeal: string;
  success: string;
  warning: string;
  error: string;
  text: string;
  textMuted: string;
  border: string;
  overlay: string;
  track: string;
}

/** Mapeamento semântico único (escuro cósmico). */
export const pixelColors: ThemeColors = {
  background: pixelPalette.cosmic.deepest,
  backgroundSecondary: pixelPalette.cosmic.deep,
  surface: pixelPalette.neutral.panel,
  surfaceAlt: pixelPalette.cosmic.midnight,
  surfaceElevated: '#14224A',
  primary: pixelPalette.stellar.gold,
  primaryMuted: '#3A3F6E',
  onPrimary: pixelPalette.cosmic.deepest,
  secondary: pixelPalette.energy.teal,
  onSecondary: pixelPalette.cosmic.deepest,
  brandGold: pixelPalette.stellar.gold,
  brandTeal: pixelPalette.energy.teal,
  success: '#4FB088',
  warning: pixelPalette.stellar.lightGold,
  error: '#E0655F',
  text: pixelPalette.stellar.white,
  textMuted: pixelPalette.neutral.slate,
  border: pixelPalette.neutral.border,
  overlay: 'rgba(5, 8, 23, 0.72)',
  track: '#1A2650',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Cantos "recortados" (pixel art): raios pequenos e duros, nunca pílulas suaves. */
export const radius = {
  sm: 2,
  md: 3,
  lg: 4,
  xl: 6,
  pill: 999,
} as const;

/** Unidade de pixel lógico do design system (bordas, recortes, sombras duras). */
export const pixelUnit = 2;

/** Tamanhos com mínimos legíveis (corpo 16, seção 20+, tela 28+). */
export const fontSize = {
  xs: 13,
  sm: 15,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  display: 34,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * Famílias (via @expo-google-fonts). Pixelada (Pixelify Sans) SOMENTE para
 * nomes, títulos curtos, estágios e HUD; sans (Inter) para corpo, formulários
 * e textos longos (spec §9). Nunca pixelada em parágrafos ou inputs.
 */
export const fontFamily = {
  pixel: 'PixelifySans_600SemiBold',
  pixelBold: 'PixelifySans_700Bold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
} as const;

export type ColorScheme = 'dark';

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  palette: typeof pixelPalette;
  spacing: typeof spacing;
  radius: typeof radius;
  pixelUnit: number;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  fontFamily: typeof fontFamily;
}

export function buildTheme(): Theme {
  return {
    scheme: 'dark',
    colors: pixelColors,
    palette: pixelPalette,
    spacing,
    radius,
    pixelUnit,
    fontSize,
    fontWeight,
    fontFamily,
  };
}
