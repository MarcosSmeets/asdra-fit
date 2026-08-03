import { TRAINABLE_ATTRIBUTES, type AttributeSet } from '@ad-sidera/shared';
import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { ATTRIBUTE_LABELS } from '../../constants/labels';
import { useReducedMotion, useTheme } from '../../theme/ThemeProvider';
import { PixelPanel } from '../pixel/PixelFrame';
import { Text } from '../Text';

export interface LevelUpCelebrationProps {
  adariName: string;
  fromLevel: number;
  toLevel: number;
  previousAttributes: AttributeSet;
  newAttributes: AttributeSet;
  animate: boolean;
}

/**
 * Etapa visual SEPARADA da recompensa comum: o nível fortalece o Adari inteiro,
 * então ganha o próprio momento, listando cada atributo que subiu.
 */
export function LevelUpCelebration({
  adariName,
  fromLevel,
  toLevel,
  previousAttributes,
  newAttributes,
  animate,
}: LevelUpCelebrationProps): React.ReactElement {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const glow = useRef(new Animated.Value(animate && !reduced ? 0 : 1)).current;

  useEffect(() => {
    if (!animate || reduced) {
      glow.setValue(1);
      return undefined;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 620, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.55, duration: 620, useNativeDriver: true }),
      ]),
      { iterations: 3 },
    );
    pulse.start();
    return () => pulse.stop();
  }, [animate, glow, reduced]);

  const gains = TRAINABLE_ATTRIBUTES.map((attribute) => ({
    attribute,
    previous: previousAttributes[attribute],
    next: newAttributes[attribute],
  })).filter((entry) => entry.next > entry.previous);

  return (
    <Animated.View style={{ alignSelf: 'stretch', opacity: glow }}>
      <PixelPanel variant="elevated" padding={theme.spacing.lg}>
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="title" color="brandGold" center accessibilityLiveRegion="polite">
            {adariName.toUpperCase()} ALCANÇOU O NÍVEL {toLevel}!
          </Text>
          <Text variant="caption" color="textMuted" center>
            Nível {fromLevel} → {toLevel}. Todos os atributos aumentaram.
          </Text>
          <View style={{ gap: 4, marginTop: theme.spacing.xs }}>
            {gains.map((entry) => (
              <View
                key={entry.attribute}
                accessible
                accessibilityLabel={`${ATTRIBUTE_LABELS[entry.attribute] ?? entry.attribute}: ${entry.previous} para ${entry.next}`}
                style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm }}
              >
                <Text variant="hud">{ATTRIBUTE_LABELS[entry.attribute] ?? entry.attribute}</Text>
                <Text variant="label" color="brandGold">
                  {entry.previous} → {entry.next}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </PixelPanel>
    </Animated.View>
  );
}
