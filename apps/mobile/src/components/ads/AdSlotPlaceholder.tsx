import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { BANNER_SIZE, bannerMaxHeight } from '@/config/ads';
import { Text } from '../Text';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Marcador do espaço de anúncio para quando a SDK nativa não existe no binário
 * (Expo Go). Só aparece em desenvolvimento: em release, um slot vazio é melhor
 * do que um aviso técnico para o usuário.
 *
 * A altura é o TETO documentado do tamanho escolhido, não a altura média — a
 * ideia é justamente enxergar o pior caso antes de decidir se o banner cabe.
 */
export function AdSlotPlaceholder(): React.ReactElement {
  const theme = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const height = bannerMaxHeight(BANNER_SIZE, screenHeight);
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
        {`Altura máxima ${height} dp · ${percent}% da tela`}
      </Text>
    </View>
  );
}
