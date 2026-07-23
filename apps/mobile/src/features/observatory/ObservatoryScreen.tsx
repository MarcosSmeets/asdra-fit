import {
  adariDialogue,
  bondTierFor,
  FOOD_DEFINITIONS,
  getAdariBehaviorProfile,
  getCreatureByKey,
  hoursUntilFullVigor,
  satietyLabel,
  vigorCostForBattle,
} from '@ad-sidera/shared';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  BottomSheet,
  Button,
  ErrorState,
  LoadingState,
  ProgressBar,
  Screen,
  SyncStatus,
  Text,
} from '../../components';
import type { CreatureState, ObservatoryStateRecord } from '../../db/models';
import { useOnline } from '../../hooks/useOnline';
import {
  feedAdari,
  loadObservatory,
  petAdari,
  saveObservatoryState,
  saveSafePlayerPosition,
  type ObservatorySnapshot,
} from '../../services/observatoryService';
import { useGameStore } from '../../stores/gameStore';
import { useSessionStore } from '../../stores/sessionStore';
import { pendingSyncCount } from '../../sync/syncEngine';
import { useTheme } from '../../theme/ThemeProvider';
import { ObservatoryScene } from './ObservatoryScene';
import { runtimeForInteraction, type ObservatoryRuntimeState } from './runtime';
import type { InteractiveObject } from './world';
import { FoodSprite } from '../../components/foods/FoodSprite';

type Sheet = 'menu' | 'nest' | 'food' | 'pet' | 'tutorial' | null;

