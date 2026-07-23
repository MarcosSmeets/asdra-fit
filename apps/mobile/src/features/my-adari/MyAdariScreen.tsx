import {
  bondTierFor,
  FOOD_DEFINITIONS,
  getAdariBehaviorProfile,
  getCreatureByKey,
  hoursUntilFullVigor,
  levelFromTotalXp,
  satietyLabel,
} from '@ad-sidera/shared';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { BottomSheet, Button, ErrorState, LoadingState, ProgressBar, Screen, SyncStatus, Text } from '../../components';
import { AdariAnimator } from '../../components/adari/AdariAnimator';
import { FoodSprite } from '../../components/foods/FoodSprite';
import type { CreatureState, ObservatoryStateRecord } from '../../db/models';
import { useOnline } from '../../hooks/useOnline';
import { loadAdariDialogue } from '../../services/adariDialogueService';
import { feedAdari, loadObservatory, petAdari, saveObservatoryState, type ObservatorySnapshot } from '../../services/observatoryService';
import { useGameStore } from '../../stores/gameStore';
import { useSessionStore } from '../../stores/sessionStore';
import { pendingSyncCount } from '../../sync/syncEngine';
import { useTheme } from '../../theme/ThemeProvider';
import {
  ADARI_VISUAL_STATE_LABELS,
  reduceMyAdariState,
  visualStateForScreenState,
  type AdariVisualState,
} from './state';
import { HomeActionEffects } from './HomeActionEffects';
import { MyAdariScene } from './MyAdariScene';
import { AdariHabitat } from './AdariHabitat';

type Sheet = 'food' | 'rest' | 'settings' | null;

