import type { RegionDefinition } from '@ad-sidera/shared';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, ImageBackground, StyleSheet, View } from 'react-native';
import { journeyRegionAssets } from '../../content/journey/tiles';
import type { AdversaryState } from '../../domain/campaign';
import {
  buildJourneyNodes,
  getNodeByIdSafe,
  journeyPath,
  resolvePathNodes,
  travelerStartIndex,
  validateJourneyGraph,
  type JourneyNode,
} from '../../domain/journeyNodes';
import { useReducedMotion, useTheme } from '../../theme/ThemeProvider';
import { AdariActionSprite } from '../adari/AdariActionSprite';
import { Text } from '../Text';
import {
  CAMPAIGN_ROW_HEIGHT,
  CampaignNode,
  type CampaignNodeState,
} from './CampaignNode';

export interface CampaignMapProps {
  region: RegionDefinition;
  /** Adversários da região (de getCampaignState → RegionState.adversaries). */
  adversaries: AdversaryState[];
  onSelect: (adversaryId: string) => void;
  creatureKey?: string;
  /** Estágio evolutivo do Adari que acompanha o avatar (0..3). */
  creatureStage?: number;
  showTravelers?: boolean;
}

/** Cor de destaque por região: r1 teal, r2 ouro, r3 violeta. */
function useRegionAccent(regionKey: string): string {
  const theme = useTheme();
  if (regionKey === 'r1') {
    return theme.colors.brandTeal;
  }
  if (regionKey === 'r2') {
    return theme.colors.brandGold;
  }
  return theme.palette.energy.purple;
}

function nodeState(adv: AdversaryState): CampaignNodeState {
  if (adv.defeated) {
    return 'defeated';
  }
  return adv.unlocked ? 'available' : 'locked';
}

const TRAIL_WIDTH = 4;

/**
 * Trilha pixel vertical de uma região (4 comuns + 1 chefe): chão em tiles da
 * região com parallax leve, caminho digital em degraus (segmentos duros de
 * Views — sem SVG) e nós pixel. Segmentos percorridos ganham a cor da região.
 * A lógica de grafo/caminho é 100% de journeyNodes.ts (spec §27) — intocada.
 */
