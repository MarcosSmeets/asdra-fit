import React, { useEffect, useRef, type PropsWithChildren } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import {
  AMBIENT_PARTICLES,
  ENVIRONMENTAL_GLOW_BANDS,
  FOREGROUND_PARTICLES,
} from './homeSceneLayers';

interface MyAdariSceneProps extends PropsWithChildren {
  reduceMotion: boolean;
  particlesEnabled: boolean;
}

/** Estrelas quadradas fixas (determinísticas) do plano distante, em % da cena. */
const FAR_STARS: readonly { left: number; top: number; size: number; bright: boolean }[] = [
  { left: 8, top: 6, size: 2, bright: true }, { left: 22, top: 14, size: 1, bright: false },
  { left: 37, top: 4, size: 1, bright: false }, { left: 52, top: 11, size: 2, bright: true },
  { left: 66, top: 5, size: 1, bright: false }, { left: 79, top: 16, size: 2, bright: false },
  { left: 91, top: 8, size: 1, bright: true }, { left: 14, top: 26, size: 1, bright: false },
  { left: 45, top: 22, size: 1, bright: true }, { left: 72, top: 27, size: 1, bright: false },
  { left: 88, top: 33, size: 1, bright: false }, { left: 29, top: 34, size: 2, bright: false },
];

/**
 * Cenário 2.5D da home em camadas (contrato em `homeSceneLayers.ts`):
 * Background → EnvironmentalGlow → (children: sombra + sprite + HUD) →
 * ForegroundParticles.
 *
 * A luz de ambiente é um HALO EM DEGRAUS (bandas concêntricas translúcidas),
 * não mais um retângulo teal sólido — aquele bloco de cor era o "fundo verde"
 * que aparecia recortado atrás do Adari.
 */
export function MyAdariScene({ reduceMotion, particlesEnabled, children }: MyAdariSceneProps): React.ReactElement {
  const theme = useTheme();
  const farDrift = useRef(new Animated.Value(-1)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      farDrift.setValue(0);
      pulse.setValue(0.5);
      return undefined;
    }
    const drift = Animated.loop(Animated.sequence([
      Animated.timing(farDrift, { toValue: 1, duration: 7200, useNativeDriver: true }),
      Animated.timing(farDrift, { toValue: -1, duration: 7200, useNativeDriver: true }),
    ]));
    const breathe = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 3100, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 3100, useNativeDriver: true }),
    ]));
    drift.start();
    breathe.start();
    return () => { drift.stop(); breathe.stop(); };
  }, [farDrift, pulse, reduceMotion]);

  const farX = farDrift.interpolate({ inputRange: [-1, 1], outputRange: [-4, 4] });
  const foregroundX = farDrift.interpolate({ inputRange: [-1, 1], outputRange: [3, -3] });
  // A luz respira de leve; nunca some por completo nem chega perto de opaca.
  const glowBreath = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });
  const particleOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.85] });

  const palette = theme.palette;

  return (
    <View style={[styles.scene, { backgroundColor: palette.cosmic.deepest }]}>
      {/* ── Background: céu em faixas duras + estrelas com parallax ───────── */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={{ flex: 3, backgroundColor: palette.cosmic.deepest }} />
        <View style={{ flex: 2, backgroundColor: palette.cosmic.deep }} />
        <View style={{ flex: 2, backgroundColor: palette.cosmic.midnight }} />
        <View style={{ flex: 1, backgroundColor: palette.cosmic.deep }} />
      </View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateX: farX }] }]}>
        {FAR_STARS.map((star, index) => (
          <View key={index} style={{
            position: 'absolute', left: `${star.left}%`, top: `${star.top}%`,
            width: star.size * theme.pixelUnit, height: star.size * theme.pixelUnit,
            backgroundColor: star.bright ? palette.stellar.lightGold : palette.stellar.white,
            opacity: star.bright ? 0.9 : 0.55,
          }} />
        ))}
        {particlesEnabled ? AMBIENT_PARTICLES.map((particle, index) => (
          <View key={`ambient-${index}`} style={{
            position: 'absolute', left: `${particle.left}%`, top: `${particle.top}%`,
            width: particle.size * theme.pixelUnit, height: particle.size * theme.pixelUnit,
            backgroundColor: palette.energy.cyan, opacity: 0.4,
          }} />
        )) : null}
      </Animated.View>

      {/* ── EnvironmentalGlow: halo concêntrico translúcido (nunca uma placa) ── */}
      <Animated.View pointerEvents="none" style={[styles.glowEnvelope, { opacity: glowBreath }]}>
        {ENVIRONMENTAL_GLOW_BANDS.map((band, index) => (
          <View
            key={index}
            style={{
              position: 'absolute',
              width: `${band.scale * 100}%`,
              height: `${band.scale * 100}%`,
              backgroundColor: palette.energy.violet,
              opacity: band.opacity,
            }}
          />
        ))}
      </Animated.View>

      {/* ── AdariShadow + AdariSprite + HUD (children) ────────────────────── */}
      {children}

      {/* ── ForegroundParticles: só abaixo da faixa do rosto ──────────────── */}
      {particlesEnabled ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: particleOpacity }]}>
          {FOREGROUND_PARTICLES.map((particle, index) => (
            <View key={index} style={{
              position: 'absolute', left: `${particle.left}%`, top: `${particle.top}%`,
              width: particle.size * theme.pixelUnit, height: particle.size * theme.pixelUnit,
              backgroundColor: palette.stellar.lightGold,
            }} />
          ))}
        </Animated.View>
      ) : null}

      {/* Vinheta inferior: dá profundidade sem tocar no personagem. */}
      <Animated.View pointerEvents="none" style={[styles.foreground, { transform: [{ translateX: foregroundX }] }]}>
        <View style={[styles.foregroundBand, { backgroundColor: palette.cosmic.deepest, opacity: 0.55 }]} />
        <View style={[styles.foregroundEdge, { backgroundColor: palette.stellar.gold, opacity: 0.14 }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1, overflow: 'hidden' },
  /** Envelope do halo: centraliza as bandas concêntricas atrás do personagem. */
  glowEnvelope: {
    position: 'absolute',
    left: '10%', right: '10%', top: '20%', height: '44%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foreground: { position: 'absolute', left: -8, right: -8, bottom: 0, height: 26, justifyContent: 'flex-end' },
  foregroundBand: { height: 18 },
  foregroundEdge: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
});
