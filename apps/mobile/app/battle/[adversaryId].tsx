import {
  getAdversaryById,
  estimateDamageRange,
  initBattle,
  resolveRound,
  type BattleAbility,
  type BattleState,
  type Combatant,
  type PlannedAction,
} from '@ad-sidera/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BattleActionButton,
  BattleHealthBar,
  BattleStage,
  Button,
  type BattleStageFeedback,
  EmptyState,
  LoadingState,
  Screen,
  Text,
} from '@/components';
import type { CreatureState } from '@/db/models';
import { enemyCombatant, playerCombatant, stableBattleSeed, type EnemyBundle } from '@/domain/battle';
import { getBattlePreview } from '@/services/campaignService';
import type { PveBattlePreview, PveBattleOutcome } from '@/services/pveBattleService';
import { useGameStore } from '@/stores/gameStore';
import { uuidv4 } from '@/utils/id';
import { darkColors } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/ThemeProvider';
import {
  BATTLE_ACTION_SEQUENCE,
  BATTLE_PHASE_LABEL,
  isBattleCommandLocked,
  phaseAfterAction,
  type BattleActionPhase,
} from '@/features/battle/actionSequence';
import type { AdariVisualState } from '@/features/my-adari/state';
import { battleVisualFeedbackSequence } from '@/features/battle/battleFeedback';

function DarkPanel({ children }: { children: React.ReactNode }): React.ReactElement {
  return <View style={styles.panel}>{children}</View>;
}

/** Rótulo curto do tipo de habilidade para o sublabel do botão. */
const TYPE_HINT: Partial<Record<BattleAbility['type'], string>> = {
  damage: 'Dano',
  defense: 'Defesa',
  shield: 'Escudo',
  heal: 'Cura',
  buff: 'Reforço',
  debuff: 'Enfraquece',
  damageOverTime: 'Dano contínuo',
};

