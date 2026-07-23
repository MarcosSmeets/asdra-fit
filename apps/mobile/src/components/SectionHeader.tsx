import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Ação à direita (ex.: um link "Ver tudo"). */
  action?: React.ReactNode;
}

/** Cabeçalho de seção (título serifado + subtítulo opcional + ação à direita). */
export function SectionHeader({ title, subtitle, action }: SectionHeaderProps): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.sm,
        }}
      >
        <Text variant="heading" accessibilityRole="header">
          {title}
        </Text>
        {action ?? null}
      </View>
      {subtitle ? (
        <Text variant="caption" color="textMuted">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
