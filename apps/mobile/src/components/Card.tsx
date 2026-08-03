import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export interface CardProps extends ViewProps {
  padded?: boolean;
  variant?: 'surface' | 'surfaceAlt';
}

/**
 * Cartão legado com pele pixel (borda dura, canto quase reto). Para o visual
 * completo 32-bit (recorte + sombra) prefira PixelPanel/PixelCard — este
 * componente permanece porque aplica o estilo no MESMO View dos filhos.
 */
export function Card({
  padded = true,
  variant = 'surface',
  style,
  ...rest
}: CardProps): React.ReactElement {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors[variant],
          borderRadius: theme.radius.sm,
          borderWidth: theme.pixelUnit / 2,
          borderColor: theme.colors.border,
          padding: padded ? theme.spacing.lg : 0,
        },
        style,
      ]}
      {...rest}
    />
  );
}
