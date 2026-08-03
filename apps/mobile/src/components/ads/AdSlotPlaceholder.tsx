import React from 'react';
import { View } from 'react-native';
import { Text } from '../Text';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Marcador do espaço de anúncio para quando a SDK nativa não existe no binário
 * (Expo Go). Só aparece em desenvolvimento: em release, um slot vazio é melhor
 * do que um aviso técnico para o usuário.
 */
export function AdSlotPlaceholder(): React.ReactElement {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        backgroundColor: theme.colors.surfaceAlt,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        alignItems: 'center',
      }}
    >
      <Text variant="caption" color="textMuted" center>
        Espaço de anúncio — indisponível no Expo Go.
      </Text>
    </View>
  );
}
