import { getCreatureByKey, type AttributeSet } from '@ad-sidera/shared';
import React from 'react';
import { Pressable, View } from 'react-native';
import { ATTRIBUTE_LABELS } from '../../constants/labels';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../Text';
import { AdariPortrait } from './AdariPortrait';

/** Atributos exibidos na escolha, na ordem que ajuda a comparar as três linhas. */
const CARD_STATS: readonly (keyof AttributeSet)[] = [
  'strength', 'endurance', 'agility', 'discipline', 'recovery', 'spirit', 'health', 'energy',
];

export interface AdariCardProps {
  creatureKey: string;
  name: string;
  archetypeLabel: string;
  personality: string;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
}

/** Card selecionável de escolha do Adari (retrato + nome + arquétipo + personalidade). */
export function AdariCard({
  creatureKey,
  name,
  archetypeLabel,
  personality,
  selected,
  onPress,
  testID,
}: AdariCardProps): React.ReactElement {
  const theme = useTheme();
  const baseStats = getCreatureByKey(creatureKey)?.baseStats;
  const statsLabel = baseStats
    ? CARD_STATS.map((key) => `${ATTRIBUTE_LABELS[key] ?? key} ${baseStats[key]}`).join(', ')
    : '';
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      accessibilityLabel={`${name}, ${archetypeLabel}. ${personality}. Atributos iniciais: ${statsLabel}`}
      style={({ pressed }) => [
        {
          backgroundColor: selected ? theme.colors.surfaceElevated : theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? theme.colors.brandGold : theme.colors.border,
          padding: theme.spacing.lg,
          alignItems: 'center',
          gap: theme.spacing.xs,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}
    >
      <AdariPortrait creatureKey={creatureKey} size={116} mood={selected ? 'happy' : 'normal'} />
      <Text variant="heading">{name}</Text>
      <Text variant="label" color="brandGold">
        {archetypeLabel}
      </Text>
      <Text variant="body" color="textMuted" center>
        {personality}
      </Text>

      {/* Atributos iniciais: dá para comparar as três linhas antes de escolher. */}
      {baseStats ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xs }}
        >
          {CARD_STATS.map((key) => (
            <View
              key={key}
              style={{
                flexDirection: 'row',
                gap: 4,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: 2,
                backgroundColor: theme.colors.surfaceAlt,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text variant="caption" color="textMuted">{ATTRIBUTE_LABELS[key] ?? key}</Text>
              <Text variant="caption" color="brandTeal">{baseStats[key]}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {selected ? (
        <View
          style={{
            marginTop: theme.spacing.xs,
            paddingVertical: 4,
            paddingHorizontal: theme.spacing.md,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.primaryMuted,
          }}
        >
          <Text variant="caption" color="primary">
            Selecionado
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
