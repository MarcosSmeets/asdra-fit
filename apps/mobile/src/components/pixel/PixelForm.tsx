import React from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../Text';
import { PixelFrame } from './PixelFrame';

export interface PixelInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * Campo de texto com moldura pixel. Fonte SEMPRE sans (Inter) — nunca a
 * pixelada em inputs (spec §9). Mesma API do Input legado.
 */
export function PixelInput({ label, error, hint, style, ...rest }: PixelInputProps): React.ReactElement {
  const theme = useTheme();
  const [focused, setFocused] = React.useState(false);
  const borderColor = error ? theme.colors.error : focused ? theme.colors.brandTeal : theme.colors.border;
  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text variant="hud" color="textMuted" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <PixelFrame fill={theme.colors.surfaceAlt} border={borderColor} padding={0}>
        <TextInput
          placeholderTextColor={theme.colors.textMuted}
          accessibilityLabel={label}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, { color: theme.colors.text, fontFamily: theme.fontFamily.sans }, style]}
          {...rest}
        />
      </PixelFrame>
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

export interface PixelSelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export interface PixelSelectProps<T extends string> {
  label?: string;
  value: T | null;
  options: readonly PixelSelectOption<T>[];
  onChange: (value: T) => void;
  error?: string;
}

/** Seleção por lista de opções emolduradas (sem dropdown nativo). */
export function PixelSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
}: PixelSelectProps<T>): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text variant="hud" color="textMuted" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View style={{ gap: theme.spacing.sm }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
            >
              <PixelFrame
                fill={selected ? 'rgba(213,168,79,0.14)' : theme.colors.surfaceAlt}
                border={selected ? theme.colors.brandGold : theme.colors.border}
                padding={theme.spacing.md}
              >
                <Text variant="label" color={selected ? 'brandGold' : 'text'}>
                  {option.label}
                </Text>
                {option.description ? (
                  <Text variant="caption" color="textMuted">
                    {option.description}
                  </Text>
                ) : null}
              </PixelFrame>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text variant="caption" color="error" style={styles.helper}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

interface ToggleBaseProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

/** Caixa de seleção quadrada com marca em bloco. */
export function PixelCheckbox({ label, checked, onChange, disabled }: ToggleBaseProps): React.ReactElement {
  const theme = useTheme();
  const u = theme.pixelUnit;
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: Boolean(disabled) }}
      accessibilityLabel={label}
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: 44, opacity: disabled ? 0.45 : 1 }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderWidth: u / 2,
          borderColor: checked ? theme.colors.brandGold : theme.colors.border,
          backgroundColor: theme.colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <View style={{ width: 10, height: 10, backgroundColor: theme.colors.brandGold }} /> : null}
      </View>
      <Text variant="body">{label}</Text>
    </Pressable>
  );
}

/** Botão de rádio quadrado (pixel não tem círculos). */
export function PixelRadio({ label, checked, onChange, disabled }: ToggleBaseProps): React.ReactElement {
  const theme = useTheme();
  const u = theme.pixelUnit;
  return (
    <Pressable
      onPress={() => onChange(true)}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected: checked, disabled: Boolean(disabled) }}
      accessibilityLabel={label}
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: 44, opacity: disabled ? 0.45 : 1 }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderWidth: u / 2,
          borderColor: checked ? theme.colors.brandTeal : theme.colors.border,
          backgroundColor: theme.colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: '45deg' }],
        }}
      >
        {checked ? <View style={{ width: 10, height: 10, backgroundColor: theme.colors.brandTeal }} /> : null}
      </View>
      <Text variant="body">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { marginLeft: 2 },
  input: { minHeight: 46, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  helper: { marginLeft: 2 },
});
