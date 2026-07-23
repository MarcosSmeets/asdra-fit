import React from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, style, ...rest }: InputProps): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text variant="label" color="textMuted" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel={label}
        style={[
          styles.input,
          {
            color: theme.colors.text,
            backgroundColor: theme.colors.surfaceAlt,
            borderColor: error ? theme.colors.error : theme.colors.border,
            borderRadius: theme.radius.md,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" color="error" style={styles.helper}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="textMuted" style={styles.helper}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { marginLeft: 2 },
  input: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, fontSize: 16 },
  helper: { marginLeft: 2 },
});
