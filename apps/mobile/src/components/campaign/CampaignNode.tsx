import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useReducedMotion, useTheme } from '../../theme/ThemeProvider';
import { StarIcon } from '../icons/StarIcon';
import { Text } from '../Text';

/** Altura fixa de cada linha do mapa (usada para alinhar a trilha SVG). */
export const CAMPAIGN_ROW_HEIGHT = 96;
/** Largura da coluna do nó; o círculo fica centralizado em CAMPAIGN_NODE_GUTTER/2. */
export const CAMPAIGN_NODE_GUTTER = 72;

const NODE_DIAMETER = 54;
const RING_DIAMETER = NODE_DIAMETER + 12;

export type CampaignNodeState = 'defeated' | 'available' | 'locked';

export interface CampaignNodeProps {
  title: string;
  state: CampaignNodeState;
  isBoss?: boolean;
  /** Cor de destaque da região (anel disponível). Padrão: teal. */
  accent?: string;
  onPress?: () => void;
  side?: 'left' | 'right';
}

const STATE_WORD: Record<CampaignNodeState, string> = {
  defeated: 'Vencido',
  available: 'Disponível',
  locked: 'Bloqueado',
};

/**
 * Nó da trilha de campanha. Não depende só de cor: vencido tem check, disponível
 * tem estrela pulsante, bloqueado tem cadeado — e um rótulo de estado textual.
 */
export function CampaignNode({
  title,
  state,
  isBoss = false,
  accent,
  onPress,
  side = 'left',
}: CampaignNodeProps): React.ReactElement {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const ring = accent ?? theme.colors.brandTeal;

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (state !== 'available' || reduced) {
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1300, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [state, reduced, pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  const interactive = Boolean(onPress);
  const stateWord = STATE_WORD[state];
  const label = `${title}. ${stateWord}${isBoss ? ', chefe' : ''}.`;

  return (
    <Pressable
      onPress={interactive ? onPress : undefined}
      disabled={!interactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={interactive ? 'Abre os detalhes deste ponto da jornada.' : undefined}
      accessibilityState={{ disabled: !interactive }}
      style={[styles.row, side === 'right' ? styles.rowRight : null]}
    >
      <View style={styles.gutter}>
        <View style={styles.nodeBox}>
          {state === 'available' && !reduced ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pulseRing,
                { borderColor: ring, transform: [{ scale: ringScale }], opacity: ringOpacity },
              ]}
            />
          ) : null}
          {state === 'available' && reduced ? (
            <View
              pointerEvents="none"
              style={[styles.pulseRing, { borderColor: ring, opacity: 0.5 }]}
            />
          ) : null}

          <Svg width={NODE_DIAMETER} height={NODE_DIAMETER} viewBox="0 0 54 54">
            {state === 'defeated' ? (
              <>
                <Circle cx="27" cy="27" r="24" fill={theme.colors.brandGold} />
                <Path
                  d="M16 28 L23 35 L38 19"
                  stroke={theme.colors.surface}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </>
            ) : null}

            {state === 'available' ? (
              <Circle
                cx="27"
                cy="27"
                r="23"
                fill={theme.colors.surfaceElevated}
                stroke={ring}
                strokeWidth={3}
              />
            ) : null}

            {state === 'locked' ? (
              <>
                <Circle cx="27" cy="27" r="24" fill={theme.colors.surfaceAlt} stroke={theme.colors.border} strokeWidth={1.5} />
                <Path
                  d="M21 26 V22 a6 6 0 0 1 12 0 V26"
                  stroke={theme.colors.textMuted}
                  strokeWidth={2.6}
                  fill="none"
                  strokeLinecap="round"
                />
                <Rect x="18" y="26" width="18" height="14" rx="3" fill={theme.colors.textMuted} opacity={0.85} />
                <Circle cx="27" cy="32" r="1.8" fill={theme.colors.surfaceAlt} />
              </>
            ) : null}
          </Svg>

          {state === 'available' ? (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <View style={styles.center}>
                <StarIcon size={22} color={ring} />
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <View style={[styles.content, side === 'right' ? styles.contentRight : null]}>
        <View style={styles.titleRow}>
          {isBoss ? <StarIcon size={13} color={theme.colors.brandGold} sparkle={false} /> : null}
          <Text
            variant="label"
            numberOfLines={1}
            color={state === 'locked' ? 'textMuted' : 'text'}
            style={styles.title}
          >
            {title}
          </Text>
        </View>
        <Text
          variant="caption"
          color={state === 'defeated' ? 'success' : state === 'available' ? 'brandTeal' : 'textMuted'}
        >
          {isBoss ? `Chefe · ${stateWord}` : stateWord}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: CAMPAIGN_ROW_HEIGHT,
  },
  rowRight: { flexDirection: 'row-reverse' },
  gutter: { width: CAMPAIGN_NODE_GUTTER, alignItems: 'center', justifyContent: 'center' },
  nodeBox: {
    width: NODE_DIAMETER,
    height: NODE_DIAMETER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: RING_DIAMETER,
    height: RING_DIAMETER,
    borderRadius: RING_DIAMETER / 2,
    borderWidth: 2,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 2, paddingRight: 8 },
  contentRight: { alignItems: 'flex-end', paddingRight: 0, paddingLeft: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flexShrink: 1 },
});
