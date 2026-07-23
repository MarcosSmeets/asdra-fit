import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  fullWidth = true,
  accessibilityHint,
  testID,
}: ButtonProps): React.ReactElement {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const backgrounds: Record<Variant, string> = {
    primary: theme.colors.primary,
    secondary: theme.colors.secondary,
    ghost: 'transparent',
    danger: theme.colors.error,
  };
  const textColors: Record<Variant, 'onPrimary' | 'onSecondary' | 'primary' | 'text'> = {
    primary: 'onPrimary',
    secondary: 'onSecondary',
    ghost: 'primary',
    danger: 'onPrimary',
  };

  const containerStyle: ViewStyle = {
    backgroundColor: backgrounds[variant],
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderWidth: variant === 'ghost' ? 1 : 0,
    borderColor: theme.colors.border,
    opacity: isDisabled ? 0.5 : 1,
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
  };

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(isDisabled), busy: Boolean(loading) }}
      style={({ pressed }) => [styles.base, containerStyle, pressed && !isDisabled ? styles.pressed : null]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.colors[textColors[variant] === 'primary' ? 'primary' : 'onPrimary']} />
        ) : (
          <Text variant="label" color={textColors[variant]} center>
            {label}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 48, justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  pressed: { transform: [{ scale: 0.98 }] },
});