function DirectAction({ label, hint, onPress, disabled = false, prominent = false }: {
  label: string; hint: string; onPress: () => void; disabled?: boolean; prominent?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.action, {
        backgroundColor: prominent ? theme.colors.brandGold : 'rgba(8,24,44,0.88)',
        borderColor: prominent ? theme.colors.brandGold : 'rgba(247,241,231,0.24)',
        opacity: disabled ? 0.46 : pressed ? 0.72 : 1,
      }]}
    >
      <Text variant="label" style={{ color: prominent ? '#16233A' : '#FFFDF8' }} center>{label}</Text>
    </Pressable>
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
  const interactionLock = useRef(false);
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
      const reactionState: AdariVisualState = params.reaction === 'activity'
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
  const definition = creature ? getCreatureByKey(creature.creatureKey) : undefined;
  const adariName = creature?.nickname || definition?.name || 'Adari';
  const visualState = visualOverride ?? visualStateForScreenState(screenState);
  const interactionDisabled = screenState !== 'ready' || interactionLock.current;
  const adariSize = Math.max(220, Math.min(width * 0.82, height * 0.42, 350));

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
    if (!interactionLock.current && screenState === 'ready') setSheet('food');
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

  const rest = useCallback(() => {
    if (interactionLock.current || screenState !== 'ready') return;
    interactionLock.current = true;
    dispatch('REST');
    setVisualOverride(new Date().getHours() >= 22 ? 'sleeping' : 'resting');
    setMessage(`${adariName} se acomoda para descansar.`);
    setSheet('rest');
  }, [adariName, screenState]);

  const closeRest = useCallback(() => { setSheet(null); scheduleReady(280); }, [scheduleReady]);

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
            <View style={{ flex: 1 }}>
              <Text variant="title" style={styles.lightText}>{adariName}</Text>
              <Text variant="caption" style={styles.mutedLight}>Nível {creature.level} · {bondTier.label}</Text>
            </View>
            <Pressable onPress={() => setSheet('settings')} accessibilityRole="button" accessibilityLabel="Preferências de Meu Adari" style={styles.settingsButton}>
              <Text variant="label" style={styles.lightText}>Ajustes</Text>
            </Pressable>
          </View>

          <View style={styles.xpPanel} accessible accessibilityLabel={`XP ${xpProgress.xpIntoLevel} de ${xpProgress.xpForLevel}`}>
            <View style={styles.metricHeader}>
              <Text variant="caption" style={styles.mutedLight}>XP</Text>
              <Text variant="caption" style={styles.mutedLight}>{xpProgress.xpIntoLevel}/{Number.isFinite(xpProgress.xpForLevel) ? xpProgress.xpForLevel : 'máx.'}</Text>
            </View>
            <ProgressBar value={xpProgress.progress} color="brandGold" height={6} />
          </View>

          <View style={styles.hero}>
            <AdariHabitat creatureKey={creature.creatureKey} state={visualState}
              reduceMotion={snapshot.state.reduceMotion} size={adariSize}>
              {(sceneState) => <>
                <AdariAnimator creatureKey={creature.creatureKey} state={sceneState} size={adariSize}
                  evolved={creature.evolutionStage > 0} interactionEnabled={!interactionDisabled}
                  onAffectionGesture={performPet}
                  accessibilityLabel={`${adariName}, ${ADARI_VISUAL_STATE_LABELS[sceneState]}. Toque ou deslize para fazer carinho.`}
                  reduceMotion={snapshot.state.reduceMotion} />
                <HomeActionEffects state={sceneState} enabled={snapshot.state.particlesEnabled}
                  reduceMotion={snapshot.state.reduceMotion} foodKey={activeFoodKey} />
              </>}
            </AdariHabitat>
          </View>

          <View style={styles.dialogue} accessible accessibilityLiveRegion="polite">
            <Text variant="caption" style={styles.stateLabel}>{ADARI_VISUAL_STATE_LABELS[visualState]}</Text>
            <Text variant="body" style={styles.lightText} center>{message}</Text>
          </View>

          <View style={styles.metrics}>
            <View style={styles.metric}><Text variant="caption" style={styles.mutedLight}>Vigor {creature.attributes.energy}/{creature.maxVigor}</Text><ProgressBar value={creature.attributes.energy / creature.maxVigor} color="brandTeal" height={6} /></View>
            <View style={styles.metric}><Text variant="caption" style={styles.mutedLight}>Vínculo {creature.bond}/100</Text><ProgressBar value={creature.bond / 100} color="brandGold" height={6} /></View>
            <View style={styles.metric}><Text variant="caption" style={styles.mutedLight}>Saciedade {creature.satiety}/100</Text><ProgressBar value={creature.satiety / 100} color="brandTeal" height={6} /></View>
          </View>

          <View style={styles.actions}>
            <DirectAction label="Fazer carinho" hint="Reage imediatamente e pode aumentar o Vínculo." onPress={performPet} disabled={interactionDisabled} />
            <DirectAction label="Alimentar" hint="Abre o inventário local." onPress={openFood} disabled={interactionDisabled} />
            <DirectAction label="Conversar" hint="Mostra uma fala contextual do Adari." onPress={talk} disabled={interactionDisabled} />
            <DirectAction label="Descansar" hint="Mostra o repouso e a recuperação de Vigor." onPress={rest} disabled={interactionDisabled} />
            <DirectAction label="Registrar atividade" hint="Registra uma atividade e suas recompensas." onPress={() => router.push('/activity/new')} disabled={interactionDisabled} prominent />
            <DirectAction label="Passear" hint="Abre um passeio guiado com seu Adari." onPress={() => goWithReaction('askingForWalk', '/walk')} disabled={interactionDisabled} />
            <DirectAction label="Ir para a Jornada" hint="Abre o mapa de desafios." onPress={() => goWithReaction('battleReady', '/(tabs)/journey')} disabled={interactionDisabled} />
          </View>

          {(!online || pending > 0) ? <SyncStatus mode={mode} online={online} pending={pending} /> : null}
          {__DEV__ ? <Text variant="caption" style={styles.debug}>estado: {screenState} · visual: {visualState} · sync: {pending}</Text> : null}
        </ScrollView>
      </MyAdariScene>

      <BottomSheet visible={sheet === 'food'} onClose={() => setSheet(null)} title="Alimentar">
        <Text variant="body" color="textMuted">Saciedade: {creature.satiety}/100 · {satietyLabel(creature.satiety)}</Text>
        <ScrollView style={{ maxHeight: 390 }} contentContainerStyle={{ gap: 8 }}>
          {FOOD_DEFINITIONS.map((food) => {
            const quantity = snapshot.inventory.find((item) => item.foodDefinitionId === food.id)?.quantity ?? 0;
            const favorite = food.preferredByAdariKeys.includes(creature.creatureKey);
            return (
              <Pressable key={food.id} disabled={quantity <= 0} onPress={() => performFeed(food.id)} accessibilityRole="button" accessibilityLabel={`${food.name}, quantidade ${quantity}, efeito ${food.satietyValue} de Saciedade${favorite ? ', favorito' : ''}`} style={[styles.food, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt, opacity: quantity > 0 ? 1 : 0.45 }]}>
                <FoodSprite foodKey={food.key} name={food.name} size={58} />
                <View style={{ flex: 1 }}><Text variant="label">{food.name} · {quantity}</Text><Text variant="caption" color="textMuted">+{food.satietyValue} Saciedade{favorite ? ' · favorito' : ''}</Text></View>
              </Pressable>
            );
          })}
          {snapshot.inventory.every((item) => item.quantity <= 0) ? <Text variant="body" color="textMuted">Complete atividades e desafios para encontrar alimentos para seu Adari.</Text> : null}
        </ScrollView>
      </BottomSheet>

      <BottomSheet visible={sheet === 'rest'} onClose={closeRest} title="Descanso">
        <Text variant="body">{adariName} está {visualState === 'sleeping' ? 'dormindo' : 'relaxando'}.</Text>
        <Text variant="label" color="brandTeal">Vigor: {creature.attributes.energy}/{creature.maxVigor}</Text>
        <Text variant="body" color="textMuted">Recuperação: +{creature.vigorRecoveryRate} por hora</Text>
        <Text variant="body" color="textMuted">{restHours > 0 ? `Vigor máximo estimado em ${Math.floor(restHours)}h${String(Math.round((restHours % 1) * 60)).padStart(2, '0')}.` : 'Vigor completo.'}</Text>
        <Text variant="caption" color="textMuted">O descanso visual é afetivo; o Vigor continua recuperando com o aplicativo fechado.</Text>
        <Button label="Voltar para Meu Adari" onPress={closeRest} />
      </BottomSheet>

      <BottomSheet visible={sheet === 'settings'} onClose={() => setSheet(null)} title="Preferências">
        <Button label={`Movimento reduzido: ${snapshot.state.reduceMotion ? 'sim' : 'não'}`} variant="secondary" onPress={() => void updateSettings({ reduceMotion: !snapshot.state.reduceMotion })} />
        <Button label={`Partículas: ${snapshot.state.particlesEnabled ? 'ativas' : 'reduzidas'}`} variant="secondary" onPress={() => void updateSettings({ particlesEnabled: !snapshot.state.particlesEnabled })} />
        <Button label={`Música: ${snapshot.state.musicEnabled ? 'ativa' : 'desligada'}`} variant="secondary" onPress={() => void updateSettings({ musicEnabled: !snapshot.state.musicEnabled })} />
        <Button label={`Efeitos: ${snapshot.state.effectsEnabled ? 'ativos' : 'desligados'}`} variant="secondary" onPress={() => void updateSettings({ effectsEnabled: !snapshot.state.effectsEnabled })} />
        <Button label={`Vibração: ${snapshot.state.hapticsEnabled ? 'ativa' : 'desligada'}`} variant="secondary" onPress={() => void updateSettings({ hapticsEnabled: !snapshot.state.hapticsEnabled })} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 10, paddingBottom: 24, gap: 10, flexGrow: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lightText: { color: '#FFFDF8' },
  mutedLight: { color: '#D5DFE9' },
  settingsButton: { minHeight: 44, minWidth: 72, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(8,24,44,0.78)', borderWidth: 1, borderColor: 'rgba(247,241,231,0.22)' },
  xpPanel: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(8,24,44,0.76)', gap: 4 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  hero: { alignItems: 'center', justifyContent: 'center', minHeight: 240, marginVertical: -12, overflow: 'visible' },
  dialogue: { alignSelf: 'center', maxWidth: 520, minHeight: 70, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 18, backgroundColor: 'rgba(8,24,44,0.84)', alignItems: 'center', justifyContent: 'center', gap: 3 },
  stateLabel: { color: '#F4D88A', textTransform: 'uppercase', letterSpacing: 0.6 },
  metrics: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: 16, backgroundColor: 'rgba(8,24,44,0.82)' },
  metric: { flex: 1, minWidth: 0, gap: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { flexGrow: 1, flexBasis: '30%', minWidth: 104, minHeight: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  food: { minHeight: 64, padding: 12, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, alignItems: 'center' },
  debug: { color: '#C1CDDA', textAlign: 'center' },
});
