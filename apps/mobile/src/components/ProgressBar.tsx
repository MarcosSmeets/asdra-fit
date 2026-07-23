import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export interface ProgressBarProps {
  /** 0..1 (valores acima de 1 são exibidos cheios). */
  value: number;
  color?: 'primary' | 'secondary' | 'brandGold' | 'brandTeal' | 'success' | 'warning' | 'error';
  height?: number;
  accessibilityLabel?: string;
}

export function ProgressBar({
  value,
  color = 'primary',
  height = 10,
  accessibilityLabel,
}: ProgressBarProps): React.ReactElement {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(value, 1));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{
        height,
        backgroundColor: theme.colors.track,
        borderRadius: theme.radius.pill,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          backgroundColor: theme.colors[color],
          borderRadius: theme.radius.pill,
        }}
      />
    </View>
  );
}
