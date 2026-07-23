import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import type { AdariVisualState } from './state';
import { FoodSprite } from '../../components/foods/FoodSprite';

export function HomeActionEffects({ state, enabled, reduceMotion, foodKey }: {
  state: AdariVisualState;
  enabled: boolean;
  reduceMotion: boolean;
  foodKey?: string | null;
}): React.ReactElement | null {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.stopAnimation();
    progress.setValue(0);
    if (reduceMotion) {
      progress.setValue(1);
      return undefined;
    }
    const animation = Animated.timing(progress, { toValue: 1, duration: state === 'eating' ? 760 : 620, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion, state]);

  if (!enabled && !['sleeping', 'resting'].includes(state)) return null;
  const rise = progress.interpolate({ inputRange: [0, 1], outputRange: [18, -34] });
  const feedX = progress.interpolate({ inputRange: [0, 1], outputRange: [92, 0] });
  const opacity = progress.interpolate({ inputRange: [0, 0.15, 0.82, 1], outputRange: [0, 1, 1, 0] });

  if (state === 'eating' || state === 'refusingFood') {
    return <Animated.View pointerEvents="none" style={[styles.effect, { opacity,
      transform: [{ translateX: feedX }, { scale: progress }] }]}>
      <FoodSprite foodKey={foodKey ?? 'astral_fruit'} name="Alimento oferecido" size={64} />
    </Animated.View>;
  }
  if (state === 'receivingAffection' || state === 'happy' || state === 'excitedAfterActivity') {
    return <Animated.View pointerEvents="none" style={[styles.effect, { opacity, transform: [{ translateY: rise }] }]}><Text style={styles.sparkles}>{'\u2726  \u00B7  \u2661  \u00B7  \u2727'}</Text></Animated.View>;
  }
  if (state === 'talkingReaction' || state === 'curious') {
    return <Animated.View pointerEvents="none" style={[styles.effect, styles.talk, { opacity }]}><Text style={styles.talkText}>{'\u00B7  \u00B7  \u00B7'}</Text></Animated.View>;
  }
  if (state === 'sleeping' || state === 'resting') {
    return <Animated.View pointerEvents="none" style={[styles.effect, styles.sleep, { opacity: progress }]}><Text style={styles.sleepText}>z Z</Text></Animated.View>;
  }
  return null;
}

const styles = StyleSheet.create({
  effect: { position: 'absolute', top: '14%', alignSelf: 'center', zIndex: 4 },
  sparkles: { color: '#F6D985', fontSize: 25, textShadowColor: '#F6D985', textShadowRadius: 8 },
  talk: { top: '8%', right: '20%', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 2, backgroundColor: 'rgba(247,241,231,0.9)' },
  talkText: { color: '#17314A', fontSize: 20, fontWeight: '700' },
  sleep: { right: '21%', top: '11%' },
  sleepText: { color: '#DCE8F2', fontSize: 24, fontWeight: '700', textShadowColor: '#17314A', textShadowRadius: 5 },
});
