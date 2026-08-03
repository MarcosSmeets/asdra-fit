import {
  ADARI_STAGE_LABEL,
  AdariEvolutionStage,
  bondTierFor,
  displayNameForStage,
  FOOD_DEFINITIONS,
  FOOD_REGEN,
  foodRegenIntervalHours,
  getAdariBehaviorProfile,
  hoursUntilFullVigor,
  hoursUntilNextFood,
  levelFromTotalXp,
  satietyLabel,
  stageFromInt,
} from '@ad-sidera/shared';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  BottomSheet,
  Button,
  ErrorState,
  EvolutionBadge,
  LoadingState,
  PixelButton,
  PixelPanel,
  PixelSpeechBubble,
  PixelStatBar,
  ProgressBar,
  Screen,
  StageBadge,
  SyncStatus,
  Text,
} from '../../components';
import { AdariAnimator } from '../../components/adari/AdariAnimator';
import { resolveAdariManifest, resolveStageSize } from '../../content/adari';
import { FoodSprite } from '../../components/foods/FoodSprite';
import type { CreatureState, ObservatoryStateRecord } from '../../db/models';
import { useOnline } from '../../hooks/useOnline';
import { loadAdariDialogue } from '../../services/adariDialogueService';
import { attributeProgressFor, evolutionOverview } from '../../services/creatureService';
import { ATTRIBUTE_LABELS } from '../../constants/labels';
import { feedAdari, loadObservatory, petAdari, saveObservatoryState, type ObservatorySnapshot } from '../../services/observatoryService';
import { useGameStore } from '../../stores/gameStore';
import { useSessionStore } from '../../stores/sessionStore';
import { pendingSyncCount } from '../../sync/syncEngine';
import { useTheme } from '../../theme/ThemeProvider';
import { nowIso } from '../../utils/datetime';
import {
  ADARI_VISUAL_STATE_LABELS,
  reduceMyAdariState,
  visualStateForScreenState,
  type AdariVisualState,
} from './state';
import { HomeActionEffects } from './HomeActionEffects';
import { adariHomeBaseSize } from './homeSceneLayers';
import { MyAdariScene } from './MyAdariScene';
import { AdariHabitat } from './AdariHabitat';

type Sheet = 'food' | 'rest' | 'settings' | null;

/** Espera de reposição em texto curto ("2h30", "45 min"). */
function formatRefill(hours: number): string {
  if (hours <= 0) return 'instantes';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return minutes > 0 ? `${whole}h${String(minutes).padStart(2, '0')}` : `${whole}h`;
}

function DirectAction({ label, hint, onPress, disabled = false, prominent = false }: {
  label: string; hint: string; onPress: () => void; disabled?: boolean; prominent?: boolean;
}) {
  return (
    <View style={styles.action}>
      <PixelButton
        label={label}
        onPress={onPress}
        disabled={disabled}
        variant={prominent ? 'primary' : 'secondary'}
        accessibilityHint={hint}
      />
    </View>
  );
}

