import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { darkColors, radius, spacing } from '../../theme/tokens';
import { Text } from '../Text';

export type BattleActionVariant = 'primary' | 'secondary' | 'accent' | 'ghost';

export interface BattleActionButtonProps {
  label: string;
  /** Texto secundário (ex.: custo de energia "Custo 20"). */
  sublabel?: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: BattleActionVariant;
  fullWidth?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

interface Palette {
  bg: string;
  fg: string;
  sub: string;
  border: string;
}

const PALETTES: Record<BattleActionVariant, Palette> = {
  primary: { bg: darkColors.brandGold, fg: darkColors.onPrimary, sub: darkColors.onPrimary, border: 'transparent' },
  secondary: { bg: darkColors.surfaceElevated, fg: darkColors.text, sub: darkColors.textMuted, border: darkColors.border },
  accent: { bg: darkColors.brandTeal, fg: darkColors.onSecondary, sub: darkColors.onSecondary, border: 'transparent' },
  ghost: { bg: 'transparent', fg: darkColors.text, sub: darkColors.textMuted, border: darkColors.border },
};

/**
 * Botão de ação da batalha, adaptado ao fundo navy da arena. Suporta rótulo
 * principal + rótulo secundário (custo). Alvo de toque ≥48px.
 */
export function BattleActionButton({
  label,
  sublabel,
  onPress,
  disabled = false,
  variant = 'primary',
  fullWidth = true,
  accessibilityHint,
  testID,
}: BattleActionButtonProps): React.ReactElement {
  const p = PALETTES[variant];

  const container: ViewStyle = {
    backgroundColor: p.bg,
    borderColor: p.border,
    borderWidth: p.border === 'transparent' ? 0 : 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    opacity: disabled ? 0.45 : 1,
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
  };

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={sublabel ? `${label}, ${sublabel}` : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.base, container, pressed && !disabled ? styles.pressed : null]}
    >
      <View style={styles.content}>
        <Text variant="label" center style={{ color: p.fg }}>
          {label}
        </Text>
        {sublabel ? (
          <Text variant="caption" center style={{ color: p.sub }}>
            {sublabel}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 56, justifyContent: 'center' },
  content: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  pressed: { transform: [{ scale: 0.98 }] },
});
