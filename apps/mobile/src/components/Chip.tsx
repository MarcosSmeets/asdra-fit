import React from 'react';
import { Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
}

export function Chip({ label, selected, onPress, testID }: ChipProps): React.ReactElement {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      accessibilityLabel={label}
      style={{
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: selected ? theme.colors.primaryMuted : theme.colors.surfaceAlt,
      }}
    >
      <Text variant="label" color={selected ? 'primary' : 'textMuted'}>
        {label}
      </Text>
    </Pressable>
  );
}
