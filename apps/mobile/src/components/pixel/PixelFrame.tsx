import React from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export interface PixelFrameProps extends ViewProps {
  /** Cor de preenchimento do painel. */
  fill?: string;
  /** Cor da borda pixelada. */
  border?: string;
  /** Tamanho do recorte de canto (px lógicos). */
  cornerSize?: number;
  /** Espessura da borda (px lógicos). */
  borderWidth?: number;
  /** Sombra dura deslocada (estética 32-bit). */
  shadow?: boolean;
  shadowColor?: string;
  /** Padding interno do conteúdo. */
  padding?: number;
}

/**
 * Primitivo do design system pixel: retângulo com cantos RECORTADOS em degrau,
 * borda dura e sombra sólida deslocada — desenhado só com Views absolutas
 * (nem SVG nem imagens), portanto sempre nítido em qualquer densidade.
 */
export function PixelFrame({
  fill,
  border,
  cornerSize,
  borderWidth,
  shadow = false,
  shadowColor,
  padding,
  style,
  children,
  ...rest
}: PixelFrameProps): React.ReactElement {
  const theme = useTheme();
  const bw = borderWidth ?? theme.pixelUnit;
  const c = cornerSize ?? theme.pixelUnit * 2;
  const o = theme.pixelUnit * 2;
  const fillColor = fill ?? theme.colors.surface;
  const borderColor = border ?? theme.colors.border;
  const shadowFill = shadowColor ?? theme.palette.neutral.shadow;

  const step = Math.max(1, c - bw);
  const corners: ViewStyle[] = [
    { left: bw, top: bw },
    { right: bw, top: bw },
    { left: bw, bottom: bw },
    { right: bw, bottom: bw },
  ];

  return (
    <View style={[{ position: 'relative' }, style]} {...rest}>
      {shadow ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: o, top: o, right: 0, bottom: 0, backgroundColor: shadowFill }}
        />
      ) : null}
      <View style={{ position: 'relative', marginRight: shadow ? o : 0, marginBottom: shadow ? o : 0 }}>
        {/* contorno (duas fatias que formam o retângulo recortado) */}
        <View pointerEvents="none" style={{ position: 'absolute', top: c, bottom: c, left: 0, right: 0, backgroundColor: borderColor }} />
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: c, right: c, backgroundColor: borderColor }} />
        {/* degraus de canto */}
        {corners.map((pos, i) => (
          <View key={i} pointerEvents="none" style={[{ position: 'absolute', width: step, height: step, backgroundColor: borderColor }, pos]} />
        ))}
        {/* preenchimento (mesma silhueta, recuada pela borda) */}
        <View pointerEvents="none" style={{ position: 'absolute', top: c, bottom: c, left: bw, right: bw, backgroundColor: fillColor }} />
        <View pointerEvents="none" style={{ position: 'absolute', top: bw, bottom: bw, left: c, right: c, backgroundColor: fillColor }} />
        <View style={{ padding: padding ?? theme.spacing.lg }}>{children}</View>
      </View>
    </View>
  );
}

export interface PixelPanelProps extends PixelFrameProps {
  variant?: 'surface' | 'surfaceAlt' | 'elevated';
}

/** Painel padrão de conteúdo (substitui o Card genérico). */
export function PixelPanel({ variant = 'surface', ...rest }: PixelPanelProps): React.ReactElement {
  const theme = useTheme();
  const fills = {
    surface: theme.colors.surface,
    surfaceAlt: theme.colors.surfaceAlt,
    elevated: theme.colors.surfaceElevated,
  } as const;
  return <PixelFrame fill={fills[variant]} shadow {...rest} />;
}

/** Alias semântico de painel para cartões de lista/resumo. */
export function PixelCard(props: PixelPanelProps): React.ReactElement {
  return <PixelPanel {...props} />;
}

/**
 * Moldura "tecnologia astral": borda dourada com marcadores de circuito nos
 * cantos. Para retratos, destaques e momentos de evolução.
 */
export function DigitalFrame({ children, style, padding, ...rest }: PixelFrameProps): React.ReactElement {
  const theme = useTheme();
  const u = theme.pixelUnit;
  const accents: ViewStyle[] = [
    { left: -u, top: -u },
    { right: -u, top: -u },
    { left: -u, bottom: -u },
    { right: -u, bottom: -u },
  ];
  return (
    <View style={[{ position: 'relative' }, style]}>
      <PixelFrame
        border={theme.colors.brandGold}
        fill={theme.colors.surfaceAlt}
        padding={padding ?? theme.spacing.sm}
        {...rest}
      >
        {children}
      </PixelFrame>
      {accents.map((pos, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[{ position: 'absolute', width: u * 3, height: u * 3, backgroundColor: theme.colors.brandGold }, pos]}
        />
      ))}
    </View>
  );
}

/** Painel holográfico: contorno ciano, fundo translúcido e linhas de varredura. */
export function HolographicPanel({ children, style, padding, ...rest }: PixelFrameProps): React.ReactElement {
  const theme = useTheme();
  return (
    <PixelFrame
      border={theme.palette.energy.cyan}
      fill="rgba(63, 216, 229, 0.08)"
      padding={padding ?? theme.spacing.md}
      style={style}
      {...rest}
    >
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 4, height: 1, backgroundColor: 'rgba(63,216,229,0.35)' }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 4, height: 1, backgroundColor: 'rgba(63,216,229,0.35)' }} />
      {children}
    </PixelFrame>
  );
}

export interface PixelDividerProps {
  /** Comprimento de cada tracinho. */
  dash?: number;
  color?: string;
}

/** Divisor tracejado em blocos (linha tecnológica). */
export function PixelDivider({ dash = 6, color }: PixelDividerProps): React.ReactElement {
  const theme = useTheme();
  const u = theme.pixelUnit;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: 'row', alignItems: 'center', gap: u * 2, overflow: 'hidden', height: u }}
    >
      {Array.from({ length: 40 }, (_, i) => (
        <View key={i} style={{ width: dash, height: u, backgroundColor: color ?? theme.colors.border }} />
      ))}
    </View>
  );
}
