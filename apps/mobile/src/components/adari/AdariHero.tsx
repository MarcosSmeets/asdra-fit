import { levelFromTotalXp } from '@ad-sidera/shared';
import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useReducedMotion, useTheme } from '../../theme/ThemeProvider';
import { ProgressBar } from '../ProgressBar';
import { Text } from '../Text';
import { AdariPortrait, type AdariMood } from './AdariPortrait';

export interface AdariHeroProps {
  creatureKey: string;
  name: string;
  level: number;
  xp: number;
  evolved?: boolean;
  mood?: AdariMood;
  message?: string;
  size?: number;
}

/** Protagonista da home/escolha: retrato grande + nome + nível + XP + mensagem. */
export function AdariHero({
  creatureKey,
  name,
  level,
  xp,
  evolved,
  mood = 'normal',
  message,
  size = 156,
}: AdariHeroProps): React.ReactElement {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const float = useRef(new Animated.Value(0)).current;
  const progress = levelFromTotalXp(xp).progress;

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float, reduceMotion]);

  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        <AdariPortrait creatureKey={creatureKey} size={size} mood={mood} evolved={evolved} />
      </Animated.View>
      <Text variant="title" center>
        {name}
      </Text>
      <Text variant="label" color="brandGold">
        Nível {level}
      </Text>
      <View style={{ alignSelf: 'stretch', paddingHorizontal: theme.spacing.xl }}>
        <ProgressBar value={progress} color="brandGold" accessibilityLabel={`Progresso de XP do nível ${level}`} />
      </View>
      {message ? (
        <Text variant="body" color="textMuted" center>
          {message}
        </Text>
      ) : null}
    </View>
  );
}
