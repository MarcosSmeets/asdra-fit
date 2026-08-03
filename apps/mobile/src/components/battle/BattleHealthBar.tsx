import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../../theme/ThemeProvider';
import { pixelColors, pixelUnit } from '../../theme/tokens';
import { normalizedBattleHealth } from '../../features/battle/healthAnimation';
import { Text } from '../Text';

export interface BattleHealthBarProps {
  current: number;
  max: number;
  label?: string;
  color?: 'success' | 'error';
  accessibilityLabel?: string;
}

/** Barra animada somente quando a Vida muda; não gera atualizações React por frame. */
export function BattleHealthBar({
  current,
  max,
  label = 'Vida',
  color = 'success',
  accessibilityLabel,
}: BattleHealthBarProps): React.ReactElement {
  const reduced = useReducedMotion();
  const progress = normalizedBattleHealth(current, max);
  const animated = useRef(new Animated.Value(progress)).current;
  const shown = Math.max(0, Math.round(current));
  const total = Math.max(0, Math.round(max));

  useEffect(() => {
    const animation = Animated.timing(animated, {
      toValue: progress,
      duration: reduced ? 1 : 380,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [animated, progress, reduced]);

  const width = animated.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const fill = color === 'error' ? pixelColors.error : pixelColors.success;

  return (
    <View style={styles.root} accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel ?? `${label}: ${shown} de ${total}`}>
      <View style={styles.labels}>
        <Text variant="hud">{label}</Text>
        <Text variant="caption" color="textMuted">{shown}/{total}</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: fill, width }]} />
        <View pointerEvents="none" style={styles.highlight} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 4 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  track: { height: 12, overflow: 'hidden', backgroundColor: pixelColors.track, borderWidth: pixelUnit / 2, borderColor: pixelColors.border },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  highlight: { position: 'absolute', left: 0, right: 0, top: 0, height: pixelUnit / 2, backgroundColor: 'rgba(245,245,255,0.35)' },
});
