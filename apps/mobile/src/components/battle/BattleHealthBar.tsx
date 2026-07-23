import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../../theme/ThemeProvider';
import { darkColors } from '../../theme/tokens';
import { normalizedBattleHealth } from '../../features/battle/healthAnimation';
import { Text } from '../Text';

export interface BattleHealthBarProps {
  current: number;
  max: number;
  label?: string;
  color?: 'success' | 'error';
  accessibilityLabel?: string;
}

/** Barra animada somente quando a Vida muda; nÃ£o gera atualizaÃ§Ãµes React por frame. */
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
  const fill = color === 'error' ? darkColors.error : darkColors.success;

  return (
    <View style={styles.root} accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel ?? `${label}: ${shown} de ${total}`}>
      <View style={styles.labels}>
        <Text variant="label" style={{ color: darkColors.text }}>{label}</Text>
        <Text variant="label" style={{ color: darkColors.textMuted }}>{shown}/{total}</Text>
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
  track: { height: 10, overflow: 'hidden', borderRadius: 999, backgroundColor: darkColors.surfaceElevated, borderWidth: 1, borderColor: darkColors.border },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999 },
  highlight: { position: 'absolute', left: 2, right: 2, top: 1, height: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.28)' },
});
