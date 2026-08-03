import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../Text';

export type PixelBarColor =
  | 'primary'
  | 'secondary'
  | 'brandGold'
  | 'brandTeal'
  | 'success'
  | 'warning'
  | 'error';

export interface PixelProgressBarProps {
  /** 0..1 (valores acima de 1 são exibidos cheios). */
  value: number;
  color?: PixelBarColor;
  height?: number;
  accessibilityLabel?: string;
}

/**
 * Barra de progresso pixel: trilho quadrado com borda dura e preenchimento
 * quantizado em blocos — o avanço "anda" em degraus, como HUD 32-bit.
 */
export function PixelProgressBar({
  value,
  color = 'primary',
  height = 12,
  accessibilityLabel,
}: PixelProgressBarProps): React.ReactElement {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(value, 1));
  const stepPct = 4; // blocos de 4% — visível sem esconder progresso pequeno
  const quantized = clamped === 0 ? 0 : Math.max(stepPct, Math.round((clamped * 100) / stepPct) * stepPct);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{
        height,
        backgroundColor: theme.colors.track,
        borderWidth: theme.pixelUnit / 2,
        borderColor: theme.colors.border,
        overflow: 'hidden',
      }}
    >
      <View style={{ width: `${quantized}%`, height: '100%', backgroundColor: theme.colors[color] }}>
        {/* highlight superior do preenchimento (luz dura) */}
        <View style={{ height: Math.max(1, theme.pixelUnit / 2), backgroundColor: 'rgba(245,245,255,0.35)' }} />
      </View>
    </View>
  );
}

export interface PixelStatBarProps {
  label: string;
  /** Valor atual e máximo exibidos como "atual/máximo". */
  current: number;
  max: number;
  color?: PixelBarColor;
  accessibilityLabel?: string;
}

/** Atributo com rótulo pixel + valor + barra (HUD de stats). */
export function PixelStatBar({
  label,
  current,
  max,
  color = 'brandGold',
  accessibilityLabel,
}: PixelStatBarProps): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="hud">{label}</Text>
        <Text variant="caption" color="textMuted">
          {current}/{max}
        </Text>
      </View>
      <PixelProgressBar
        value={max > 0 ? current / max : 0}
        color={color}
        accessibilityLabel={accessibilityLabel ?? `${label} ${current} de ${max}`}
      />
    </View>
  );
}

export interface EnergyMeterProps {
  /** Células preenchidas e total (ex.: vigor em blocos). */
  filled: number;
  total: number;
  color?: PixelBarColor;
  cellSize?: number;
  accessibilityLabel?: string;
}

/** Medidor segmentado em células — energia/vigor com leitura instantânea. */
export function EnergyMeter({
  filled,
  total,
  color = 'brandTeal',
  cellSize = 12,
  accessibilityLabel,
}: EnergyMeterProps): React.ReactElement {
  const theme = useTheme();
  const safeTotal = Math.max(1, total);
  const safeFilled = Math.max(0, Math.min(filled, safeTotal));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: safeTotal, now: safeFilled }}
      style={{ flexDirection: 'row', gap: theme.pixelUnit }}
    >
      {Array.from({ length: safeTotal }, (_, i) => (
        <View
          key={i}
          style={{
            width: cellSize,
            height: cellSize + 2,
            backgroundColor: i < safeFilled ? theme.colors[color] : theme.colors.track,
            borderWidth: theme.pixelUnit / 2,
            borderColor: theme.colors.border,
          }}
        />
      ))}
    </View>
  );
}
