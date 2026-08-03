import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../Text';
import { PixelFrame } from './PixelFrame';

export type PixelBadgeTone = 'gold' | 'teal' | 'violet' | 'neutral' | 'success' | 'error';

export interface PixelBadgeProps {
  label: string;
  tone?: PixelBadgeTone;
  accessibilityLabel?: string;
}

/** Selo compacto com moldura pixel (estados, tipos, avisos curtos). */
export function PixelBadge({ label, tone = 'neutral', accessibilityLabel }: PixelBadgeProps): React.ReactElement {
  const theme = useTheme();
  const tones: Record<PixelBadgeTone, { fill: string; border: string; text: string }> = {
    gold: { fill: 'rgba(213,168,79,0.16)', border: theme.colors.brandGold, text: theme.colors.brandGold },
    teal: { fill: 'rgba(61,171,168,0.16)', border: theme.colors.brandTeal, text: theme.colors.brandTeal },
    violet: { fill: 'rgba(119,83,230,0.18)', border: theme.palette.energy.purple, text: theme.palette.energy.purple },
    neutral: { fill: theme.colors.surfaceAlt, border: theme.colors.border, text: theme.colors.textMuted },
    success: { fill: 'rgba(79,176,136,0.16)', border: theme.colors.success, text: theme.colors.success },
    error: { fill: 'rgba(224,101,95,0.16)', border: theme.colors.error, text: theme.colors.error },
  };
  const t = tones[tone];
  return (
    <View accessibilityLabel={accessibilityLabel ?? label} style={{ alignSelf: 'flex-start' }}>
      <PixelFrame fill={t.fill} border={t.border} padding={0}>
        <View style={{ paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs }}>
          <Text variant="hud" style={{ color: t.text, fontSize: theme.fontSize.xs }}>
            {label}
          </Text>
        </View>
      </PixelFrame>
    </View>
  );
}

export interface StageBadgeProps {
  /** Texto do estágio já resolvido pelo conteúdo (Base, EV 1, EV 2, Evolução Perfeita). */
  label: string;
  /** Perfeita ganha o tom dourado; demais, violeta tecnológico. */
  perfect?: boolean;
}

/** Selo do estágio evolutivo do Adari. Rótulos vêm do conteúdo, nunca daqui. */
export function StageBadge({ label, perfect = false }: StageBadgeProps): React.ReactElement {
  return <PixelBadge label={label} tone={perfect ? 'gold' : 'violet'} accessibilityLabel={`Estágio ${label}`} />;
}

export interface EvolutionBadgeProps {
  label?: string;
  onhint?: string;
}

/** Aviso pulsante de evolução disponível (usado na home e no Espelho Astral). */
export function EvolutionBadge({ label = 'Evolução disponível' }: EvolutionBadgeProps): React.ReactElement {
  return <PixelBadge label={`✦ ${label}`} tone="gold" accessibilityLabel={label} />;
}
