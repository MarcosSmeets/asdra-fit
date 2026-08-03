import type { AttributeTrainingDisplay } from '@ad-sidera/shared';
import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { ATTRIBUTE_LABELS } from '../../constants/labels';
import { useReducedMotion, useTheme } from '../../theme/ThemeProvider';
import { AttributeIcon, type AttributeIconKey } from '../icons/AttributeIcon';
import { Text } from '../Text';

export interface AttributeTrainingRowProps {
  row: AttributeTrainingDisplay;
  /** Quando falso, a barra já aparece cheia (animação pulada). */
  animate: boolean;
}

/**
 * Uma linha de "Atributos treinados": ícone, nome, valor atual, progresso
 * anterior → novo, pontos recebidos e barra que enche. Quando o atributo sobe
 * de fato, a linha ganha destaque próprio.
 */
export function AttributeTrainingRow({ row, animate }: AttributeTrainingRowProps): React.ReactElement {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const fill = useRef(new Animated.Value(row.previousProgress / row.progressRequired)).current;

  useEffect(() => {
    const target = row.currentProgress / row.progressRequired;
    if (!animate || reduced) {
      fill.setValue(target);
      return undefined;
    }
    // O atributo que subiu enche a barra até o fim e recomeça no excedente.
    const sequence = row.increased
      ? Animated.sequence([
          Animated.timing(fill, { toValue: 1, duration: 520, useNativeDriver: false }),
          Animated.timing(fill, { toValue: 0, duration: 1, useNativeDriver: false }),
          Animated.timing(fill, { toValue: target, duration: 380, useNativeDriver: false }),
        ])
      : Animated.timing(fill, { toValue: target, duration: 620, useNativeDriver: false });
    sequence.start();
    return () => sequence.stop();
  }, [animate, fill, reduced, row.currentProgress, row.increased, row.progressRequired]);

  const width = fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const label = ATTRIBUTE_LABELS[row.attribute] ?? row.attribute;

  return (
    <View
      accessible
      accessibilityLabel={
        `${label}: ${row.value}. Treino ${row.previousProgress} para ${row.currentProgress} de `
        + `${row.progressRequired}. Mais ${row.gained} pontos.`
        + (row.increased ? ` ${label} aumentou de ${row.previousValue} para ${row.value}.` : '')
      }
      style={{ gap: theme.spacing.xs }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <AttributeIcon
          attribute={row.attribute as AttributeIconKey}
          color={row.increased ? theme.colors.brandGold : theme.colors.brandTeal}
          size={18}
        />
        <Text variant="hud" style={{ flex: 1 }}>{label}</Text>
        <Text variant="label" color={row.increased ? 'brandGold' : 'text'}>{row.value}</Text>
        <Text variant="caption" color="textMuted">
          {row.previousProgress}/{row.progressRequired} → {row.currentProgress}/{row.progressRequired}
        </Text>
        <Text variant="label" color="success">+{row.gained}</Text>
      </View>

      <View style={{
        height: 10,
        backgroundColor: theme.colors.track,
        borderWidth: theme.pixelUnit / 2,
        borderColor: row.increased ? theme.colors.brandGold : theme.colors.border,
        overflow: 'hidden',
      }}>
        <Animated.View style={{
          width,
          height: '100%',
          backgroundColor: row.increased ? theme.colors.brandGold : theme.colors.brandTeal,
        }} />
      </View>

      {row.increased ? (
        <Text variant="hud" color="brandGold" accessibilityLiveRegion="polite">
          {label.toUpperCase()} AUMENTOU! {row.previousValue} → {row.value}
        </Text>
      ) : null}
    </View>
  );
}
