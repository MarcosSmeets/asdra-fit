/**
 * Design tokens do Ad Sidera (v2). Identidade: jornada estelar — navy meia-noite,
 * creme/marfim, ouro estelar e verde-bruma (teal). O MODO CLARO é a experiência
 * principal; o escuro é preservado com a mesma identidade. Sem gradientes/neon.
 */

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

// Paleta base da marca.
const GOLD = '#C9A45C';
const GOLD_DARK = '#B08A3E';
const NAVY = '#10233F';
const NAVY_DEEP = '#08182C';
const CREAM = '#F7F1E7';
const IVORY = '#FFFDF8';
const SLATE = '#667085';

/** Modo claro — experiência principal (creme + navy + ouro + teal). */
export const lightColors: ThemeColors = {
  background: CREAM,
  backgroundSecondary: '#EFE7D6',
  surface: IVORY,
  surfaceAlt: '#F1EADC',
  surfaceElevated: '#FFFFFF',
  primary: NAVY,
  primaryMuted: '#DBE1EC',
  onPrimary: IVORY,
  secondary: GOLD_DARK,
  onSecondary: '#2A1E06',
  brandGold: GOLD_DARK,
  brandTeal: '#2F6E6D',
  success: '#3F8468',
  warning: '#9A6B1A',
  error: '#B54747',
  text: NAVY,
  textMuted: SLATE,
  border: '#E4DAC8',
  overlay: 'rgba(16, 35, 63, 0.42)',
  track: '#E7DECB',
};

/** Modo escuro — mesma identidade em navy profundo. */
export const darkColors: ThemeColors = {
  background: NAVY_DEEP,
  backgroundSecondary: '#0C2038',
  surface: NAVY,
  surfaceAlt: '#152B49',
  surfaceElevated: '#193357',
  primary: GOLD,
  primaryMuted: '#2C3E5C',
  onPrimary: NAVY_DEEP,
  secondary: '#5BAAA8',
  onSecondary: '#06201F',
  brandGold: GOLD,
  brandTeal: '#5BAAA8',
  success: '#4FB088',
  warning: '#E0A23B',
  error: '#DE7B76',
  text: CREAM,
  textMuted: '#9FB0C6',
  border: '#243A57',
  overlay: 'rgba(4, 10, 20, 0.6)',
  track: '#1E3252',
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

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

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

/** Famílias de fonte (carregadas via @expo-google-fonts). Serif p/ títulos, sans p/ corpo. */
export const fontFamily = {
  serif: 'Cormorant_600SemiBold',
  serifBold: 'Cormorant_700Bold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
} as const;

export type ColorScheme = 'light' | 'dark';

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  fontFamily: typeof fontFamily;
}

export function buildTheme(scheme: ColorScheme): Theme {
  return {
    scheme,
    colors: scheme === 'dark' ? darkColors : lightColors,
    spacing,
    radius,
    fontSize,
    fontWeight,
    fontFamily,
  };
}
