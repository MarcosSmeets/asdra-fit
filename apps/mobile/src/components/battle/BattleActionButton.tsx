import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { PixelFrame } from '../pixel/PixelFrame';
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

/**
 * Botão de ação da batalha na pele pixel: moldura recortada, sombra dura e
 * afundamento ao pressionar. Suporta rótulo principal + secundário (custo).
 * Alvo de toque ≥48px; máx. 4 habilidades por grade (equippedAbilities).
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
  const theme = useTheme();
  const skins: Record<BattleActionVariant, { fill: string; border: string; fg: string; sub: string }> = {
    primary: {
      fill: theme.colors.brandGold,
      border: theme.palette.stellar.lightGold,
      fg: theme.colors.onPrimary,
      sub: theme.colors.onPrimary,
    },
    secondary: {
      fill: theme.colors.surfaceElevated,
      border: theme.colors.border,
      fg: theme.colors.text,
      sub: theme.colors.textMuted,
    },
    accent: {
      fill: theme.colors.brandTeal,
      border: theme.palette.energy.cyan,
      fg: theme.colors.onSecondary,
      sub: theme.colors.onSecondary,
    },
    ghost: {
      fill: 'transparent',
      border: theme.colors.border,
      fg: theme.colors.text,
      sub: theme.colors.textMuted,
    },
  };
  const skin = skins[variant];

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={sublabel ? `${label}, ${sublabel}` : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={{ alignSelf: fullWidth ? 'stretch' : 'flex-start', opacity: disabled ? 0.45 : 1 }}
    >
      {({ pressed }) => (
        <PixelFrame
          fill={skin.fill}
          border={skin.border}
          shadow={variant !== 'ghost'}
          padding={0}
          style={pressed && !disabled
            ? { transform: [{ translateX: theme.pixelUnit }, { translateY: theme.pixelUnit }] }
            : undefined}
        >
          <View style={styles.content}>
            <Text variant="hud" center style={{ color: skin.fg }}>
              {label}
            </Text>
            {sublabel ? (
              <Text variant="caption" center style={{ color: skin.sub }}>
                {sublabel}
              </Text>
            ) : null}
          </View>
        </PixelFrame>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    minHeight: 56,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
});