function BattleArena({
  creature,
  adversaryId,
  enemyRegionKey,
  enemyIsBoss,
  onFinished,
  seed,
}: {
  creature: CreatureState;
  adversaryId: string;
  enemyRegionKey: string;
  enemyIsBoss: boolean;
  onFinished: (outcome: PveBattleOutcome | null) => void;
  seed: number;
}): React.ReactElement {
  // A operação é nova por tentativa; o padrão/base do inimigo usa seed estável.
  const clientGeneratedId = useMemo(() => uuidv4(), []);
  const finishBattle = useGameStore((s) => s.finishBattle);
  const reducedMotion = useReducedMotion();

  const player: Combatant = useMemo(() => playerCombatant(creature), [creature]);
  const enemy: EnemyBundle | null = useMemo(
    () => enemyCombatant(adversaryId, creature, seed),
    [adversaryId, creature, seed],
  );

  const [state, setState] = useState<BattleState | null>(() =>
    enemy ? initBattle({ player, enemy: enemy.combatant, seed }) : null,
  );
  const resolved = useRef(false);
  const stateRef = useRef(state);
  const actionLock = useRef(false);
  const skipRequested = useRef(false);
  const releaseWait = useRef<(() => void) | null>(null);
  const [visualPhase, setVisualPhase] = useState<BattleActionPhase>('idle');
  const [feedback, setFeedback] = useState<BattleStageFeedback | null>(null);
  const [completionReady, setCompletionReady] = useState(false);
  const [queuedPlayerVisual, setQueuedPlayerVisual] = useState<AdariVisualState | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);

  const waitForAnimation = useCallback((milliseconds: number) => new Promise<void>((resolve) => {
    if (reducedMotion || skipRequested.current) { resolve(); return; }
    const timer = setTimeout(() => { releaseWait.current = null; resolve(); }, milliseconds);
    releaseWait.current = () => { clearTimeout(timer); releaseWait.current = null; resolve(); };
  }), [reducedMotion]);

  useEffect(() => () => { releaseWait.current?.(); }, []);

  const step = useCallback(async (action: PlannedAction) => {
    const current = stateRef.current;
    if (!enemy || !current || current.status !== 'ongoing' || actionLock.current) return;
    actionLock.current = true;
    skipRequested.current = false;
    setFeedback(null);
    const selectedAbility = player.abilities.find((ability) => ability.id === action.abilityId);
    setQueuedPlayerVisual(selectedAbility?.type === 'defense' || selectedAbility?.type === 'shield'
      ? 'defending' : 'attacking');
    for (const phase of BATTLE_ACTION_SEQUENCE.slice(0, 3)) {
      setVisualPhase(phase);
      await waitForAnimation(phase === 'preparing' ? 130 : 110);
    }
    const next = resolveRound(current, action, { player, enemy: enemy.combatant });
    stateRef.current = next;
    setState(next);
    const events = next.log.slice(current.log.length);
    const feedbackSequence = battleVisualFeedbackSequence(events, current.log.length);
    const playerBeat = feedbackSequence.find((item) => item.attacker === 'player');
    if (playerBeat) {
      setFeedback(playerBeat);
      for (const phase of BATTLE_ACTION_SEQUENCE.slice(3)) {
        setVisualPhase(phase);
        await waitForAnimation(phase === 'targetReaction' ? 180 : 120);
      }
    }
    const enemyBeat = feedbackSequence.find((item) => item.attacker === 'enemy');
    if (enemyBeat && next.status === 'ongoing') {
      setFeedback(enemyBeat);
      for (const phase of BATTLE_ACTION_SEQUENCE) {
        setVisualPhase(phase);
        await waitForAnimation(phase === 'targetReaction' ? 180 : 110);
      }
    }
    const ending = phaseAfterAction(next.status);
    setVisualPhase(ending);
    setQueuedPlayerVisual(null);
    actionLock.current = false;
    if (ending === 'victory' || ending === 'defeat') {
      await waitForAnimation(600);
      setCompletionReady(true);
    }
  }, [player, enemy, waitForAnimation]);

  const skipAnimations = useCallback(() => {
    skipRequested.current = true;
    releaseWait.current?.();
  }, []);

  // Ao encerrar, registra o resultado (vitória = custo cheio; derrota = 50%).
  useEffect(() => {
    if (!state || state.status === 'ongoing' || !completionReady || resolved.current) {
      return;
    }
    resolved.current = true;
    void finishBattle({
      adversaryId,
      clientGeneratedId,
      result: state.status === 'victory' ? 'victory' : 'defeat',
      seed,
      turns: state.round,
    }).then(onFinished);
  }, [state, completionReady, adversaryId, clientGeneratedId, seed, finishBattle, onFinished]);

  if (!enemy || !state) {
    return (
      <DarkPanel>
        <Text variant="body" style={{ color: darkColors.textMuted }}>
          Não foi possível preparar esta batalha.
        </Text>
      </DarkPanel>
    );
  }

  const acting = state.status !== 'ongoing' || isBattleCommandLocked(visualPhase);
  const playerMood = state.status === 'victory' ? 'happy' : state.status === 'defeat' ? 'resting' : 'ready';
  const playerVisualState: AdariVisualState = state.status === 'victory' ? 'victory'
    : state.status === 'defeat' ? 'defeat'
      : state.player.guarding ? 'defending'
        : queuedPlayerVisual && feedback?.attacker !== 'enemy' ? queuedPlayerVisual
          : feedback?.attacker === 'enemy' && visualPhase === 'targetReaction' ? 'takingDamage' : 'battleReady';
  const recent = state.log.slice(-8);
  const telegraphEstimate = enemy.combatant.boss
    ? estimateDamageRange({
        attackerAttack: enemy.combatant.stats.attack,
        abilityPower: enemy.combatant.boss.telegraphPower,
        defenderDefense: player.stats.defense,
      })
    : null;

  return (
    <>
      <BattleStage
        creatureKey={creature.creatureKey}
        playerName={player.name}
        playerEvolved={creature.evolutionStage > 0}
        playerMood={playerMood}
        enemyName={enemy.combatant.name}
        enemyRegionKey={enemyRegionKey}
        enemyIsBoss={enemyIsBoss}
        feedback={feedback}
        actionPhase={visualPhase}
        playerVisualState={playerVisualState}
        playerGuarding={state.player.guarding}
        enemyBars={
          <BattleHealthBar current={state.enemy.health} max={enemy.combatant.stats.maxHealth} color="error" />
        }
        playerBars={
          <BattleHealthBar current={state.player.health} max={player.stats.maxHealth} color="success" />
        }
      />

      {/* Telegráfico do chefe */}
      {state.status === 'ongoing' && state.enemy.charging ? (
        <View style={styles.telegraph}>
          <Text variant="label" style={{ color: darkColors.brandGold }}>
            ⚠ {enemy.combatant.name} concentra energia. Próxima ação: golpe forte
          </Text>
          {telegraphEstimate ? <Text variant="caption" style={{ color: darkColors.text }}>
            Perigo alto · dano estimado {telegraphEstimate.min}–{telegraphEstimate.max} · defender reduz 70%
          </Text> : null}
        </View>
      ) : null}

      {/* Ações (habilidades equipadas com recarga) */}
      {state.status === 'ongoing' ? (
        <View style={{ gap: 12 }}>
          <Text variant="label" style={{ color: acting ? darkColors.brandGold : darkColors.textMuted }}>
            Turno {state.round + (visualPhase === 'idle' ? 1 : 0)} Â· {BATTLE_PHASE_LABEL[visualPhase]}
          </Text>
          <View style={styles.actionGrid}>
            {player.abilities.map((ability) => {
              const cd = state.player.cooldowns[ability.id] ?? 0;
              const disabled = acting || cd > 0;
              const sublabel = cd > 0 ? `Recarrega em ${cd}` : TYPE_HINT[ability.type];
              return (
                <View key={ability.id} style={styles.actionCell}>
                  <BattleActionButton
                    label={ability.name}
                    sublabel={sublabel}
                    variant={ability.slot === 'basicAttack' ? 'primary' : ability.slot === 'basicDefense' ? (state.enemy.charging ? 'accent' : 'secondary') : 'accent'}
                    onPress={() => { void step({ type: 'ability', abilityId: ability.id }); }}
                    disabled={disabled}
                    accessibilityHint={`Usa ${ability.name}.${cd > 0 ? ` Em recarga por ${cd} turnos.` : ''}`}
                  />
                </View>
              );
            })}
          </View>
          {acting ? <Button label="Pular animação" variant="ghost" onPress={skipAnimations} /> : null}
          <Text variant="caption" style={{ color: darkColors.textMuted }}>
            Cada habilidade tem sua recarga. Sua Vida se recupera ao fim da batalha — o Vigor é que
            descansa com o tempo.
          </Text>
          {__DEV__ ? <Text variant="caption" style={{ color: darkColors.textMuted }}>
            seed {seed} · turno {state.round} · RNG {state.rngCursor} · cálculo v2
          </Text> : null}
        </View>
      ) : null}

      {/* Histórico */}
      <DarkPanel>
        <Text variant="section" style={{ color: darkColors.text }}>
          Histórico
        </Text>
        {recent.length === 0 ? (
          <Text variant="caption" style={{ color: darkColors.textMuted }}>
            Escolha uma ação para começar.
          </Text>
        ) : (
          recent.map((event, index) => (
            <Text
              key={`${event.round}-${event.side}-${index}`}
              variant="caption"
              style={{ color: darkColors.textMuted }}
            >
              {event.text}
            </Text>
          ))
        )}
      </DarkPanel>
    </>
  );
}

