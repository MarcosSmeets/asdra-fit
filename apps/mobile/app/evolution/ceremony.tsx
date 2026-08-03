import {
  ADARI_STAGE_LABEL,
  AdariEvolutionStage,
  getAbilityById,
  getStageDefinitionByInt,
  stageFromInt,
  type AttributeSet,
} from '@ad-sidera/shared';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import {
  Button,
  ErrorState,
  LoadingState,
  PixelCard,
  Screen,
  StageBadge,
  Text,
} from '@/components';
import { AdariAnimator } from '@/components/adari/AdariAnimator';
import { ATTRIBUTE_LABELS } from '@/constants/labels';
import { resolveAdariManifest } from '@/content/adari';
import type { CreatureState } from '@/db/models';
import {
  evolutionOverview,
  evolveCreature,
  markEvolutionCeremonySeen,
  wasEvolutionCeremonySeen,
} from '@/services/creatureService';
import { useReducedMotion, useTheme } from '@/theme/ThemeProvider';

/** Sequência da cerimônia (spec §20). `confirm` antecede a persistência. */
type CeremonyPhase = 'loading' | 'unavailable' | 'confirm' | 'energy' | 'particles' | 'constellation' | 'silhouette' | 'reveal';

const SEQUENCE: readonly CeremonyPhase[] = ['energy', 'particles', 'constellation', 'silhouette', 'reveal'];
const PHASE_MS = 1300;

/** Estrelas da constelação cerimonial (posições fixas em % do palco). */
const CEREMONY_STARS: readonly { left: number; top: number }[] = [
  { left: 18, top: 22 }, { left: 34, top: 10 }, { left: 52, top: 18 },
  { left: 68, top: 8 }, { left: 82, top: 24 }, { left: 26, top: 38 },
  { left: 74, top: 40 }, { left: 50, top: 32 },
];

