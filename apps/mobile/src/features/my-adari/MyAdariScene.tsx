import React, { useEffect, useRef, type PropsWithChildren } from 'react';
import { Animated, ImageBackground, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const OBSERVATORY_BACKGROUND = require('../../../assets/observatory/backgrounds/observatory-room-v1.png');

interface MyAdariSceneProps extends PropsWithChildren {
  reduceMotion: boolean;
  particlesEnabled: boolean;
}

/** Planos independentes produzem profundidade sem atualizar React durante os frames. */
export function MyAdariScene({ reduceMotion, particlesEnabled, children }: MyAdariSceneProps): React.ReactElement {
  const farDrift = useRef(new Animated.Value(-1)).current;
  const midPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      farDrift.setValue(0);
      midPulse.setValue(0.35);
      return undefined;
    }
    const drift = Animated.loop(Animated.sequence([
      Animated.timing(farDrift, { toValue: 1, duration: 7200, useNativeDriver: true }),
      Animated.timing(farDrift, { toValue: -1, duration: 7200, useNativeDriver: true }),
    ]));
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(midPulse, { toValue: 1, duration: 3100, useNativeDriver: true }),
      Animated.timing(midPulse, { toValue: 0, duration: 3100, useNativeDriver: true }),
    ]));
    drift.start();
    pulse.start();
    return () => { drift.stop(); pulse.stop(); };
  }, [farDrift, midPulse, reduceMotion]);

  const farX = farDrift.interpolate({ inputRange: [-1, 1], outputRange: [-4, 4] });
  const foregroundX = farDrift.interpolate({ inputRange: [-1, 1], outputRange: [3, -3] });
  const lightOpacity = midPulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.42] });

  return (
    <ImageBackground source={OBSERVATORY_BACKGROUND} resizeMode="cover" style={styles.scene} imageStyle={styles.backgroundImage}>
      <View pointerEvents="none" style={styles.depthShade} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateX: farX }] }]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 160" preserveAspectRatio="none">
          <Defs>
            <RadialGradient id="skyGlow" cx="50%" cy="30%" rx="65%" ry="55%">
              <Stop offset="0" stopColor="#7FC9C3" stopOpacity="0.22" />
              <Stop offset="1" stopColor="#071426" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100" height="160" fill="url(#skyGlow)" />
          {particlesEnabled ? <><Circle cx="12" cy="20" r="0.7" fill="#F4D88A" opacity="0.8" /><Circle cx="84" cy="29" r="0.6" fill="#F7F1E7" opacity="0.7" /><Circle cx="74" cy="54" r="0.45" fill="#8CCDC6" opacity="0.8" /><Circle cx="24" cy="63" r="0.5" fill="#F7F1E7" opacity="0.55" /></> : null}
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.midLight, { opacity: lightOpacity }]} />
      <View pointerEvents="none" style={styles.floorLight} />
      {children}
      <Animated.View pointerEvents="none" style={[styles.foreground, { transform: [{ translateX: foregroundX }] }]}>
        <Svg width="100%" height="100%" viewBox="0 0 100 30" preserveAspectRatio="none">
          <Ellipse cx="50" cy="30" rx="57" ry="20" fill="#020A14" opacity="0.62" />
          <Ellipse cx="50" cy="28" rx="34" ry="6" fill="#C8A85B" opacity="0.12" />
        </Svg>
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1, overflow: 'hidden', backgroundColor: '#061426' },
  backgroundImage: { transform: [{ scale: 1.035 }] },
  depthShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,12,28,0.38)' },
  midLight: {
    position: 'absolute', width: '78%', height: '52%', alignSelf: 'center', top: '12%',
    borderRadius: 999, backgroundColor: '#8BCBC5', shadowColor: '#F4D88A', shadowOpacity: 0.2,
    shadowRadius: 28, elevation: 2,
  },
  floorLight: {
    position: 'absolute', left: '7%', right: '7%', top: '42%', height: '38%',
    borderRadius: 999, backgroundColor: 'rgba(231,199,112,0.08)',
    borderWidth: 1, borderColor: 'rgba(232,202,124,0.12)', transform: [{ scaleY: 0.48 }],
  },
  foreground: { position: 'absolute', left: -8, right: -8, bottom: -4, height: 120 },
});
