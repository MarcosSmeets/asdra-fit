import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import { journeyRegionAssets } from '../../content/journey/tiles';
import { useReducedMotion, useTheme } from '../../theme/ThemeProvider';
import { Text } from '../Text';

/** Altura fixa de cada linha do mapa (usada para alinhar a trilha). */
export const CAMPAIGN_ROW_HEIGHT = 96;
/** Largura da coluna do nó; o quadrado fica centralizado em CAMPAIGN_NODE_GUTTER/2. */
export const CAMPAIGN_NODE_GUTTER = 72;

const NODE_SIZE = 52;
const RING_SIZE = NODE_SIZE + 12;

export type CampaignNodeState = 'defeated' | 'available' | 'locked';

export interface CampaignNodeProps {
  title: string;
  state: CampaignNodeState;
  isBoss?: boolean;
  /** Cor de destaque da região (borda disponível). Padrão: teal. */
  accent?: string;
  /** Região do nó (r1/r2/r3) — chefes mostram o portal pixel da região. */
  regionKey?: string;
  onPress?: () => void;
  side?: 'left' | 'right';
}

const STATE_WORD: Record<CampaignNodeState, string> = {
  defeated: 'Vencido',
  available: 'Disponível',
  locked: 'Bloqueado',
};

/** Cadeado pixel desenhado com Views (sem SVG, sem círculos). */
function PixelLock({ color }: { color: string }): React.ReactElement {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: 14, height: 8, borderColor: color, borderTopWidth: 3, borderLeftWidth: 3, borderRightWidth: 3 }} />
      <View style={{ width: 20, height: 14, backgroundColor: color }} />
    </View>
  );
}

/**
 * Nó pixel da trilha de campanha. Não depende só de cor: vencido tem check,
 * disponível tem marcador estelar pulsante, bloqueado tem cadeado — e um rótulo
 * de estado textual. Chefes exibem o portal da região.
 */
export function CampaignNode({
  title,
  state,
  isBoss = false,
  accent,
  regionKey = 'r1',
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

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  const interactive = Boolean(onPress);
  const stateWord = STATE_WORD[state];
  const label = `${title}. ${stateWord}${isBoss ? ', chefe' : ''}.`;

  const fills: Record<CampaignNodeState, { fill: string; border: string }> = {
    defeated: { fill: theme.colors.brandGold, border: theme.palette.stellar.lightGold },
    available: { fill: theme.colors.surfaceElevated, border: ring },
    locked: { fill: theme.colors.surfaceAlt, border: theme.colors.border },
  };
  const skin = fills[state];

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

          <View style={[styles.node, { backgroundColor: skin.fill, borderColor: skin.border }]}>
            {isBoss ? (
              <Image
                source={journeyRegionAssets(regionKey).portal}
                style={{ width: NODE_SIZE - 14, height: NODE_SIZE - 14, opacity: state === 'locked' ? 0.45 : 1 }}
                resizeMode="contain"
              />
            ) : state === 'defeated' ? (
              <Text variant="heading" color="onPrimary" accessibilityElementsHidden>✓</Text>
            ) : state === 'available' ? (
              <Text variant="heading" style={{ color: ring }} accessibilityElementsHidden>✦</Text>
            ) : (
              <PixelLock color={theme.colors.textMuted} />
            )}
          </View>
        </View>
      </View>

      <View style={[styles.content, side === 'right' ? styles.contentRight : null]}>
        <View style={styles.titleRow}>
          {isBoss ? <View style={{ width: 9, height: 9, backgroundColor: theme.colors.brandGold }} /> : null}
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
    width: NODE_SIZE,
    height: NODE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderWidth: 2,
  },
  content: { flex: 1, gap: 2, paddingRight: 8 },
  contentRight: { alignItems: 'flex-end', paddingRight: 0, paddingLeft: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flexShrink: 1 },
});