export default function EvolutionCeremonyScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const osReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<CeremonyPhase>('loading');
  const [creature, setCreature] = useState<CreatureState | null>(null);
  const [skippable, setSkippable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const evolvingLock = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pulse = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    setPhase('loading');
    setError(null);
    try {
      const [overview, seen] = await Promise.all([evolutionOverview(), wasEvolutionCeremonySeen()]);
      setSkippable(seen);
      if (!overview || !overview.available) {
        // Sem requisitos cumpridos (ou já Perfeita): nunca evolui por engano.
        setCreature(overview?.creature ?? null);
        setPhase('unavailable');
        return;
      }
      setCreature(overview.creature);
      setPhase('confirm');
    } catch {
      setError('Não foi possível preparar a cerimônia. Sua evolução continua segura.');
    }
  }, []);

  useEffect(() => {
    void load();
    return () => { timers.current.forEach(clearTimeout); };
  }, [load]);

  useEffect(() => {
    if (phase === 'loading' || phase === 'unavailable' || phase === 'confirm') return undefined;
    if (osReducedMotion) {
      pulse.setValue(0.5);
      return undefined;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 640, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 640, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [osReducedMotion, phase, pulse]);

  const finishReveal = useCallback(() => {
    setPhase('reveal');
    void markEvolutionCeremonySeen().then(() => setSkippable(true));
  }, []);

  const begin = useCallback(async () => {
    if (evolvingLock.current) return;
    evolvingLock.current = true;
    // Persistência ANTES de qualquer animação: a evolução vale mesmo se o app
    // fechar no meio da cerimônia (offline-safe; sync na fila).
    try {
      const result = await evolveCreature();
      if (!result || !result.history) {
        evolvingLock.current = false;
        setPhase('unavailable');
        return;
      }
      setCreature(result.creature);
      if (osReducedMotion) {
        finishReveal();
        return;
      }
      SEQUENCE.forEach((step, index) => {
        timers.current.push(setTimeout(() => {
          if (step === 'reveal') finishReveal();
          else setPhase(step);
        }, index * PHASE_MS));
      });
    } catch {
      evolvingLock.current = false;
      setError('Não foi possível iniciar a evolução. Tente novamente; nenhum progresso foi perdido.');
    }
  }, [finishReveal, osReducedMotion]);

  const skip = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    finishReveal();
  }, [finishReveal]);

  if (error) {
    return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;
  }
  if (phase === 'loading') return <Screen><LoadingState label="Reunindo energia estelar…" /></Screen>;

  if (phase === 'unavailable' || !creature) {
    return (
      <Screen testID="evolution-ceremony-screen">
        <Text variant="title">Cerimônia de Evolução</Text>
        <Text variant="body" color="textMuted">
          {creature && stageFromInt(creature.evolutionStage) === AdariEvolutionStage.PERFECT
            ? 'Seu Adari já alcançou a Evolução Perfeita.'
            : 'A evolução ainda não está disponível. Continue sua jornada — cada atividade aproxima o próximo estágio.'}
        </Text>
        <Button label="Ver Linha Evolutiva" variant="secondary" onPress={() => router.replace('/evolution/line')} />
        <Button label="Voltar" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const stageInt = creature.evolutionStage;
  const manifest = resolveAdariManifest(creature.creatureKey, stageInt);
  const stageDef = getStageDefinitionByInt(creature.creatureKey, stageInt);
  const ability = stageDef?.highlightedAbilityId ? getAbilityById(stageDef.highlightedAbilityId) : undefined;
  const boosts = stageDef
    ? (Object.entries(stageDef.statBoost) as [keyof AttributeSet, number][]).filter(([, value]) => value > 0)
    : [];
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.65] });
  const palette = theme.palette;

  if (phase === 'confirm') {
    return (
      <Screen testID="evolution-ceremony-screen">
        <Text variant="title">Cerimônia de Evolução</Text>
        <Text variant="body" color="textMuted">
          As constelações estão alinhadas. Quando você iniciar, a evolução é permanente
          e acontece agora mesmo — a cerimônia é só a celebração.
        </Text>
        <Button label="Iniciar evolução" onPress={() => void begin()} />
        <Button label="Voltar" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen padded={false} testID="evolution-ceremony-screen">
      <View style={[styles.stage, { backgroundColor: palette.cosmic.deepest }]}>
        {/* energia: brilho pulsante no centro do palco */}
        <Animated.View pointerEvents="none" style={[styles.glow, {
          opacity: glowOpacity,
          backgroundColor: phase === 'energy' ? palette.stellar.gold : palette.energy.violet,
        }]} />
        {/* partículas e constelações: pixels acesos por fase */}
        {(phase === 'particles' || phase === 'constellation' || phase === 'silhouette') ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {CEREMONY_STARS.map((star, index) => (
              <Animated.View key={index} style={{
                position: 'absolute', left: `${star.left}%`, top: `${star.top}%`,
                width: theme.pixelUnit * 2, height: theme.pixelUnit * 2,
                backgroundColor: phase === 'constellation' ? palette.stellar.lightGold : palette.energy.cyan,
                opacity: glowOpacity,
              }} />
            ))}
          </View>
        ) : null}
        <View style={styles.center}>
          {phase === 'silhouette' ? (
            <Image source={manifest.silhouette} style={{ width: 220, height: 220 }} resizeMode="contain" />
          ) : phase === 'reveal' ? (
            <AdariAnimator
              creatureKey={creature.creatureKey}
              state="evolving"
              size={220}
              stage={stageInt}
              accessibilityLabel={`${stageDef?.name ?? 'Adari'} evoluiu.`}
              reduceMotion={osReducedMotion}
            />
          ) : (
            <AdariAnimator
              creatureKey={creature.creatureKey}
              state="happy"
              size={180}
              stage={Math.max(0, stageInt - 1)}
              accessibilityLabel="Adari reunindo energia."
              reduceMotion={osReducedMotion}
            />
          )}
        </View>
        {phase === 'reveal' ? (
          <View style={[styles.revealPanel, { padding: theme.spacing.lg }]}>
            <PixelCard variant="elevated" padding={theme.spacing.lg}>
              <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
                <Text variant="title" center>{stageDef?.name ?? 'Nova forma'}</Text>
                <StageBadge
                  label={ADARI_STAGE_LABEL[stageFromInt(stageInt)]}
                  perfect={stageFromInt(stageInt) === AdariEvolutionStage.PERFECT}
                />
                <Text variant="body" color="textMuted" center>{stageDef?.narrative}</Text>
                {boosts.length > 0 ? (
                  <Text variant="hud" color="brandGold" center>
                    {boosts.map(([key, value]) => `+${value} ${ATTRIBUTE_LABELS[key] ?? key}`).join(' · ')}
                  </Text>
                ) : null}
                {ability ? (
                  <Text variant="caption" color="brandTeal" center>
                    Habilidade em destaque: {ability.name}
                  </Text>
                ) : null}
                <Button label="Voltar para Meu Adari" onPress={() => router.replace('/(tabs)')} />
              </View>
            </PixelCard>
          </View>
        ) : (
          <View style={[styles.footer, { padding: theme.spacing.lg }]}>
            <Text variant="hud" color="brandGold" center accessibilityLiveRegion="polite">
              {phase === 'energy' ? 'A energia desperta…'
                : phase === 'particles' ? 'Partículas estelares se reúnem…'
                : phase === 'constellation' ? 'As constelações respondem…'
                : 'Uma nova silhueta se forma…'}
            </Text>
            {skippable ? (
              <Button label="Pular cerimônia" variant="ghost" onPress={skip} />
            ) : null}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, overflow: 'hidden', justifyContent: 'center' },
  glow: { position: 'absolute', alignSelf: 'center', top: '18%', width: '70%', height: '42%' },
  center: { alignItems: 'center', justifyContent: 'center', minHeight: 260 },
  revealPanel: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 8 },
});
