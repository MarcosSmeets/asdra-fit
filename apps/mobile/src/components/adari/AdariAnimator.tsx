import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { useReducedMotion } from '../../theme/ThemeProvider';
import { pixelPalette } from '../../theme/tokens';
import { adariMotionFor, spriteAnimationFor } from '../../features/my-adari/animationCatalog';
import type { AdariVisualState } from '../../features/my-adari/state';
import { AdariActionSprite } from './AdariActionSprite';

export interface AdariAnimatorProps {
  creatureKey: string;
  state: AdariVisualState;
  size: number;
  /** Estágio evolutivo persistido (0..3). Ausente: deriva de `evolved`. */
  stage?: number;
  /** @deprecated Compat Build 4 (evoluído = EV 1). Prefira `stage`. */
  evolved?: boolean;
  interactionEnabled?: boolean;
  onAffectionGesture?: () => void;
  accessibilityLabel: string;
  reduceMotion?: boolean;
}

export function AdariAnimator({
  creatureKey,
  state,
  size,
  stage,
  evolved = false,
  interactionEnabled = false,
  onAffectionGesture,
  accessibilityLabel,
  reduceMotion = false,
}: AdariAnimatorProps): React.ReactElement {
  const osReducedMotion = useReducedMotion();
  const reduced = reduceMotion || osReducedMotion;
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.16)).current;
  const gestureStarted = useRef(false);

  useEffect(() => {
    spriteAnimationFor(creatureKey, state);
    const motion = adariMotionFor(state);
    scale.stopAnimation();
    translateX.stopAnimation();
    translateY.stopAnimation();
    rotate.stopAnimation();
    glow.stopAnimation();
    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
    rotate.setValue(0);
    glow.setValue(0.16);

    if (reduced) {
      scale.setValue(state === 'resting' || state === 'sleeping' ? 0.96 : 1);
      translateX.setValue(0);
      translateY.setValue(state === 'resting' || state === 'sleeping' ? 8 : 0);
      return undefined;
    }

    // idle é estático (decisão pós-Build 5): nenhum loop; animação só nas ações.
    if (state === 'idle') {
      return undefined;
    }

    let animation: Animated.CompositeAnimation;
    if (['happy', 'excitedAfterActivity', 'victory'].includes(state)) {
      animation = Animated.sequence([
        Animated.timing(scale, { toValue: 0.96, duration: motion.anticipationMs, useNativeDriver: true }),
        Animated.parallel([
          Animated.spring(scale, { toValue: 1.1, speed: 18, bounciness: 10, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(translateY, { toValue: -18, duration: motion.actionMs / 2, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: motion.actionMs / 2, useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(scale, { toValue: 1, duration: motion.returnMs, useNativeDriver: true }),
      ]);
    } else if (state === 'receivingAffection') {
      animation = Animated.sequence([
        Animated.timing(rotate, { toValue: -1, duration: motion.anticipationMs, useNativeDriver: true }),
        Animated.parallel([
          Animated.spring(scale, { toValue: 1.08, speed: 16, bounciness: 6, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.5, duration: motion.actionMs, useNativeDriver: true }),
        ]),
        Animated.delay(motion.reactionMs),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: motion.returnMs, useNativeDriver: true }),
          Animated.timing(rotate, { toValue: 0, duration: motion.returnMs, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.16, duration: motion.returnMs, useNativeDriver: true }),
        ]),
      ]);
    } else if (state === 'eating') {
      animation = Animated.sequence([
        Animated.timing(translateY, { toValue: 9, duration: motion.anticipationMs, useNativeDriver: true }),
        Animated.loop(Animated.sequence([
          Animated.timing(scale, { toValue: 0.97, duration: 110, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.03, duration: 110, useNativeDriver: true }),
        ]), { iterations: 3 }),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: motion.returnMs, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: motion.returnMs, useNativeDriver: true }),
        ]),
      ]);
    } else if (['refusingFood', 'takingDamage', 'defeat'].includes(state)) {
      // Deriva do catálogo em vez de 70/70/70/90 fixos: com os números soltos, o
      // MOTION_OVERRIDES.takingDamage era ignorado e a reação ao golpe terminava
      // antes de a fase correspondente começar a ser percebida.
      const halfAction = Math.round(motion.actionMs / 2);
      animation = Animated.sequence([
        Animated.timing(translateX, { toValue: -10, duration: motion.anticipationMs, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 10, duration: halfAction, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -7, duration: halfAction, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: motion.returnMs, useNativeDriver: true }),
      ]);
    } else if (['curious', 'talkingReaction', 'askingForWalk'].includes(state)) {
      animation = Animated.sequence([
        Animated.parallel([
          Animated.timing(rotate, { toValue: 1, duration: motion.actionMs, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.045, duration: motion.actionMs, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.34, duration: motion.actionMs, useNativeDriver: true }),
        ]),
        Animated.delay(motion.reactionMs),
        Animated.parallel([
          Animated.timing(rotate, { toValue: 0, duration: motion.returnMs, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: motion.returnMs, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.16, duration: motion.returnMs, useNativeDriver: true }),
        ]),
      ]);
    } else if (['resting', 'sleeping', 'tired'].includes(state)) {
      animation = Animated.loop(Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.95, duration: motion.actionMs * 2, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 10, duration: motion.actionMs * 2, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.1, duration: motion.actionMs * 2, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.975, duration: motion.actionMs * 2, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 7, duration: motion.actionMs * 2, useNativeDriver: true }),
        ]),
      ]));
    } else if (state === 'attacking') {
      animation = Animated.sequence([
        Animated.timing(translateX, { toValue: -10, duration: motion.anticipationMs, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 26, duration: motion.actionMs, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: motion.returnMs, useNativeDriver: true }),
      ]);
    } else if (state === 'defending') {
      animation = Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 0.94, duration: motion.anticipationMs, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.62, duration: motion.actionMs, useNativeDriver: true }),
        ]),
        Animated.delay(motion.reactionMs),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: motion.returnMs, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.16, duration: motion.returnMs, useNativeDriver: true }),
        ]),
      ]);
    } else {
      animation = Animated.sequence([
        Animated.timing(scale, { toValue: 1.04, duration: motion.actionMs, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: motion.returnMs, useNativeDriver: true }),
      ]);
    }
    animation.start();
    return () => animation.stop();
  }, [creatureKey, glow, reduced, rotate, scale, state, translateX, translateY]);

  const startGesture = (_event: GestureResponderEvent): void => {
    if (!interactionEnabled || gestureStarted.current) return;
    gestureStarted.current = true;
    onAffectionGesture?.();
  };
  const moveGesture = (event: GestureResponderEvent): void => {
    if (reduced) return;
    const width = Math.max(1, event.nativeEvent.locationX);
    rotate.setValue(width > size / 2 ? 0.35 : -0.35);
  };
  const endGesture = (): void => { gestureStarted.current = false; };
  const degrees = rotate.interpolate({ inputRange: [-1, 1], outputRange: ['-5deg', '5deg'] });

  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Toque ou deslize para fazer carinho."
      accessibilityState={{ disabled: !interactionEnabled }}
      onStartShouldSetResponder={() => interactionEnabled}
      onMoveShouldSetResponder={() => interactionEnabled}
      onResponderGrant={startGesture}
      onResponderMove={moveGesture}
      onResponderRelease={endGesture}
      onResponderTerminate={endGesture}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}
    >
      <Animated.View pointerEvents="none" style={[styles.contactLight, { width: size * 0.5, opacity: glow }]} />
      <Animated.View
        pointerEvents="none"
        style={{ transform: [{ translateX }, { translateY }, { rotate: degrees }, { scale }] }}
      >
        <AdariActionSprite
          creatureKey={creatureKey}
          state={state}
          size={size}
          stage={stage}
          evolved={evolved}
          reduceMotion={reduced}
          accessibilityLabel={accessibilityLabel}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * Luz de CONTATO: faixa baixa e larga junto ao chão, que reage às ações
   * (carinho, defesa). Não é um disco atrás do corpo — placas atrás do sprite
   * saíram no Build 6; a iluminação de ambiente pertence à cena.
   */
  contactLight: {
    position: 'absolute',
    bottom: '2%',
    height: 4,
    backgroundColor: pixelPalette.stellar.lightGold,
  },
});
