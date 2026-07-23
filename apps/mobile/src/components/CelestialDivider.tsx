import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { StarIcon } from './icons/StarIcon';

/** Divisor com uma estrela central dourada — usado entre seções narrativas. */
export function CelestialDivider({ inset = 0 }: { inset?: number }): React.ReactElement {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginHorizontal: inset,
      }}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
      <StarIcon size={14} color={theme.colors.brandGold} />
      <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
    </View>
  );
}