export function CampaignMap({
  region, adversaries, onSelect, creatureKey, creatureStage = 0, showTravelers = false,
}: CampaignMapProps): React.ReactElement {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const accent = useRegionAccent(region.key);
  const assets = journeyRegionAssets(region.key);

  const rows = adversaries.length;
  const [mapWidth, setMapWidth] = useState(280);
  const [traveling, setTraveling] = useState(false);
  const startIndex = travelerStartIndex(adversaries);
  const [travelerIndex, setTravelerIndex] = useState(startIndex);
  const travelerX = useRef(new Animated.Value(0)).current;
  const travelerY = useRef(new Animated.Value(0)).current;
  const groundDrift = useRef(new Animated.Value(0)).current;
  const nodes = useMemo(
    () => buildJourneyNodes({ region, unlocked: true, adversaries }),
    [adversaries, region],
  );
  const graphValidation = useMemo(() => validateJourneyGraph(nodes), [nodes]);
  const totalHeight = rows * CAMPAIGN_ROW_HEIGHT;
  const nodePoint = (node: JourneyNode) => ({
    x: node.position.x >= 0 && node.position.x <= 1 ? node.position.x * mapWidth : node.position.x,
    y: node.position.y,
  });

  const regionLocked = rows > 0 && adversaries.every((a) => !a.unlocked && !a.defeated);
  const travelerPoint = (node: JourneyNode) => ({
    x: nodePoint(node).x - 44,
    y: nodePoint(node).y - 78,
  });

  useEffect(() => {
    if (reducedMotion) {
      groundDrift.setValue(0);
      return undefined;
    }
    const drift = Animated.loop(Animated.sequence([
      Animated.timing(groundDrift, { toValue: 1, duration: 9000, useNativeDriver: true }),
      Animated.timing(groundDrift, { toValue: 0, duration: 9000, useNativeDriver: true }),
    ]));
    drift.start();
    return () => drift.stop();
  }, [groundDrift, reducedMotion]);

  useEffect(() => {
    if (!traveling) {
      const startNode = nodes[startIndex] ?? nodes[0];
      if (startNode && getNodeByIdSafe(nodes, startNode.id)) {
        setTravelerIndex(nodes.indexOf(startNode));
        const point = travelerPoint(startNode);
        travelerX.setValue(point.x);
        travelerY.setValue(point.y);
      }
    }
    // As funções usam exclusivamente largura e índice; não reiniciar durante a animação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startIndex, mapWidth, showTravelers]);

  const selectNode = (adversaryId: string): void => {
    const targetIndex = adversaries.findIndex((item) => item.adversary.id === adversaryId);
    if (targetIndex < 0 || !adversaries[targetIndex]?.unlocked || traveling) return;
    const currentNode = nodes[travelerIndex];
    const targetNode = getNodeByIdSafe(nodes, adversaryId);
    if (!currentNode || !targetNode || !graphValidation.valid) {
      if (__DEV__) console.warn('[CampaignMap] Seleção rejeitada por grafo inválido.', { adversaryId, issues: graphValidation.issues });
      return;
    }
    const path = journeyPath(nodes, currentNode.id, targetNode.id);
    const pathNodes = resolvePathNodes(nodes, path);
    if (!pathNodes) {
      if (__DEV__) console.warn('[CampaignMap] Caminho inválido; animação cancelada.', { from: currentNode.id, to: targetNode.id, path });
      return;
    }
    const animationNodes = pathNodes.slice(1);
    if (animationNodes.length === 0) {
      onSelect(adversaryId);
      return;
    }
    setTraveling(true);
    Animated.sequence(animationNodes.map((node) => {
      const point = travelerPoint(node);
      return Animated.parallel([
        Animated.timing(travelerX, {
          toValue: point.x, duration: reducedMotion ? 1 : 360,
          easing: undefined, useNativeDriver: true,
        }),
        Animated.timing(travelerY, {
          toValue: point.y, duration: reducedMotion ? 1 : 360,
          easing: undefined, useNativeDriver: true,
        }),
      ]);
    })).start(({ finished }) => {
      setTraveling(false);
      if (!finished) return;
      setTravelerIndex(targetIndex);
      onSelect(adversaryId);
    });
  };

  const groundX = groundDrift.interpolate({ inputRange: [0, 1], outputRange: [-4, 4] });

  /** Caminho digital em degraus: segmento vertical + horizontal por par de nós. */
  const trailSegments = nodes.slice(0, -1).flatMap((node, index) => {
    const nextNode = nodes[index + 1];
    if (!nextNode) return [];
    const from = nodePoint(node);
    const to = nodePoint(nextNode);
    const color = node.completed ? accent : theme.colors.border;
    const minX = Math.min(from.x, to.x);
    return [
      {
        key: `${node.id}-v`,
        style: {
          left: from.x - TRAIL_WIDTH / 2,
          top: Math.min(from.y, to.y),
          width: TRAIL_WIDTH,
          height: Math.abs(to.y - from.y),
          backgroundColor: color,
        },
      },
      {
        key: `${node.id}-h`,
        style: {
          left: minX - TRAIL_WIDTH / 2,
          top: to.y - TRAIL_WIDTH / 2,
          width: Math.abs(to.x - from.x) + TRAIL_WIDTH,
          height: TRAIL_WIDTH,
          backgroundColor: color,
        },
      },
    ];
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg }]}>
      {/* Cabeçalho da região com o portal pixel */}
      <View style={styles.header}>
        <View style={[styles.accentBadge, { borderColor: accent, backgroundColor: theme.colors.surfaceAlt }]}>
          <Image source={assets.portal} style={{ width: 26, height: 26 }} resizeMode="contain" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="section" accessibilityRole="header">
            {region.name}
          </Text>
          <Text variant="caption" color="textMuted">
            {region.theme}
          </Text>
        </View>
      </View>

      {regionLocked ? (
        <Text variant="caption" color="textMuted">
          Bloqueada — vença o chefe da região anterior para abrir esta trilha.
        </Text>
      ) : null}
      {!graphValidation.valid ? (
        <Text variant="caption" color="textMuted" accessibilityLiveRegion="polite">
          Esta trilha está temporariamente indisponível. Seu progresso permanece seguro.
        </Text>
      ) : null}

      {/* Chão da região (tiles com parallax leve) + trilha + nós */}
      <View
        style={{ position: 'relative', minHeight: totalHeight, overflow: 'hidden' }}
        onLayout={(event) => {
          const nextWidth = event.nativeEvent.layout.width;
          if (Number.isFinite(nextWidth) && nextWidth > 0) setMapWidth(nextWidth);
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { transform: [{ translateX: groundX }], margin: -6 }]}
        >
          <ImageBackground
            source={assets.ground}
            resizeMode="repeat"
            style={StyleSheet.absoluteFill}
            imageStyle={{ opacity: 0.34 }}
          />
        </Animated.View>

        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {trailSegments.map((segment) => (
            <View key={segment.key} style={[{ position: 'absolute' }, segment.style]} />
          ))}
        </View>

        {/* A guarda perdeu o `avatarAppearance`: mantê-lo faria os travelers
            sumirem por completo, levando o Adari junto. */}
        {showTravelers && creatureKey && !regionLocked ? (
          <Animated.View
            pointerEvents="none"
            testID="journey-travelers"
            style={[styles.travelers, { transform: [{ translateX: travelerX }, { translateY: travelerY }] }]}
          >
            <AdariActionSprite
              creatureKey={creatureKey}
              state={traveling ? 'happy' : 'idle'}
              size={46}
              stage={creatureStage}
              reduceMotion={reducedMotion}
            />
          </Animated.View>
        ) : null}

        {adversaries.map((adv, index) => (
          <CampaignNode
            key={adv.adversary.id}
            title={adv.adversary.name}
            state={nodeState(adv)}
            isBoss={adv.adversary.isBoss}
            accent={accent}
            regionKey={region.key}
            onPress={adv.unlocked && !traveling && graphValidation.valid ? () => selectNode(adv.adversary.id) : undefined}
            side={index % 2 === 0 ? 'left' : 'right'}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    padding: 16,
    gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accentBadge: {
    width: 36,
    height: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  travelers: {
    position: 'absolute', left: 0, top: 0, zIndex: 8, width: 88, height: 78,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: -12,
  },
});
