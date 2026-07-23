import React from 'react';
import { View } from 'react-native';
import { darkColors } from '../../theme/tokens';
import { ProgressBar } from '../ProgressBar';
import { Text } from '../Text';

export interface BattleEnergyBarProps {
  current: number;
  max: number;
  /** Rótulo exibido à esquerda (padrão "Energia"). */
  label?: string;
  /** Cor da barra — teal para o Adari, ouro para o adversário. */
  color?: 'brandTeal' | 'brandGold';
  accessibilityLabel?: string;
}

/**
 * Barra de energia da batalha (baseada em ProgressBar) com números atuais/máximos.
 * A energia nunca é comprada — vem das atividades e da recuperação natural.
 */
export function BattleEnergyBar({
  current,
  max,
  label = 'Energia',
  color = 'brandTeal',
  accessibilityLabel,
}: BattleEnergyBarProps): React.ReactElement {
  const shown = Math.max(0, Math.round(current));
  const total = Math.round(max);
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Text variant="label" style={{ color: darkColors.text }}>
          {label}
        </Text>
        <Text variant="label" style={{ color: darkColors.textMuted }}>
          {shown}/{total}
        </Text>
      </View>
      <ProgressBar
        value={total > 0 ? current / total : 0}
        color={color}
        height={8}
        accessibilityLabel={accessibilityLabel ?? `${label}: ${shown} de ${total}`}
      />
    </View>
  );
}
