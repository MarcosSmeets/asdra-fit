import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Polygon } from 'react-native-svg';
import { useReducedMotion } from '../../theme/ThemeProvider';
import { darkColors } from '../../theme/tokens';
import type { BattleActionPhase } from '../../features/battle/actionSequence';
import type { AdariVisualState } from '../../features/my-adari/state';
import { AdariAnimator } from '../adari/AdariAnimator';
import type { AdariMood } from '../adari/AdariPortrait';
import { StarIcon } from '../icons/StarIcon';
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

const ENEMY_ACCENT: Record<string, string> = {
  r1: '#5BAAA8',
  r2: '#C9A45C',
  r3: '#AEB9EE',
};

function accentForRegion(regionKey: string): string {
  return ENEMY_ACCENT[regionKey] ?? '#5BAAA8';
}

/** Emblema SVG do adversário — orbe escuro com estrela; mais imponente para chefes. */
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
  const star = isBoss ? size * 0.34 : size * 0.28;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        {/* aura */}
        <Circle cx="60" cy="60" r={isBoss ? 54 : 46} fill={accent} opacity={0.16} />
        {/* raios do chefe */}
        {isBoss ? (
          <G fill={accent} opacity={0.55}>
            <Polygon points="60,2 66,20 54,20" />
            <Polygon points="60,118 66,100 54,100" />
            <Polygon points="2,60 20,54 20,66" />
            <Polygon points="118,60 100,54 100,66" />
            <Polygon points="18,18 32,28 28,32" />
            <Polygon points="102,18 88,28 92,32" />
            <Polygon points="18,102 28,88 32,92" />
            <Polygon points="102,102 92,88 88,92" />
          </G>
        ) : null}
        {/* orbe */}
        <Circle cx="60" cy="60" r={isBoss ? 42 : 38} fill="#0A1A2E" />
        <Circle cx="60" cy="60" r={isBoss ? 42 : 38} fill="none" stroke={accent} strokeWidth={isBoss ? 4 : 3} />
        <Circle cx="60" cy="60" r={isBoss ? 30 : 26} fill="#07131F" />
        {/* estrelas internas */}
        <G fill={accent} opacity={0.75}>
          <Circle cx="46" cy="48" r="1.6" />
          <Circle cx="74" cy="50" r="1.4" />
          <Circle cx="52" cy="74" r="1.4" />
          <Circle cx="72" cy="72" r="1.6" />
        </G>
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.center}>
          <StarIcon size={star} color={accent} sparkle={!isBoss} />
        </View>
      </View>
    </View>
  );
}

/** Estrelas atmosféricas de fundo da arena. */
function StarField(): React.ReactElement {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <G fill="#F7F1E7">
        <Circle cx="12" cy="14" r="0.6" opacity={0.5} />
        <Circle cx="30" cy="8" r="0.5" opacity={0.35} />
        <Circle cx="52" cy="18" r="0.7" opacity={0.45} />
        <Circle cx="78" cy="10" r="0.5" opacity={0.4} />
        <Circle cx="90" cy="22" r="0.6" opacity={0.35} />
        <Circle cx="18" cy="40" r="0.5" opacity={0.3} />
        <Circle cx="86" cy="46" r="0.6" opacity={0.4} />
        <Circle cx="8" cy="70" r="0.6" opacity={0.4} />
        <Circle cx="40" cy="88" r="0.5" opacity={0.3} />
        <Circle cx="66" cy="92" r="0.6" opacity={0.4} />
        <Circle cx="94" cy="80" r="0.5" opacity={0.3} />
      </G>
    </Svg>
  );
}

/**
 * Arena da batalha: adversário no topo (emblema), Adari embaixo (retrato), sobre
 * um fundo navy dramático. Anima lunge/shake/flash e um número de dano flutuante
 * a cada round, respeitando "reduzir movimento".
 */
