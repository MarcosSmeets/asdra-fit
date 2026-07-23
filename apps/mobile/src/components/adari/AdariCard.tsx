import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../Text';
import { AdariPortrait } from './AdariPortrait';

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
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      accessibilityLabel={`${name}, ${archetypeLabel}. ${personality}`}
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
