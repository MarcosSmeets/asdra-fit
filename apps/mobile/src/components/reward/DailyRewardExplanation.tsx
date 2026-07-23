import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../Text';

/** Explica a política de recompensa diária sem tom punitivo. */
export function DailyRewardExplanation(): React.ReactElement {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.md,
        gap: 4,
      }}
    >
      <Text variant="label" color="brandTeal">
        Como funcionam as recompensas do dia
      </Text>
      <Text variant="caption" color="textMuted">
        A 1ª atividade de cada dia recebe a recompensa completa. Uma 2ª atividade recebe 25%. As
        demais continuam salvas no diário sem recompensa adicional — assim a evolução acompanha a
        constância, não o volume.
      </Text>
    </View>
  );
}
