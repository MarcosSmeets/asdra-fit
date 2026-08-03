import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../Text';
import { PixelFrame } from './PixelFrame';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface PixelButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
  testID?: string;
  /** Ícone opcional à esquerda do rótulo. */
  icon?: React.ReactNode;
}

/**
 * Botão pixel 32-bit: moldura recortada, sombra dura e efeito de "afundar"
 * ao pressionar (o quadro desliza sobre a própria sombra). Mesma API do
 * Button legado — as telas migram por troca de import.
 */
export function PixelButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  fullWidth = true,
  accessibilityHint,
  testID,
  icon,
}: PixelButtonProps): React.ReactElement {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const skins: Record<Variant, { fill: string; border: string; text: 'onPrimary' | 'onSecondary' | 'primary' | 'text' }> = {
    primary: { fill: theme.colors.primary, border: theme.palette.stellar.lightGold, text: 'onPrimary' },
    secondary: { fill: theme.colors.surfaceElevated, border: theme.colors.brandTeal, text: 'text' },
    ghost: { fill: 'transparent', border: theme.colors.border, text: 'primary' },
    danger: { fill: theme.colors.error, border: theme.palette.feedback.errorBright, text: 'onPrimary' },
  };
  const skin = skins[variant];

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(isDisabled), busy: Boolean(loading) }}
      style={{ alignSelf: fullWidth ? 'stretch' : 'flex-start', opacity: isDisabled ? 0.45 : 1 }}
    >
      {({ pressed }) => (
        <PixelFrame
          fill={skin.fill}
          border={skin.border}
          shadow={variant !== 'ghost'}
          padding={0}
          style={pressed && !isDisabled ? { transform: [{ translateX: theme.pixelUnit }, { translateY: theme.pixelUnit }] } : undefined}
        >
          <View
            style={{
              minHeight: 48,
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.sm,
            }}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors[skin.text]} />
            ) : (
              <>
                {icon ?? null}
                <Text variant="hud" color={skin.text} center>
                  {label}
                </Text>
              </>
            )}
          </View>
        </PixelFrame>
      )}
    </Pressable>
  );
}

export interface PixelIconButtonProps {
  icon: React.ReactNode;
  accessibilityLabel: string;
  onPress?: () => void;
  disabled?: boolean;
  size?: number;
  variant?: Variant;
  testID?: string;
}

/** Botão quadrado só de ícone (HUD, cabeçalhos, ações compactas). */
export function PixelIconButton({
  icon,
  accessibilityLabel,
  onPress,
  disabled,
  size = 48,
  variant = 'secondary',
  testID,
}: PixelIconButtonProps): React.ReactElement {
  const theme = useTheme();
  const skins: Record<Variant, { fill: string; border: string }> = {
    primary: { fill: theme.colors.primary, border: theme.palette.stellar.lightGold },
    secondary: { fill: theme.colors.surfaceElevated, border: theme.colors.border },
    ghost: { fill: 'transparent', border: theme.colors.border },
    danger: { fill: theme.colors.error, border: theme.palette.feedback.errorBright },
  };
  const skin = skins[variant];
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      {({ pressed }) => (
        <PixelFrame
          fill={skin.fill}
          border={skin.border}
          shadow
          padding={0}
          style={pressed && !disabled ? { transform: [{ translateX: theme.pixelUnit }, { translateY: theme.pixelUnit }] } : undefined}
        >
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
        </PixelFrame>
      )}
    </Pressable>
  );
}
