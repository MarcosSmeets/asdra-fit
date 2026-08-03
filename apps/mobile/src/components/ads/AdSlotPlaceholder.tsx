import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { AD_SLOT_HEIGHT, BANNER_SIZE } from '@/config/ads';
import { Text } from '../Text';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Marcador do espaço de anúncio para quando a SDK nativa não existe no binário
 * (Expo Go). Só aparece em desenvolvimento: em release, um slot vazio é melhor
 * do que um aviso técnico para o usuário.
 *
 * Usa exatamente a mesma altura do slot real, para o que você vê no Expo Go ser
 * o espaço que o anúncio vai ocupar no APK — nem mais, nem menos.
 */
export function AdSlotPlaceholder(): React.ReactElement {
  const theme = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const height = AD_SLOT_HEIGHT;
  const percent = Math.round((height / screenHeight) * 100);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        height,
        backgroundColor: theme.colors.surfaceAlt,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingHorizontal: theme.spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.xs,
      }}
    >
      <Text variant="hud" color="textMuted" center>
        {BANNER_SIZE === 'BANNER' ? 'Banner 320×50' : 'Banner grande'}
      </Text>
      <Text variant="caption" color="textMuted" center>
        {`Slot de ${height} dp · ${percent}% da tela`}
      </Text>
    </View>
  );
}
