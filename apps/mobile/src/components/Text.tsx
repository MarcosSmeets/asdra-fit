import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Variant = 'display' | 'title' | 'heading' | 'section' | 'hud' | 'body' | 'label' | 'caption';

export type TextColor =
  | 'text'
  | 'textMuted'
  | 'primary'
  | 'secondary'
  | 'brandGold'
  | 'brandTeal'
  | 'success'
  | 'warning'
  | 'error'
  | 'onPrimary'
  | 'onSecondary';

export interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: TextColor;
  center?: boolean;
}

/**
 * Títulos curtos, nomes, estágios e HUD usam a fonte pixelada (Pixelify Sans);
 * corpo, formulários e textos longos usam a sans (Inter), altamente legível.
 * Nunca a pixelada em parágrafos longos nem em inputs (spec §9).
 */
export function Text({
  variant = 'body',
  color = 'text',
  center,
  style,
  ...rest
}: TextProps): React.ReactElement {
  const theme = useTheme();
  const { fontSize, fontFamily } = theme;

  const specs: Record<Variant, { size: number; family: string }> = {
    display: { size: fontSize.display, family: fontFamily.pixelBold },
    title: { size: fontSize.xxl, family: fontFamily.pixelBold },
    heading: { size: fontSize.xl, family: fontFamily.pixel },
    section: { size: fontSize.lg, family: fontFamily.pixel },
    hud: { size: fontSize.sm, family: fontFamily.pixel },
    body: { size: fontSize.md, family: fontFamily.sans },
    label: { size: fontSize.sm, family: fontFamily.sansMedium },
    caption: { size: fontSize.xs, family: fontFamily.sans },
  };
  const v = specs[variant];

  return (
    <RNText
      allowFontScaling
      style={[
        {
          fontSize: v.size,
          fontFamily: v.family,
          color: theme.colors[color],
          textAlign: center ? 'center' : undefined,
        },
        style,
      ]}
      {...rest}
    />
  );
}