export function BattleStage({
  creatureKey,
  playerName,
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

  return (
    <View style={styles.stage} accessible={false}>
      <StarField />
      {actionPhase === 'impact' ? <View pointerEvents="none" style={styles.impactBurst}><StarIcon size={44} color={darkColors.brandGold} /></View> : null}

      {/* Adversário (topo) */}
      <View style={[styles.zone, styles.enemyZone]}>
        <Animated.View style={enemyTransform}>
          <EnemyActionSprite regionKey={enemyRegionKey} isBoss={enemyIsBoss} size={enemyIsBoss ? 156 : 140}
            phase={actionPhase} isAttacking={feedback?.attacker === 'enemy'}
            isTakingDamage={feedback?.attacker === 'player'} reduceMotion={reduced}
            accessibilityLabel={`${enemyName}, adversÃ¡rio`}
            fallback={<EnemyFallback regionKey={enemyRegionKey} isBoss={enemyIsBoss}
              size={enemyIsBoss ? 156 : 140} />} />
          <Animated.View
            pointerEvents="none"
            style={[styles.flash, { opacity: enemyFlash, backgroundColor: darkColors.error }]}
          />
        </Animated.View>
        <View style={styles.nameRow}>
          {enemyIsBoss ? <StarIcon size={14} color={darkColors.brandGold} sparkle={false} /> : null}
          <Text variant="section" style={{ color: darkColors.text }} numberOfLines={1}>
            {enemyName}
          </Text>
        </View>
        {enemyBars ? <View style={styles.bars}>{enemyBars}</View> : null}
        {floating && floating.side === 'enemy' ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.float, { opacity: floatOpacity, transform: [{ translateY: floatY }] }]}
          >
            <Text variant="heading" style={{ color: darkColors.error }} accessibilityLabel={`Dano ${floating.value}`}>
              -{floating.value}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <StarIcon size={16} color={darkColors.brandGold} />
        <View style={styles.dividerLine} />
      </View>

      {/* Adari (base) */}
      <View style={[styles.zone, styles.playerZone]}>
        <Animated.View style={playerTransform}>
          <AdariAnimator
            creatureKey={creatureKey}
            size={156}
            state={playerVisualState}
            evolved={playerEvolved}
            accessibilityLabel={`${playerName}, ${actionPhase}`}
          />
          {playerGuarding ? (
            <Animated.View style={[styles.guardAura, { opacity: guardPulse }]} pointerEvents="none">
              <Text variant="heading" style={{ color: darkColors.brandGold }}>◇</Text>
              <Text variant="caption" style={{ color: darkColors.brandGold }}>Guarda 70%</Text>
            </Animated.View>
          ) : null}
          <Animated.View pointerEvents="none" style={[styles.blockFlash, { opacity: blockFlash }]}>
            <Text variant="heading" style={{ color: darkColors.brandGold }}>BLOQUEADO</Text>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[styles.flash, { opacity: playerFlash, backgroundColor: darkColors.error }]}
          />
        </Animated.View>
        <View style={styles.nameRow}>
          <Text variant="section" style={{ color: darkColors.text }} numberOfLines={1}>
            {playerName}
          </Text>
        </View>
        {playerBars ? <View style={styles.bars}>{playerBars}</View> : null}
        {floating && floating.side === 'player' ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.float, { opacity: floatOpacity, transform: [{ translateY: floatY }] }]}
          >
            <Text variant="heading" style={{ color: darkColors.error }} accessibilityLabel={`Dano final ${floating.value}`}>
              -{floating.value}
            </Text>
            {floating.blocked > 0 ? <Text variant="label" style={{ color: darkColors.brandGold }} accessibilityLabel={`Dano base ${floating.raw}, bloqueado ${floating.blocked}, dano final ${floating.value}`}>Bloqueado {floating.blocked}</Text> : null}
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    backgroundColor: darkColors.backgroundSecondary,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: darkColors.border,
    padding: 16,
    gap: 4,
    overflow: 'hidden',
  },
  zone: { alignItems: 'center', gap: 6, width: '67%' },
  enemyZone: { alignSelf: 'flex-end' },
  playerZone: { alignSelf: 'flex-start', marginTop: -34 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  bars: { alignSelf: 'stretch', gap: 8, marginTop: 4 },
  flash: { ...StyleSheet.absoluteFillObject, borderRadius: 999 },
  float: { position: 'absolute', top: 0, alignSelf: 'center' },
  impactBurst: { position: 'absolute', alignSelf: 'center', top: '46%', zIndex: 9 },
  blockFlash: {
    ...StyleSheet.absoluteFillObject, borderRadius: 999, borderWidth: 4,
    borderColor: darkColors.brandGold, backgroundColor: 'rgba(91,170,168,0.2)',
    alignItems: 'center', justifyContent: 'center', zIndex: 7,
  },
  guardAura: {
    position: 'absolute', inset: -8, borderRadius: 999, borderWidth: 3,
    borderColor: darkColors.brandGold, backgroundColor: 'rgba(91,170,168,0.12)',
    alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: darkColors.border },
});
