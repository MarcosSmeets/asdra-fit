import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../../theme/ThemeProvider';
import { pixelColors, pixelPalette, radius } from '../../theme/tokens';
import { resolveAdariManifest, resolveStageSize } from '../../content/adari';
import type { BattleActionPhase } from '../../features/battle/actionSequence';
import type { AdariVisualState } from '../../features/my-adari/state';
import { AdariAnimator } from '../adari/AdariAnimator';
import type { AdariMood } from '../adari/AdariPortrait';
import { Text } from '../Text';
import { EnemyActionSprite } from './EnemyActionSprite';

/** Descrição do último round para o feedback visual (lunge/shake/flash/dano). */
export interface BattleStageFeedback {
  /** Muda a cada round resolvido (normalmente o tamanho do log). */
  seq: number;
  /** Quem executou a última ação registrada. */
  attacker: 'player' | 'enemy';
  /** Dano do último evento do log (0 quando não houve dano). */
  damage: number;
  /** Dano antes da Guarda e parcela efetivamente bloqueada. */
  rawDamage: number;
  blockedDamage: number;
}

export interface BattleStageProps {
  creatureKey: string;
  playerName: string;
  /** Estágio evolutivo persistido (0..3) — o sprite de batalha é por estágio. */
  playerStage?: number;
  /** @deprecated Compat Build 4 (evoluído = EV 1). Prefira `playerStage`. */
  playerEvolved?: boolean;
  playerMood?: AdariMood;
  enemyName: string;
  enemyRegionKey: string;
  enemyIsBoss: boolean;
  /** Barras de vida/energia do adversário, sob o emblema. */
  enemyBars?: React.ReactNode;
  /** Barras de vida/energia do Adari, sob o retrato. */
  playerBars?: React.ReactNode;
  feedback?: BattleStageFeedback | null;
  actionPhase?: BattleActionPhase;
  playerVisualState?: AdariVisualState;
  playerGuarding?: boolean;
}

/** Acento cromático da arena por região (paleta oficial, nunca hex local). */
const ENEMY_ACCENT: Record<string, string> = {
  r1: pixelPalette.energy.teal,
  r2: pixelPalette.stellar.gold,
  r3: pixelPalette.energy.purple,
};

function accentForRegion(regionKey: string): string {
  return ENEMY_ACCENT[regionKey] ?? pixelPalette.energy.teal;
}

/** Emblema pixel do adversário: losango em degraus de Views (sem SVG). */
function EnemyFallback({
  regionKey,
  isBoss,
  size,
}: {
  regionKey: string;
  isBoss: boolean;
  size: number;
}): React.ReactElement {
  const accent = accentForRegion(regionKey);
  // Losango quantizado: faixas horizontais crescendo e encolhendo em degraus.
  const bands = isBoss ? [0.2, 0.45, 0.7, 0.9, 1, 0.9, 0.7, 0.45, 0.2] : [0.25, 0.55, 0.85, 1, 0.85, 0.55, 0.25];
  const bandHeight = Math.floor((size * 0.7) / bands.length);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        position: 'absolute', width: size * 0.92, height: size * 0.92,
        backgroundColor: accent, opacity: 0.14,
      }} />
      <View style={{ alignItems: 'center' }}>
        {bands.map((ratio, index) => (
          <View key={index} style={{
            width: Math.round(size * 0.62 * ratio),
            height: bandHeight,
            backgroundColor: index === Math.floor(bands.length / 2) ? accent : pixelPalette.cosmic.midnight,
            borderColor: accent,
            borderLeftWidth: 2,
            borderRightWidth: 2,
          }} />
        ))}
      </View>
      {isBoss ? (
        <View style={{
          position: 'absolute', top: 0, width: size * 0.16, height: size * 0.16,
          backgroundColor: pixelPalette.stellar.lightGold,
        }} />
      ) : null}
    </View>
  );
}

