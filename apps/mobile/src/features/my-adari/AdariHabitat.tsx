import { getAdariBehaviorProfile } from '@ad-sidera/shared';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { AdariStageRenderConfig } from '../../content/adari';
import { useTheme } from '../../theme/ThemeProvider';
import type { AdariVisualState } from './state';

const SPOTS: Record<string, readonly number[]> = {
  terravok: [0, -28, 0, 34, 0],
  lumora: [0, -62, 0, 58, 0],
  solivar: [0, 54, 0, -50, 0],
};

const DEFAULT_SHADOW: AdariStageRenderConfig['shadow'] = { widthRatio: 0.55, heightRatio: 0.1, offsetY: 0 };

/**
 * Palco do Adari na home: plataforma pixel em degraus (Views duras, sem SVG),
 * sombra de contato do renderConfig do estágio e o passeio de "curiosidade"
 * pelos pontos da cena preservado do Build 4.
 */
export function AdariHabitat({ creatureKey, state, reduceMotion, size, shadow = DEFAULT_SHADOW, roamingEnabled = false, children }: {
  creatureKey: string;
  state: AdariVisualState;
  reduceMotion: boolean;
  size: number;
  /** Sombra de contato por estágio (manifest.renderConfig.shadow). */
  shadow?: AdariStageRenderConfig['shadow'];
  /** Passeio pelos pontos da cena. Desligado por padrão: idle é estático. */
  roamingEnabled?: boolean;
  children: (sceneState: AdariVisualState) => React.ReactNode;
}): React.ReactElement {
  const theme = useTheme();
  const profile = useMemo(() => getAdariBehaviorProfile(creatureKey), [creatureKey]);
  const spots = SPOTS[creatureKey] ?? SPOTS.solivar!;
  const [spotIndex, setSpotIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const depthScale = useRef(new Animated.Value(1)).current;
  const roaming = roamingEnabled && state === 'idle' && !reduceMotion;

  useEffect(() => {
    if (!roaming) {
      setSpotIndex(0);
      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, speed: 8, bounciness: 3, useNativeDriver: true }),
        Animated.timing(depthScale, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
      return undefined;
    }
    const dwell = Math.max(4200, 7000 - profile.curiosityLevel * 2200);
    const interval = setInterval(() => setSpotIndex((index) => (index + 1) % spots.length), dwell);
    return () => clearInterval(interval);
  }, [depthScale, profile.curiosityLevel, roaming, spots.length, translateX]);

  useEffect(() => {
    const target = roaming ? (spots[spotIndex] ?? 0) : 0;
    Animated.parallel([
      Animated.spring(translateX, { toValue: target, speed: 6, bounciness: 2, useNativeDriver: true }),
      Animated.timing(depthScale, { toValue: target === 0 ? 1 : 0.94, duration: 520, useNativeDriver: true }),
    ]).start();
  }, [depthScale, roaming, spotIndex, spots, translateX]);

  const sceneState: AdariVisualState = state !== 'idle' ? state : (spots[spotIndex] ?? 0) === 0 ? 'idle' : 'curious';
  const palette = theme.palette;
  const platformWidth = size * 0.98;
  const step = theme.pixelUnit * 2;

  return (
    <View style={[styles.habitat, { minHeight: size * 0.78 }]}>
      {/* plataforma astral em degraus: três faixas empilhadas afunilando */}
      <View pointerEvents="none" style={[styles.platform, { width: platformWidth }]}>
        <View style={{
          alignSelf: 'center', width: platformWidth * 0.66, height: step,
          backgroundColor: palette.cosmic.indigo,
          borderColor: palette.neutral.border, borderTopWidth: 1,
        }} />
        <View style={{
          alignSelf: 'center', width: platformWidth * 0.86, height: step * 1.5,
          backgroundColor: palette.cosmic.midnight,
          borderColor: palette.energy.teal, borderTopWidth: 1,
        }} />
        <View style={{
          alignSelf: 'center', width: platformWidth, height: step * 2,
          backgroundColor: palette.neutral.panel,
          borderColor: palette.stellar.gold, borderTopWidth: 1,
        }} />
      </View>
      <Animated.View style={[styles.actor, { width: size, height: size,
        transform: [{ translateX }, { scale: depthScale }] }]}>
        <View pointerEvents="none" style={[styles.shadow, {
          width: size * shadow.widthRatio,
          height: size * shadow.heightRatio,
          backgroundColor: palette.cosmic.deepest,
          transform: [{ translateY: shadow.offsetY }, { scaleY: 0.58 }],
        }]} />
        {children(sceneState)}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  habitat: { alignItems: 'center', justifyContent: 'flex-end', overflow: 'visible' },
  platform: { position: 'absolute', bottom: '1%', opacity: 0.96 },
  actor: { alignItems: 'center', justifyContent: 'flex-end' },
  shadow: { position: 'absolute', bottom: '5%', opacity: 0.62 },
});
