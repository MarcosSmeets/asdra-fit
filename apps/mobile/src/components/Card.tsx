import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export interface CardProps extends ViewProps {
  padded?: boolean;
  variant?: 'surface' | 'surfaceAlt';
}

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
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: padded ? theme.spacing.lg : 0,
        },
        style,
      ]}
      {...rest}
    />
  );
}