function BattleFlow({
  creature,
  adversaryId,
  enemyRegionKey,
  enemyIsBoss,
  initialPreview,
}: {
  creature: CreatureState;
  adversaryId: string;
  enemyRegionKey: string;
  enemyIsBoss: boolean;
  initialPreview: PveBattlePreview;
}): React.ReactElement {
  const router = useRouter();
  const [phase, setPhase] = useState<'confirm' | 'fighting' | 'done'>('confirm');
  const [preview, setPreview] = useState<PveBattlePreview>(initialPreview);
  const [outcome, setOutcome] = useState<PveBattleOutcome | null>(null);
  const [attempt, setAttempt] = useState(0);
  const battleSeed = useMemo(() => stableBattleSeed(adversaryId, creature.id), [adversaryId, creature.id]);

  const restart = useCallback(async () => {
    const fresh = await getBattlePreview(adversaryId);
    if (fresh) {
      setPreview(fresh);
    }
    setOutcome(null);
    setAttempt((n) => n + 1);
    setPhase('confirm');
  }, [adversaryId]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']} testID="battle-screen">
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text variant="title" style={{ color: darkColors.text }}>
          Batalha
        </Text>

        {phase === 'confirm' ? (
          <DarkPanel>
            <Text variant="heading" style={{ color: darkColors.text }}>
              {preview.adversary.name}
            </Text>
            <Text variant="body" style={{ color: darkColors.textMuted }}>
              {preview.adversary.description}
            </Text>
            <View style={styles.infoRow}>
              <Text variant="label" style={{ color: darkColors.brandTeal }}>
                Custo: {preview.vigorCost} de Vigor
              </Text>
              <Text variant="label" style={{ color: darkColors.text }}>
                Vigor atual: {preview.currentVigor}
              </Text>
            </View>
            <Text variant="label" style={{ color: darkColors.textMuted }}>
              Vitórias hoje: {preview.rewardedWinsToday}/5 ·{' '}
              {preview.reachedDailyLimit
                ? 'limite de recompensa atingido'
                : `próxima vitória: +${preview.xpIfWin} XP`}
            </Text>

            {preview.canAfford ? (
              <>
                <BattleActionButton
                  label="Iniciar batalha"
                  variant="primary"
                  onPress={() => setPhase('fighting')}
                  accessibilityHint="Começa a batalha, consumindo Vigor ao concluir."
                />
                {preview.reachedDailyLimit ? (
                  <Text variant="caption" style={{ color: darkColors.textMuted }}>
                    Você já alcançou o limite de recompensa de hoje — pode batalhar por diversão, sem
                    XP extra.
                  </Text>
                ) : null}
              </>
            ) : (
              <>
                <Text variant="body" style={{ color: darkColors.brandGold }}>
                  Vigor insuficiente. O Vigor se recupera com o tempo — descanse um pouco e volte.
                </Text>
                <BattleActionButton
                  label="Voltar à jornada"
                  variant="secondary"
                  onPress={() => router.replace('/(tabs)/journey')}
                />
              </>
            )}
          </DarkPanel>
        ) : null}

        {phase === 'fighting' ? (
          <BattleArena
            key={attempt}
            creature={creature}
            adversaryId={adversaryId}
            enemyRegionKey={enemyRegionKey}
            enemyIsBoss={enemyIsBoss}
            seed={battleSeed}
            onFinished={(o) => {
              setOutcome(o);
              setPhase('done');
            }}
          />
        ) : null}

        {phase === 'done' && outcome ? (
          <DarkPanel>
            <Text
              variant="heading"
              style={{ color: outcome.result === 'victory' ? darkColors.success : darkColors.text }}
            >
              {outcome.result === 'victory' ? 'Vitória!' : 'Dessa vez não deu'}
            </Text>

            {outcome.result === 'victory' ? (
              <>
                {outcome.milestoneUnlocked ? (
                  <Text variant="body" style={{ color: darkColors.brandGold }}>
                    Nova conquista na jornada desbloqueada!
                  </Text>
                ) : null}
                {outcome.rewardedWin && outcome.xpGranted > 0 ? (
                  <Text variant="label" style={{ color: darkColors.brandGold }}>
                    +{outcome.xpGranted} XP
                  </Text>
                ) : (
                  <Text variant="body" style={{ color: darkColors.textMuted }}>
                    Limite de recompensa de hoje atingido ({outcome.dailyRewardedWins}/5). Ótimo
                    treino!
                  </Text>
                )}
                {outcome.leveledUp ? (
                  <Text variant="body" style={{ color: darkColors.success }}>
                    Subiu de nível!
                  </Text>
                ) : null}
              </>
            ) : (
              <Text variant="body" style={{ color: darkColors.textMuted }}>
                {enemyIsBoss
                  ? 'O golpe anunciado resolve no turno seguinte. Use sua Defesa quando o aviso aparecer e aproveite a abertura com a habilidade especial.'
                  : 'Observe o padrão do adversário, respeite as recargas e use Defesa antes dos golpes mais fortes.'}
              </Text>
            )}

            <Text variant="caption" style={{ color: darkColors.textMuted }}>
              Vigor gasto: {outcome.vigorSpent} · Vigor restante: {outcome.creature.attributes.energy}/{outcome.creature.maxVigor} · Vitórias hoje: {outcome.dailyRewardedWins}/5
            </Text>

            <BattleActionButton
              label="Continuar"
              variant="primary"
              onPress={() => router.replace('/(tabs)/journey')}
              accessibilityHint="Volta para a sua jornada."
            />
            <BattleActionButton label="Batalhar novamente" variant="ghost" onPress={() => void restart()} />
          </DarkPanel>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function BattleScreen(): React.ReactElement {
  const router = useRouter();
  const { adversaryId } = useLocalSearchParams<{ adversaryId: string }>();
  const creature = useGameStore((s) => s.creature);
  const adversary = useMemo(
    () => (adversaryId ? getAdversaryById(adversaryId) : undefined),
    [adversaryId],
  );

  const [preview, setPreview] = useState<PveBattlePreview | null | undefined>(undefined);
  useEffect(() => {
    if (!adversaryId) {
      return;
    }
    let active = true;
    void getBattlePreview(adversaryId).then((p) => {
      if (active) {
        setPreview(p);
      }
    });
    return () => {
      active = false;
    };
  }, [adversaryId]);

  if (!adversaryId || !creature || !adversary) {
    return (
      <Screen>
        <EmptyState
          title="Batalha indisponível"
          description="Não encontramos este adversário ou seu Adari ainda não está pronto."
          actionLabel="Voltar"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  if (preview === undefined) {
    return (
      <Screen>
        <LoadingState label="Preparando a batalha…" />
      </Screen>
    );
  }
  if (!preview) {
    return (
      <Screen>
        <EmptyState
          title="Batalha indisponível"
          description="Não foi possível preparar esta batalha."
          actionLabel="Voltar"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <BattleFlow
      creature={creature}
      adversaryId={adversaryId}
      enemyRegionKey={adversary.regionKey}
      enemyIsBoss={adversary.isBoss}
      initialPreview={preview}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: darkColors.background },
  scroll: { padding: 16, gap: 16 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCell: { flexBasis: '47%', flexGrow: 1 },
  telegraph: {
    backgroundColor: darkColors.surfaceElevated,
    borderColor: darkColors.brandGold,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  panel: {
    backgroundColor: darkColors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: darkColors.border,
    padding: 16,
    gap: 8,
  },
});