/** Estrelas pixel fixas do fundo da arena (posições determinísticas em %). */
const ARENA_STARS: readonly { left: number; top: number; size: number }[] = [
  { left: 12, top: 14, size: 2 }, { left: 30, top: 8, size: 1 }, { left: 52, top: 18, size: 2 },
  { left: 78, top: 10, size: 1 }, { left: 90, top: 22, size: 2 }, { left: 18, top: 40, size: 1 },
  { left: 86, top: 46, size: 2 }, { left: 8, top: 70, size: 2 }, { left: 40, top: 88, size: 1 },
  { left: 66, top: 92, size: 2 }, { left: 94, top: 80, size: 1 },
];

function StarField(): React.ReactElement {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {ARENA_STARS.map((star, index) => (
        <View key={index} style={{
          position: 'absolute', left: `${star.left}%`, top: `${star.top}%`,
          width: star.size * 2, height: star.size * 2,
          backgroundColor: pixelPalette.stellar.white,
          opacity: star.size > 1 ? 0.5 : 0.32,
        }} />
      ))}
    </View>
  );
}

/**
 * Arena da batalha em pixel 32-bit: adversário no topo, Adari embaixo (sprite
 * do estágio atual via manifest), sobre camadas cósmicas duras. Anima
 * lunge/shake/flash e um número de dano flutuante a cada round, sempre
 * respeitando "reduzir movimento". A Guarda mostra dano base/bloqueado/final.
 */
