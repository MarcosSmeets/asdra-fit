import type { AttributeSet } from '@ad-sidera/shared';
import React from 'react';
import { View } from 'react-native';
import { ATTRIBUTE_LABELS } from '../../constants/labels';
import { useTheme } from '../../theme/ThemeProvider';
import { AttributeIcon, type AttributeIconKey } from '../icons/AttributeIcon';
import { ProgressBar } from '../ProgressBar';
import { Text } from '../Text';

const ROWS: { key: AttributeIconKey; max: number }[] = [
  { key: 'strength', max: 60 },
  { key: 'endurance', max: 60 },
  { key: 'agility', max: 60 },
  { key: 'discipline', max: 60 },
  { key: 'recovery', max: 60 },
  { key: 'spirit', max: 60 },
  { key: 'health', max: 200 },
  { key: 'energy', max: 100 },
];

/** Atributos do Adari com ícone, valor e barra. */
export function AdariStats({ attributes }: { attributes: AttributeSet }): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      {ROWS.map(({ key, max }) => {
        const value = attributes[key];
        return (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <AttributeIcon attribute={key} color={theme.colors.brandTeal} size={18} />
            <Text variant="label" style={{ width: 96 }}>
              {ATTRIBUTE_LABELS[key] ?? key}
            </Text>
            <View style={{ flex: 1 }}>
              <ProgressBar
                value={Math.min(value / max, 1)}
                color="brandTeal"
                height={8}
                accessibilityLabel={`${ATTRIBUTE_LABELS[key] ?? key}: ${value}`}
              />
            </View>
            <Text variant="label" color="textMuted" style={{ width: 34, textAlign: 'right' }}>
              {value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