export function MyAdariScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ reaction?: string }>();
  const online = useOnline();
  const mode = useSessionStore((state) => state.mode);
  const currentWeek = useGameStore((state) => state.currentWeek);
  const { width, height } = useWindowDimensions();
  const [snapshot, setSnapshot] = useState<ObservatorySnapshot | null>(null);
  const [screenState, dispatch] = useReducer(reduceMyAdariState, 'loadingEssentialAssets');
  const [visualOverride, setVisualOverride] = useState<AdariVisualState | null>(null);
  const [message, setMessage] = useState('');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [activeFoodKey, setActiveFoodKey] = useState<string | null>(null);
  const [evolutionAvailable, setEvolutionAvailable] = useState(false);
  const [restingMode, setRestingMode] = useState(false);
  /** Atributo destacado temporariamente ao voltar de uma atividade. */
  const [trainedHighlight, setTrainedHighlight] = useState<string | null>(null);
  // Relógio congelado na abertura do inventário: a contagem de reposição não
  // pode mudar a cada re-render enquanto a folha está aberta.
  const [foodClock, setFoodClock] = useState(() => nowIso());
  const interactionLock = useRef(false);
  const restingRef = useRef(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleReady = useCallback((delayMs = 900) => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      interactionLock.current = false;
      setVisualOverride(null);
      setActiveFoodKey(null);
      dispatch('COMPLETE');
    }, delayMs);
  }, []);

  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

  const refresh = useCallback(async (essential = false) => {
    if (essential) dispatch('RETRY');
    setError(null);
    try {
      await useGameStore.getState().load();
      const loaded = await loadObservatory();
      setSnapshot(loaded);
      const week = useGameStore.getState().currentWeek;
      // O modo descanso é um toggle do usuário: sobrevive a re-focos da aba.
      const reactionState: AdariVisualState = restingRef.current
        ? (new Date().getHours() >= 22 ? 'sleeping' : 'resting')
        : params.reaction === 'activity'
          ? 'excitedAfterActivity'
          : loaded.creature.attributes.energy < Math.max(15, loaded.creature.maxVigor * 0.2) ? 'tired' : 'idle';
      setVisualOverride(reactionState === 'idle' ? null : reactionState);
      setMessage(await loadAdariDialogue({
        creatureKey: loaded.creature.creatureKey,
        bond: loaded.creature.bond,
        vigor: loaded.creature.attributes.energy,
        maxVigor: loaded.creature.maxVigor,
        satiety: loaded.creature.satiety,
        weeklyRemaining: week ? Math.max(0, week.targetCount - week.validActivityCount) : undefined,
        state: reactionState,
      }));
      if (mode === 'account') setPending(await pendingSyncCount());
      setEvolutionAvailable((await evolutionOverview())?.available ?? false);
      // Depois de treinar, o Adari comenta o que ficou mais forte.
      if (params.reaction === 'activity') {
        const progress = await attributeProgressFor(loaded.creature);
        const strongest = [...progress].sort((a, b) => b.trainingProgress - a.trainingProgress)[0];
        setTrainedHighlight(strongest?.attribute ?? null);
        if (strongest) {
          setMessage(`Nosso treino fortaleceu minha ${(ATTRIBUTE_LABELS[strongest.attribute] ?? strongest.attribute).toLowerCase()}.`);
        }
      } else {
        setTrainedHighlight(null);
      }
      dispatch('ASSETS_READY');
      if (reactionState === 'excitedAfterActivity') scheduleReady(1800);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível abrir Meu Adari.');
      dispatch('FAIL');
    }
  }, [mode, params.reaction, scheduleReady]);

  useFocusEffect(useCallback(() => {
    // A aba permanece montada ao navegar para Jornada/Passeio, então a trava de
    // interação criada na transição de saída precisa ser liberada ao voltar.
    interactionLock.current = false;
    void refresh(screenState === 'loadingEssentialAssets');
  // A carga de foco não depende do estado transitório para não formar um ciclo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]));

  const creature = snapshot?.creature ?? null;
  const stageInt = creature?.evolutionStage ?? 0;
  const manifest = useMemo(
    () => creature ? resolveAdariManifest(creature.creatureKey, stageInt) : null,
    [creature, stageInt],
  );
  const adariName = creature?.nickname
    || (creature ? displayNameForStage(creature.creatureKey, stageInt) : 'Adari');
  const visualState = visualOverride ?? visualStateForScreenState(screenState);
  const interactionDisabled = screenState !== 'ready' || interactionLock.current;
  // Presença do Build 6: ~12% maior que o Build 5, com limites de safe area
  // para não cortar cauda, asas nem chifres (ver homeSceneLayers).
  const baseAdariSize = adariHomeBaseSize(width, height);
  const adariSize = manifest ? resolveStageSize(manifest, 'home', baseAdariSize) : baseAdariSize;

  const updateCreature = useCallback((next: CreatureState) => {
    setSnapshot((current) => current ? { ...current, creature: next } : current);
  }, []);

  const performPet = useCallback(() => {
    if (interactionLock.current || screenState !== 'ready' || !creature) return;
    interactionLock.current = true;
    dispatch('PET');
    setVisualOverride('receivingAffection');
    setMessage(getAdariBehaviorProfile(creature.creatureKey).affectionReaction);
    void petAdari().then((result) => {
      updateCreature(result.creature);
      setMessage(result.interaction.bondGranted > 0
        ? `${adariName} recebeu seu carinho. Vínculo +${result.interaction.bondGranted}`
        : `${adariName} parece feliz com sua companhia.`);
    }).catch((cause: unknown) => {
      setMessage(cause instanceof Error ? cause.message : 'Seu carinho foi sentido neste dispositivo.');
    }).finally(() => scheduleReady(1050));
  }, [adariName, creature, scheduleReady, screenState, updateCreature]);

  const openFood = useCallback(() => {
    if (!interactionLock.current && screenState === 'ready') {
      setFoodClock(nowIso());
      setSheet('food');
    }
  }, [screenState]);

  const performFeed = useCallback((foodId: string) => {
    if (interactionLock.current || screenState !== 'ready' || !creature) return;
    interactionLock.current = true;
    setActiveFoodKey(FOOD_DEFINITIONS.find((food) => food.id === foodId)?.key ?? 'astral_fruit');
    setSheet(null);
    dispatch('FEED');
    setVisualOverride('eating');
    setMessage(`${adariName} se aproxima para experimentar o alimento.`);
    void feedAdari(foodId).then(async (result) => {
      if (!result.accepted) {
        setVisualOverride('refusingFood');
        setMessage('Estou satisfeito agora. Podemos guardar isso para depois.');
        return;
      }
      updateCreature(result.creature);
      setSnapshot(await loadObservatory());
      setMessage(result.favorite ? `${adariName} reconheceu um de seus alimentos favoritos!` : `${adariName} aproveitou a refeição.`);
    }).catch((cause: unknown) => {
      setMessage(cause instanceof Error ? cause.message : 'Não foi possível oferecer o alimento.');
    }).finally(() => scheduleReady(1200));
  }, [adariName, creature, scheduleReady, screenState, updateCreature]);

  const talk = useCallback(() => {
    if (interactionLock.current || screenState !== 'ready' || !creature) return;
    interactionLock.current = true;
    dispatch('TALK');
    setVisualOverride('talkingReaction');
    void loadAdariDialogue({
      creatureKey: creature.creatureKey,
      bond: creature.bond,
      vigor: creature.attributes.energy,
      maxVigor: creature.maxVigor,
      satiety: creature.satiety,
      weeklyRemaining: currentWeek ? Math.max(0, currentWeek.targetCount - currentWeek.validActivityCount) : undefined,
      state: 'talkingReaction',
    }).then(setMessage).finally(() => scheduleReady(1400));
  }, [creature, currentWeek, scheduleReady, screenState]);

  // Descanso é um TOGGLE: dorme até o usuário tocar em "Acordar".
  const toggleRest = useCallback(() => {
    if (restingRef.current) {
      restingRef.current = false;
      setRestingMode(false);
      setSheet(null);
      setVisualOverride('wakingUp');
      setMessage(`${adariName} desperta devagar, com o Vigor renovado pelo tempo.`);
      scheduleReady(900);
      return;
    }
    if (interactionLock.current || screenState !== 'ready') return;
    restingRef.current = true;
    setRestingMode(true);
    setVisualOverride(new Date().getHours() >= 22 ? 'sleeping' : 'resting');
    setMessage(`${adariName} se acomoda para descansar. Toque em Acordar quando quiser.`);
    setSheet('rest');
  }, [adariName, scheduleReady, screenState]);

  const closeRest = useCallback(() => { setSheet(null); }, []);

  const updateSettings = useCallback(async (patch: Partial<ObservatoryStateRecord>) => {
    const state = await saveObservatoryState(patch);
    setSnapshot((current) => current ? { ...current, state } : current);
  }, []);

  const goWithReaction = useCallback((state: AdariVisualState, route: '/walk' | '/(tabs)/journey') => {
    if (interactionLock.current || screenState !== 'ready') return;
    interactionLock.current = true;
    dispatch('TRANSITION');
    setVisualOverride(state);
    resetTimer.current = setTimeout(() => router.push(route), snapshot?.state.reduceMotion ? 0 : 360);
  }, [router, screenState, snapshot?.state.reduceMotion]);

  if (screenState === 'loadingEssentialAssets') return <Screen><LoadingState label="Despertando seu Adari…" /></Screen>;
  if (screenState === 'recoverableError' || error) {
    return <Screen><ErrorState message={error ?? 'Não foi possível abrir Meu Adari.'} onRetry={() => void refresh(true)} /></Screen>;
  }
  if (!snapshot || !creature) return <Redirect href="/onboarding" />;

  const xpProgress = levelFromTotalXp(creature.xp);
  const bondTier = bondTierFor(creature.bond);
  const restHours = hoursUntilFullVigor({
    currentVigor: creature.attributes.energy,
    maxVigor: creature.maxVigor,
    vigorRecoveryRate: creature.vigorRecoveryRate,
    lastVigorCalculationAt: creature.lastVigorCalculationAt,
  });

  return (
    <Screen padded={false} edges={['top']} testID="my-adari-screen">
      <MyAdariScene reduceMotion={snapshot.state.reduceMotion} particlesEnabled={snapshot.state.particlesEnabled}>
        <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: theme.spacing.md }]} keyboardShouldPersistTaps="handled">
          <View style={styles.topRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="title">{adariName}</Text>
              <View style={styles.stageRow}>
                <StageBadge
                  label={ADARI_STAGE_LABEL[stageFromInt(stageInt)]}
                  perfect={stageFromInt(stageInt) === AdariEvolutionStage.PERFECT}
                />
                <Text variant="caption" color="textMuted">Nível {creature.level} · {bondTier.label}</Text>
              </View>
            </View>
            <PixelButton label="Ajustes" variant="ghost" fullWidth={false}
              onPress={() => setSheet('settings')}
              accessibilityHint="Abre as preferências de Meu Adari." />
          </View>

          <PixelPanel variant="surface" padding={10}>
            <View accessible accessibilityLabel={`XP ${xpProgress.xpIntoLevel} de ${Number.isFinite(xpProgress.xpForLevel) ? xpProgress.xpForLevel : 'máximo'}`} style={{ gap: 4 }}>
              <View style={styles.metricHeader}>
                <Text variant="hud" color="brandGold">XP</Text>
                <Text variant="caption" color="textMuted">{xpProgress.xpIntoLevel}/{Number.isFinite(xpProgress.xpForLevel) ? xpProgress.xpForLevel : 'máx.'}</Text>
              </View>
              <ProgressBar value={xpProgress.progress} color="brandGold" height={8} />
            </View>
          </PixelPanel>

          {evolutionAvailable ? (
            <Pressable
              onPress={() => router.push('/evolution/line')}
              accessibilityRole="button"
              accessibilityLabel="Evolução disponível. Abre a Linha Evolutiva."
              style={{ alignSelf: 'center' }}
            >
              <EvolutionBadge />
            </Pressable>
          ) : null}

          <View style={styles.hero}>
            <AdariHabitat creatureKey={creature.creatureKey} state={visualState}
              reduceMotion={snapshot.state.reduceMotion} size={adariSize}
              shadow={manifest?.renderConfig.shadow}>
              {(sceneState) => <>
                <AdariAnimator creatureKey={creature.creatureKey} state={sceneState} size={adariSize}
                  stage={stageInt} interactionEnabled={!interactionDisabled && !restingMode}
                  onAffectionGesture={performPet}
                  accessibilityLabel={`${adariName}, ${ADARI_VISUAL_STATE_LABELS[sceneState]}. Toque ou deslize para fazer carinho.`}
                  reduceMotion={snapshot.state.reduceMotion} />
                <HomeActionEffects state={sceneState} enabled={snapshot.state.particlesEnabled}
                  reduceMotion={snapshot.state.reduceMotion} foodKey={activeFoodKey} />
              </>}
            </AdariHabitat>
          </View>

          <View style={styles.dialogue} accessible accessibilityLiveRegion="polite">
            <Text variant="hud" color="brandGold" center>{ADARI_VISUAL_STATE_LABELS[visualState]}</Text>
            <PixelSpeechBubble text={message} tail="center" />
          </View>

          {trainedHighlight ? (
            <PixelPanel variant="surface" padding={10}>
              <Text variant="hud" color="brandGold" center accessibilityLiveRegion="polite">
                ✦ {ATTRIBUTE_LABELS[trainedHighlight] ?? trainedHighlight} treinada neste treino
              </Text>
            </PixelPanel>
          ) : null}

          <PixelPanel variant="surface" padding={10}>
            <View style={styles.metrics}>
              <View style={styles.metric}>
                <PixelStatBar label="Vigor" current={creature.attributes.energy} max={creature.maxVigor} color="brandTeal" />
              </View>
              <View style={styles.metric}>
                <PixelStatBar label="Vínculo" current={creature.bond} max={100} color="brandGold" />
              </View>
              <View style={styles.metric}>
                <PixelStatBar label="Saciedade" current={creature.satiety} max={100} color="brandTeal" />
              </View>
            </View>
          </PixelPanel>

          <View style={styles.actions}>
            <DirectAction label="Fazer carinho" hint="Reage imediatamente e pode aumentar o Vínculo." onPress={performPet} disabled={interactionDisabled || restingMode} />
            <DirectAction label="Alimentar" hint="Abre o inventário local." onPress={openFood} disabled={interactionDisabled || restingMode} />
            <DirectAction label="Conversar" hint="Mostra uma fala contextual do Adari." onPress={talk} disabled={interactionDisabled || restingMode} />
            <DirectAction
              label={restingMode ? 'Acordar' : 'Descansar'}
              hint={restingMode ? 'Desperta seu Adari do descanso.' : 'Seu Adari descansa até você tocar em Acordar.'}
              onPress={toggleRest}
              disabled={!restingMode && interactionDisabled}
            />
            <DirectAction label="Status" hint="Mostra todos os status, atributos e habilidades do Adari." onPress={() => router.push('/adari')} disabled={screenState !== 'ready'} />
            <DirectAction label="Como evoluir" hint="Mostra a linha evolutiva e o progresso de cada requisito." onPress={() => router.push('/evolution/line')} disabled={screenState !== 'ready'} />
            <DirectAction label="Registrar atividade" hint="Registra uma atividade e suas recompensas." onPress={() => router.push('/activity/new')} disabled={interactionDisabled} prominent />
            <DirectAction label="Passear" hint="Abre um passeio guiado com seu Adari." onPress={() => goWithReaction('askingForWalk', '/walk')} disabled={interactionDisabled || restingMode} />
            <DirectAction label="Ir para a Jornada" hint="Abre o mapa de desafios." onPress={() => goWithReaction('battleReady', '/(tabs)/journey')} disabled={interactionDisabled || restingMode} />
          </View>

          {(!online || pending > 0) ? <SyncStatus mode={mode} online={online} pending={pending} /> : null}
          {__DEV__ ? <Text variant="caption" color="textMuted" style={styles.debug}>estado: {screenState} · visual: {visualState} · sync: {pending}</Text> : null}
        </ScrollView>
      </MyAdariScene>

      <BottomSheet visible={sheet === 'food'} onClose={() => setSheet(null)} title="Alimentar">
        <Text variant="body" color="textMuted">Saciedade: {creature.satiety}/100 · {satietyLabel(creature.satiety)}</Text>
        <Text variant="caption" color="textMuted">
          Os alimentos se repõem sozinhos com o tempo — os mais leves voltam primeiro.
        </Text>
        <ScrollView style={{ maxHeight: 390 }} contentContainerStyle={{ gap: 8 }}>
          {FOOD_DEFINITIONS.map((food) => {
            const item = snapshot.inventory.find((entry) => entry.foodDefinitionId === food.id);
            const quantity = item?.quantity ?? 0;
            const favorite = food.preferredByAdariKeys.includes(creature.creatureKey);
            const full = quantity >= FOOD_REGEN.MAX_PER_FOOD;
            const refill = full || !item
              ? null
              : hoursUntilNextFood(food, { quantity, updatedAt: item.updatedAt }, foodClock);
            const refillLabel = full
              ? 'Estoque cheio'
              : refill !== null ? `Repõe em ${formatRefill(refill)}` : `Repõe a cada ${foodRegenIntervalHours(food)}h`;
            return (
              <Pressable key={food.id} disabled={quantity <= 0} onPress={() => performFeed(food.id)} accessibilityRole="button" accessibilityLabel={`${food.name}, quantidade ${quantity}, efeito ${food.satietyValue} de Saciedade${favorite ? ', favorito' : ''}. ${refillLabel}`} style={[styles.food, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt, opacity: quantity > 0 ? 1 : 0.72 }]}>
                <FoodSprite foodKey={food.key} name={food.name} size={58} />
                <View style={{ flex: 1 }}>
                  <Text variant="label">{food.name} · {quantity}</Text>
                  <Text variant="caption" color="textMuted">+{food.satietyValue} Saciedade{favorite ? ' · favorito' : ''}</Text>
                  <Text variant="caption" color={quantity > 0 ? 'textMuted' : 'brandTeal'}>{refillLabel}</Text>
                </View>
              </Pressable>
            );
          })}
          {snapshot.inventory.every((item) => item.quantity <= 0) ? <Text variant="body" color="textMuted">O inventário está vazio agora — cada alimento volta sozinho com o tempo, e atividades adiantam a reposição.</Text> : null}
        </ScrollView>
      </BottomSheet>

      <BottomSheet visible={sheet === 'rest'} onClose={closeRest} title="Descanso">
        <Text variant="body">{adariName} está {visualState === 'sleeping' ? 'dormindo' : 'relaxando'} — e continua assim até você acordar.</Text>
        <Text variant="label" color="brandTeal">Vigor: {creature.attributes.energy}/{creature.maxVigor}</Text>
        <Text variant="body" color="textMuted">Recuperação: +{creature.vigorRecoveryRate} por hora</Text>
        <Text variant="body" color="textMuted">{restHours > 0 ? `Vigor máximo estimado em ${Math.floor(restHours)}h${String(Math.round((restHours % 1) * 60)).padStart(2, '0')}.` : 'Vigor completo.'}</Text>
        <Text variant="caption" color="textMuted">O descanso visual é afetivo; o Vigor continua recuperando com o aplicativo fechado.</Text>
        <Button label="Deixar descansando" variant="secondary" onPress={closeRest} />
        <Button label="Acordar agora" onPress={toggleRest} />
      </BottomSheet>

      <BottomSheet visible={sheet === 'settings'} onClose={() => setSheet(null)} title="Preferências">
        <Button label={`Movimento reduzido: ${snapshot.state.reduceMotion ? 'sim' : 'não'}`} variant="secondary" onPress={() => void updateSettings({ reduceMotion: !snapshot.state.reduceMotion })} />
        <Button label={`Partículas: ${snapshot.state.particlesEnabled ? 'ativas' : 'reduzidas'}`} variant="secondary" onPress={() => void updateSettings({ particlesEnabled: !snapshot.state.particlesEnabled })} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 10, paddingBottom: 24, gap: 10, flexGrow: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  hero: { alignItems: 'center', justifyContent: 'center', minHeight: 268, marginVertical: -12, overflow: 'visible' },
  dialogue: { alignSelf: 'center', width: '100%', maxWidth: 520, minHeight: 70, gap: 4 },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { flexGrow: 1, flexBasis: '30%', minWidth: 104 },
  food: { minHeight: 64, padding: 12, borderWidth: 1, flexDirection: 'row', gap: 12, alignItems: 'center' },
  debug: { textAlign: 'center' },
});