export function BattleStage({
  creatureKey,
  playerName,
  playerStage,
  playerEvolved = false,
  playerMood = 'ready',
  enemyName,
  enemyRegionKey,
  enemyIsBoss,
  enemyBars,
  playerBars,
  feedback,
  actionPhase = 'idle',
  playerVisualState = playerMood === 'happy' ? 'victory' : playerMood === 'resting' ? 'defeat' : 'battleReady',
  playerGuarding = false,
}: BattleStageProps): React.ReactElement {
  const reduced = useReducedMotion();
  const stageInt = playerStage ?? (playerEvolved ? 1 : 0);
  const manifest = resolveAdariManifest(creatureKey, stageInt);
  const playerSize = resolveStageSize(manifest, 'battle', 156);

  const playerLunge = useRef(new Animated.Value(0)).current;
  const enemyLunge = useRef(new Animated.Value(0)).current;
  const playerShake = useRef(new Animated.Value(0)).current;
  const enemyShake = useRef(new Animated.Value(0)).current;
  const playerFlash = useRef(new Animated.Value(0)).current;
  const enemyFlash = useRef(new Animated.Value(0)).current;
  const floatOpacity = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  const guardPulse = useRef(new Animated.Value(0.65)).current;
  const blockFlash = useRef(new Animated.Value(0)).current;
  const [floating, setFloating] = useState<{ side: 'player' | 'enemy'; value: number; blocked: number; raw: number } | null>(null);

  const seq = feedback?.seq ?? 0;

  useEffect(() => {
    if (!feedback || seq === 0) {
      return;
    }
    const attacker = feedback.attacker;
    const target: 'player' | 'enemy' = attacker === 'player' ? 'enemy' : 'player';
    const damage = feedback.damage;

    if (reduced) {
      // Sem movimento: apenas revela e mantém o número de dano por um instante.
      if (damage > 0) {
        setFloating({ side: target, value: damage, blocked: feedback.blockedDamage, raw: feedback.rawDamage });
        floatOpacity.setValue(1);
        floatY.setValue(-18);
        const timer = setTimeout(() => setFloating(null), 900);
        return () => clearTimeout(timer);
      }
      return;
    }

    const lunge = attacker === 'player' ? playerLunge : enemyLunge;
    const shake = target === 'player' ? playerShake : enemyShake;
    const flash = target === 'player' ? playerFlash : enemyFlash;
    const lungeTo = attacker === 'player' ? 14 : -14;

    const animations: Animated.CompositeAnimation[] = [
      Animated.sequence([
        Animated.timing(lunge, { toValue: lungeTo, duration: 110, useNativeDriver: true }),
        Animated.timing(lunge, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]),
    ];

    if (damage > 0) {
      animations.push(
        Animated.sequence([
          Animated.timing(shake, { toValue: 8, duration: 45, useNativeDriver: true }),
          Animated.timing(shake, { toValue: -8, duration: 45, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 6, duration: 45, useNativeDriver: true }),
          Animated.timing(shake, { toValue: -6, duration: 45, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 0, duration: 45, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(flash, { toValue: 1, duration: 90, useNativeDriver: true }),
          Animated.timing(flash, { toValue: 0, duration: 260, useNativeDriver: true }),
        ]),
      );
      setFloating({ side: target, value: damage, blocked: feedback.blockedDamage, raw: feedback.rawDamage });
      floatOpacity.setValue(1);
      floatY.setValue(0);
      animations.push(
        Animated.parallel([
          Animated.timing(floatY, { toValue: -38, duration: 700, useNativeDriver: true }),
          Animated.timing(floatOpacity, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
      );
      if (feedback.blockedDamage > 0 && target === 'player') {
        animations.push(Animated.sequence([
          Animated.timing(blockFlash, { toValue: 1, duration: 90, useNativeDriver: true }),
          Animated.delay(180),
          Animated.timing(blockFlash, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]));
      }
    }

    const group = Animated.parallel(animations);
    group.start(({ finished }) => {
      if (finished) {
        setFloating(null);
      }
    });
    return () => group.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq]);

  useEffect(() => {
    guardPulse.stopAnimation();
    if (!playerGuarding || reduced) {
      guardPulse.setValue(playerGuarding ? 1 : 0.65);
      return undefined;
    }
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(guardPulse, { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.timing(guardPulse, { toValue: 0.65, duration: 520, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [guardPulse, playerGuarding, reduced]);

  const enemyTransform = { transform: [{ translateX: Animated.add(enemyLunge, enemyShake) }] };
  const playerTransform = { transform: [{ translateX: Animated.add(playerLunge, playerShake) }] };
  const accent = accentForRegion(enemyRegionKey);

  return (
    <View style={styles.stage} accessible={false}>
      {/* faixas de profundidade da arena (gradiente quantizado) */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={{ flex: 2, backgroundColor: pixelPalette.cosmic.deep }} />
        <View style={{ flex: 3, backgroundColor: pixelPalette.cosmic.midnight }} />
        <View style={{ flex: 2, backgroundColor: pixelPalette.cosmic.deep }} />
      </View>
      <StarField />
      {actionPhase === 'impact' ? (
        <View pointerEvents="none" style={styles.impactBurst}>
          {/* explosão de impacto: cruz de pixels dura */}
          <View style={{ width: 12, height: 44, backgroundColor: pixelColors.brandGold }} />
          <View style={{ position: 'absolute', width: 44, height: 12, backgroundColor: pixelColors.brandGold }} />
        </View>
      ) : null}

      {/* Adversário (topo) */}
      <View style={[styles.zone, styles.enemyZone]}>
        <Animated.View style={enemyTransform}>
          <EnemyActionSprite regionKey={enemyRegionKey} isBoss={enemyIsBoss} size={enemyIsBoss ? 156 : 140}
            phase={actionPhase} isAttacking={feedback?.attacker === 'enemy'}
            isTakingDamage={feedback?.attacker === 'player'} reduceMotion={reduced}
            accessibilityLabel={`${enemyName}, adversário`}
            fallback={<EnemyFallback regionKey={enemyRegionKey} isBoss={enemyIsBoss}
              size={enemyIsBoss ? 156 : 140} />} />
          <Animated.View
            pointerEvents="none"
            style={[styles.flash, { opacity: enemyFlash, backgroundColor: pixelColors.error }]}
          />
        </Animated.View>
        <View style={styles.nameRow}>
          {enemyIsBoss ? <View style={{ width: 10, height: 10, backgroundColor: accent }} /> : null}
          <Text variant="hud" numberOfLines={1}>
            {enemyName}
          </Text>
        </View>
        {enemyBars ? <View style={styles.bars}>{enemyBars}</View> : null}
        {floating && floating.side === 'enemy' ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.float, { opacity: floatOpacity, transform: [{ translateY: floatY }] }]}
          >
            <Text variant="heading" color="error" accessibilityLabel={`Dano ${floating.value}`}>
              -{floating.value}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <View style={{ width: 8, height: 8, backgroundColor: pixelColors.brandGold }} />
        <View style={styles.dividerLine} />
      </View>

      {/* Adari (base) — sprite do estágio atual */}
      <View style={[styles.zone, styles.playerZone]}>
        <Animated.View style={playerTransform}>
          <AdariAnimator
            creatureKey={creatureKey}
            size={playerSize}
            state={playerVisualState}
            stage={stageInt}
            accessibilityLabel={`${playerName}, ${actionPhase}`}
          />
          {playerGuarding ? (
            <Animated.View style={[styles.guardAura, { opacity: guardPulse }]} pointerEvents="none">
              <Text variant="heading" color="brandGold">◇</Text>
              <Text variant="caption" color="brandGold">Guarda 70%</Text>
            </Animated.View>
          ) : null}
          <Animated.View pointerEvents="none" style={[styles.blockFlash, { opacity: blockFlash }]}>
            <Text variant="heading" color="brandGold">BLOQUEADO</Text>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[styles.flash, { opacity: playerFlash, backgroundColor: pixelColors.error }]}
          />
        </Animated.View>
        <View style={styles.nameRow}>
          <Text variant="hud" numberOfLines={1}>
            {playerName}
          </Text>
        </View>
        {playerBars ? <View style={styles.bars}>{playerBars}</View> : null}
        {floating && floating.side === 'player' ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.float, { opacity: floatOpacity, transform: [{ translateY: floatY }] }]}
          >
            <Text variant="heading" color="error" accessibilityLabel={`Dano final ${floating.value}`}>
              -{floating.value}
            </Text>
            {floating.blocked > 0 ? <Text variant="label" color="brandGold" accessibilityLabel={`Dano base ${floating.raw}, bloqueado ${floating.blocked}, dano final ${floating.value}`}>Bloqueado {floating.blocked}</Text> : null}
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    backgroundColor: pixelColors.backgroundSecondary,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: pixelColors.border,
    padding: 16,
    gap: 4,
    overflow: 'hidden',
  },
  zone: { alignItems: 'center', gap: 6, width: '67%' },
  enemyZone: { alignSelf: 'flex-end' },
  playerZone: { alignSelf: 'flex-start', marginTop: -34 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  bars: { alignSelf: 'stretch', gap: 8, marginTop: 4 },
  flash: { ...StyleSheet.absoluteFillObject },
  float: { position: 'absolute', top: 0, alignSelf: 'center' },
  impactBurst: { position: 'absolute', alignSelf: 'center', top: '46%', zIndex: 9, alignItems: 'center', justifyContent: 'center' },
  blockFlash: {
    ...StyleSheet.absoluteFillObject, borderWidth: 4,
    borderColor: pixelColors.brandGold, backgroundColor: 'rgba(61,171,168,0.2)',
    alignItems: 'center', justifyContent: 'center', zIndex: 7,
  },
  guardAura: {
    position: 'absolute', inset: -8, borderWidth: 3,
    borderColor: pixelColors.brandGold, backgroundColor: 'rgba(61,171,168,0.12)',
    alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dividerLine: { flex: 1, height: 2, backgroundColor: pixelColors.border },
});
