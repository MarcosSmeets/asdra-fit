import { getAdariBehaviorProfile } from '@ad-sidera/shared';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Ellipse, G, Polygon } from 'react-native-svg';
import type { AdariVisualState } from './state';

const SPOTS: Record<string, readonly number[]> = {
  terravok: [0, -28, 0, 34, 0],
  lumora: [0, -62, 0, 58, 0],
  solivar: [0, 54, 0, -50, 0],
};

export function AdariHabitat({ creatureKey, state, reduceMotion, size, children }: {
  creatureKey: string;
  state: AdariVisualState;
  reduceMotion: boolean;
  size: number;
  children: (sceneState: AdariVisualState) => React.ReactNode;
}): React.ReactElement {
  const profile = useMemo(() => getAdariBehaviorProfile(creatureKey), [creatureKey]);
  const spots = SPOTS[creatureKey] ?? SPOTS.solivar!;
  const [spotIndex, setSpotIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const depthScale = useRef(new Animated.Value(1)).current;
  const roaming = state === 'idle' && !reduceMotion;

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
  return (
    <View style={[styles.habitat, { minHeight: size * 0.78 }]}>
      <View pointerEvents="none" style={[styles.rug, { width: size * 0.98, height: size * 0.42 }]}>
        <Svg width="100%" height="100%" viewBox="0 0 120 52">
          <Ellipse cx="60" cy="28" rx="57" ry="22" fill="#182E4A" stroke="#D8B967" strokeWidth="2" />
          <Ellipse cx="60" cy="27" rx="47" ry="16" fill="#29485B" stroke="#7CB7AC" strokeWidth="1" />
          <G fill="#E6CA79" opacity={0.82}>
            <Polygon points="60,10 64,22 77,22 67,29 71,41 60,34 49,41 53,29 43,22 56,22" />
          </G>
        </Svg>
      </View>
      <Animated.View style={[styles.actor, { width: size, height: size,
        transform: [{ translateX }, { scale: depthScale }] }]}>
        <View pointerEvents="none" style={[styles.shadow, { width: size * 0.55, height: size * 0.1 }]} />
        {children(sceneState)}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  habitat: { alignItems: 'center', justifyContent: 'flex-end', overflow: 'visible' },
  rug: { position: 'absolute', bottom: '2%', opacity: 0.95 },
  actor: { alignItems: 'center', justifyContent: 'flex-end' },
  shadow: { position: 'absolute', bottom: '5%', borderRadius: 999,
    backgroundColor: 'rgba(2,7,14,0.52)', transform: [{ scaleY: 0.58 }] },
});