export function ObservatoryScreen(): React.ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const online = useOnline();
  const mode = useSessionStore((state) => state.mode);
  const { currentWeek, campaign, dailyBattle } = useGameStore();
  const [snapshot, setSnapshot] = useState<ObservatorySnapshot | null>(null);
  const [target, setTarget] = useState<InteractiveObject | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [runtime, setRuntime] = useState<ObservatoryRuntimeState>({ type: 'loadingAssets' });
  const [sceneActive, setSceneActive] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      await useGameStore.getState().load();
      const loaded = await loadObservatory();
      setSnapshot(loaded);
      const loadedWeek = useGameStore.getState().currentWeek;
      setMessage(
        adariDialogue({
          creatureKey: loaded.creature.creatureKey,
          bond: loaded.creature.bond,
          vigor: loaded.creature.attributes.energy,
          maxVigor: loaded.creature.maxVigor,
          satiety: loaded.creature.satiety,
          weeklyRemaining: loadedWeek
            ? Math.max(0, loadedWeek.targetCount - loadedWeek.validActivityCount)
            : undefined,
        }),
      );
      setRuntime({ type: 'ready' });
      if (!loaded.state.tutorialCompleted) setSheet('tutorial');
      if (mode === 'account') setPending(await pendingSyncCount());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível abrir o Observatório.');
      setRuntime({ type: 'errorRecoverable', errorCode: 'OBSERVATORY_LOAD_FAILED' });
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useFocusEffect(useCallback(() => {
    setSceneActive(true);
    void refresh();
    return () => setSceneActive(false);
  }, [refresh]));

  const playerSettled = useCallback((position: { x: number; y: number }) => {
    setRuntime({ type: 'ready' });
    void saveSafePlayerPosition(position);
  }, []);

  const creature = snapshot?.creature ?? null;
  const definition = creature ? getCreatureByKey(creature.creatureKey) : undefined;
  const adariName = creature?.nickname || definition?.name || 'Adari';
  const behavior = creature ? getAdariBehaviorProfile(creature.creatureKey) : null;
  const nextChallenge = useMemo(() => {
    for (const region of campaign) {
      const next = region.adversaries.find((item) => item.unlocked && !item.defeated);
      if (next) return { region: region.region, adversary: next.adversary };
    }
    return null;
  }, [campaign]);

  const updateCreature = useCallback((next: CreatureState) => {
    setSnapshot((current) => (current ? { ...current, creature: next } : current));
  }, []);

  const interact = useCallback((interactionTarget: InteractiveObject | null) => {
    if (!interactionTarget) return;
    setRuntime(runtimeForInteraction(interactionTarget.id, interactionTarget.type, creature?.id ?? 'active-adari'));
    switch (interactionTarget.type) {
      case 'adari': setSheet('pet'); break;
      case 'feeding_table': setSheet('food'); break;
      case 'nest': setSheet('nest'); break;
      case 'journey_portal': router.push('/(tabs)/journey'); break;
      case 'goal_board': router.push('/settings/goal'); break;
      case 'astral_mirror': router.push('/adari'); break;
    }
  }, [creature?.id, router]);

  const performPet = useCallback(async () => {
    if (busy || !behavior) return;
    setBusy(true);
    try {
      const result = await petAdari();
      updateCreature(result.creature);
      setMessage(
        result.interaction.bondGranted > 0
          ? `${behavior.affectionReaction} Vínculo +${result.interaction.bondGranted}`
          : `${behavior.affectionReaction} ${adariName} parece muito feliz com sua companhia.`,
      );
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'A interação será tentada novamente.');
    } finally {
      setBusy(false);
    }
  }, [adariName, behavior, busy, updateCreature]);

  const performFeed = useCallback(async (foodId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await feedAdari(foodId);
      updateCreature(result.creature);
      setMessage(
        !result.accepted
          ? 'Estou satisfeito agora. Podemos guardar isso para depois.'
          : result.favorite
            ? `${adariName} reconheceu um de seus alimentos favoritos!`
            : `${adariName} aproveitou a refeição.`,
      );
      setSnapshot(await loadObservatory());
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Não foi possível oferecer o alimento.');
    } finally {
      setBusy(false);
      setSheet(null);
    }
  }, [adariName, busy, updateCreature]);

  const updateSettings = useCallback(async (patch: Partial<ObservatoryStateRecord>) => {
    const state = await saveObservatoryState(patch);
    setSnapshot((current) => (current ? { ...current, state } : current));
  }, []);

  const advanceTutorial = useCallback(async () => {
    if (tutorialStep < 2) {
      setTutorialStep((step) => step + 1);
      return;
    }
    await updateSettings({ tutorialCompleted: true });
    setSheet(null);
  }, [tutorialStep, updateSettings]);

  if (loading) return <Screen><LoadingState label="Preparando o Observatório…" /></Screen>;
  if (error) return <Screen><ErrorState message={error} onRetry={() => void refresh()} /></Screen>;
  if (!snapshot || !creature) return <Redirect href="/onboarding" />;

  const bondTier = bondTierFor(creature.bond);
  const vigorHours = hoursUntilFullVigor({
    currentVigor: creature.attributes.energy,
    maxVigor: creature.maxVigor,
    vigorRecoveryRate: creature.vigorRecoveryRate,
    lastVigorCalculationAt: creature.lastVigorCalculationAt,
  });
  const portalCost = nextChallenge
    ? vigorCostForBattle(nextChallenge.adversary.difficultyType === 'boss' ? 'bossPve' : nextChallenge.adversary.difficultyType === 'elite' ? 'elitePve' : 'normalPve')
    : 0;

  return (
    <Screen padded={false} edges={['top']} testID="observatory-screen">
      <View style={{ paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, gap: 6, backgroundColor: theme.colors.surfaceElevated }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text variant="heading">{adariName}</Text>
            <Text variant="caption" color="textMuted">Nível {creature.level} · {bondTier.label}</Text>
          </View>
          <Pressable
            onPress={() => setSheet('menu')}
            accessibilityRole="button"
            accessibilityLabel="Abrir menu e lista acessível do Observatório"
            style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: theme.colors.surfaceAlt }}
          ><Text variant="heading">☰</Text></Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="textMuted">Vigor {creature.attributes.energy}/{creature.maxVigor}</Text>
            <ProgressBar value={creature.attributes.energy / creature.maxVigor} color="brandTeal" height={5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="textMuted">Vínculo {creature.bond}/100</Text>
            <ProgressBar value={creature.bond / 100} color="brandGold" height={5} />
          </View>
        </View>
        {(!online || pending > 0) ? <SyncStatus mode={mode} online={online} pending={pending} /> : null}
      </View>

      <ObservatoryScene
        creatureKey={creature.creatureKey}
        evolved={creature.evolutionStage > 0}
        initialPlayerPosition={snapshot.state.lastSafePlayerPosition}
        movementSpeed={snapshot.state.movementSpeed}
        particlesEnabled={snapshot.state.particlesEnabled && snapshot.state.qualityMode !== 'economy'}
        reduceMotion={snapshot.state.reduceMotion}
        adariState={creature.activeBehaviorState}
        onTargetChange={setTarget}
        active={sceneActive}
        onRuntimeStateChange={setRuntime}
        onPlayerSettled={playerSettled}
        onDirectInteract={interact}
      />

      <View style={{ padding: theme.spacing.md, gap: theme.spacing.xs, backgroundColor: theme.colors.surfaceElevated }}>
        {target?.type === 'journey_portal' && nextChallenge ? (
          <Text variant="caption" color="brandGold" center>
            {nextChallenge.region.name} · {nextChallenge.adversary.name} · {portalCost} Vigor · {dailyBattle?.rewardedWinsToday ?? 0}/{dailyBattle?.winLimit ?? 5} vitórias
          </Text>
        ) : target?.type === 'goal_board' && currentWeek ? (
          <Text variant="caption" color="brandGold" center>Meta semanal · {currentWeek.validActivityCount}/{currentWeek.targetCount} dias · {Math.round(currentWeek.percentage * 100)}%</Text>
        ) : null}
        <Text variant="caption" color="textMuted" center>{message}</Text>
        {target ? <Button label={target.label} onPress={() => interact(target)} accessibilityHint={target.description} /> : null}
        {__DEV__ ? <Text variant="caption" color="textMuted" center>runtime: {runtime.type} · sync: {pending > 0 ? `${pending} pendente(s)` : 'estável'}</Text> : null}
      </View>

      <BottomSheet visible={sheet === 'nest'} onClose={() => setSheet(null)} title="Ninho Astral">
        <Text variant="body">{adariName} está {creature.attributes.energy < creature.maxVigor ? 'descansando' : 'recuperado'}.</Text>
        <Text variant="label" color="brandTeal">Vigor: {creature.attributes.energy}/{creature.maxVigor}</Text>
        <Text variant="body" color="textMuted">Recuperação: +{creature.vigorRecoveryRate} por hora</Text>
        <Text variant="body" color="textMuted">{vigorHours > 0 ? `Vigor máximo estimado em ${Math.floor(vigorHours)}h${String(Math.round((vigorHours % 1) * 60)).padStart(2, '0')}.` : 'Vigor completo.'}</Text>
        <Text variant="caption" color="textMuted">O Vigor continua se recuperando com o aplicativo fechado; o Ninho não é obrigatório.</Text>
      </BottomSheet>

      <BottomSheet visible={sheet === 'pet'} onClose={() => setSheet(null)} title={`Carinho em ${adariName}`}>
        <View
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderRelease={() => void performPet()}
          accessible accessibilityRole="button" accessibilityLabel={`Área para fazer carinho em ${adariName}`} accessibilityHint="Toque ou deslize nesta área."
          style={{ minHeight: 190, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryMuted }}
        >
          <Text variant="display">✦</Text>
          <Text variant="body" center>Deslize suavemente ou toque para fazer carinho.</Text>
          <Text variant="caption" color="textMuted" center>As reações continuam mesmo quando o Vínculo diário já foi recebido.</Text>
        </View>
      </BottomSheet>

      <BottomSheet visible={sheet === 'food'} onClose={() => setSheet(null)} title="Mesa de Alimentação">
        <Text variant="body" color="textMuted">Saciedade: {creature.satiety}/100 · {satietyLabel(creature.satiety)}</Text>
        <ScrollView style={{ maxHeight: 390 }} contentContainerStyle={{ gap: 8 }}>
          {FOOD_DEFINITIONS.map((food) => {
            const quantity = snapshot.inventory.find((item) => item.foodDefinitionId === food.id)?.quantity ?? 0;
            const favorite = food.preferredByAdariKeys.includes(creature.creatureKey);
            return (
              <Pressable key={food.id} disabled={quantity <= 0 || busy} onPress={() => void performFeed(food.id)} accessibilityRole="button" accessibilityLabel={`${food.name}, quantidade ${quantity}, ${food.satietyValue} de Saciedade${favorite ? ', favorito' : ''}`} style={{ minHeight: 64, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt, opacity: quantity > 0 ? 1 : 0.5, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <FoodSprite foodKey={food.key} name={food.name} size={58} />
                <View style={{ flex: 1 }}>
                  <Text variant="label">{food.name} · {quantity}</Text>
                  <Text variant="caption" color="textMuted">+{food.satietyValue} Saciedade{favorite ? ' · favorito' : ''}</Text>
                </View>
              </Pressable>
            );
          })}
          {snapshot.inventory.every((item) => item.quantity <= 0) ? <Text variant="body" color="textMuted">Complete atividades e desafios para encontrar alimentos para seu Adari.</Text> : null}
        </ScrollView>
      </BottomSheet>

      <BottomSheet visible={sheet === 'menu'} onClose={() => setSheet(null)} title="Observatório">
        <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: 9 }}>
          <Button label="Registrar atividade" onPress={() => { setSheet(null); router.push('/activity/new'); }} />
          <Text variant="label">Lista acessível de locais</Text>
          <Button label="Ninho Astral" variant="secondary" onPress={() => setSheet('nest')} />
          <Button label="Mesa de Alimentação" variant="secondary" onPress={() => setSheet('food')} />
          <Button label="Portal da Jornada" variant="secondary" onPress={() => { setSheet(null); router.push('/(tabs)/journey'); }} />
          <Button label="Quadro de Metas" variant="secondary" onPress={() => { setSheet(null); router.push('/settings/goal'); }} />
          <Button label="Espelho Astral" variant="secondary" onPress={() => { setSheet(null); router.push('/adari'); }} />
          <Button label={`Interagir com ${adariName}`} variant="secondary" onPress={() => setSheet('pet')} />
          <Text variant="label">Preferências</Text>
          <Button label={`Movimento reduzido: ${snapshot.state.reduceMotion ? 'sim' : 'não'}`} variant="ghost" onPress={() => void updateSettings({ reduceMotion: !snapshot.state.reduceMotion })} />
          <Button label={`Partículas: ${snapshot.state.particlesEnabled ? 'ativas' : 'reduzidas'}`} variant="ghost" onPress={() => void updateSettings({ particlesEnabled: !snapshot.state.particlesEnabled })} />
          <Button label={`Qualidade: ${snapshot.state.qualityMode}`} variant="ghost" onPress={() => void updateSettings({ qualityMode: snapshot.state.qualityMode === 'automatic' ? 'high' : snapshot.state.qualityMode === 'high' ? 'economy' : 'automatic' })} />
          <Button label={`Velocidade: ${snapshot.state.movementSpeed}x`} variant="ghost" onPress={() => void updateSettings({ movementSpeed: snapshot.state.movementSpeed >= 1.5 ? 0.75 : snapshot.state.movementSpeed + 0.25 })} />
          <Text variant="caption" color="textMuted">Áudio ambiente começa desligado. Efeitos e vibração respeitam estas preferências quando os assets finais forem conectados.</Text>
        </ScrollView>
      </BottomSheet>

      <BottomSheet visible={sheet === 'tutorial'} onClose={() => undefined} title="Bem-vindo ao Observatório">
        <Text variant="body" center>{tutorialStep === 0 ? 'Toque no chão para caminhar.' : tutorialStep === 1 ? `Aproxime-se de ${adariName} ou use a lista acessível para interagir.` : 'O Quadro acompanha sua meta; o Portal leva à Jornada. Explore quando quiser.'}</Text>
        <Button label={tutorialStep < 2 ? 'Continuar' : 'Explorar'} onPress={() => void advanceTutorial()} />
      </BottomSheet>
    </Screen>
  );
}
