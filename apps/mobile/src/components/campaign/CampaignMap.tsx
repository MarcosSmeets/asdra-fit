import type { PlayerAvatarAppearance, RegionDefinition } from '@ad-sidera/shared';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
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
import { AdariPortrait } from '../adari/AdariPortrait';
import { PlayerAvatar } from '../avatar/PlayerAvatar';
import { StarIcon } from '../icons/StarIcon';
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
  avatarAppearance?: PlayerAvatarAppearance;
  creatureKey?: string;
  showTravelers?: boolean;
}

/** Cor de destaque por região: r1 teal, r2 ouro, r3 primário. */
function useRegionAccent(regionKey: string): string {
  const theme = useTheme();
  if (regionKey === 'r1') {
    return theme.colors.brandTeal;
  }
  if (regionKey === 'r2') {
    return theme.colors.brandGold;
  }
  return theme.colors.primary;
}

function nodeState(adv: AdversaryState): CampaignNodeState {
  if (adv.defeated) {
    return 'defeated';
  }
  return adv.unlocked ? 'available' : 'locked';
}

/**
 * Trilha estelar vertical de uma região: nós conectados por uma linha SVG de cima
 * para baixo (4 comuns + 1 chefe). Segmentos já percorridos ganham a cor da região.
 */
export function CampaignMap({
  region, adversaries, onSelect, avatarAppearance, creatureKey, showTravelers = false,
}: CampaignMapProps): React.ReactElement {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const accent = useRegionAccent(region.key);

  const rows = adversaries.length;
  const [mapWidth, setMapWidth] = useState(280);
  const [traveling, setTraveling] = useState(false);
  const startIndex = travelerStartIndex(adversaries);
  const [travelerIndex, setTravelerIndex] = useState(startIndex);
  const travelerX = useRef(new Animated.Value(0)).current;
  const travelerY = useRef(new Animated.Value(0)).current;
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
      if (__DEV__) console.warn('[CampaignMap] SeleÃ§Ã£o rejeitada por grafo invÃ¡lido.', { adversaryId, issues: graphValidation.issues });
      return;
    }
    const path = journeyPath(nodes, currentNode.id, targetNode.id);
    const pathNodes = resolvePathNodes(nodes, path);
    if (!pathNodes) {
      if (__DEV__) console.warn('[CampaignMap] Caminho invÃ¡lido; animaÃ§Ã£o cancelada.', { from: currentNode.id, to: targetNode.id, path });
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {/* Cabeçalho da região */}
      <View style={styles.header}>
        <View style={[styles.accentBadge, { backgroundColor: accent }]}>
          <StarIcon size={16} color={theme.colors.onPrimary} />
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

      {/* Trilha + nós */}
      <View
        style={{ position: 'relative', minHeight: totalHeight }}
        onLayout={(event) => {
          const nextWidth = event.nativeEvent.layout.width;
          if (Number.isFinite(nextWidth) && nextWidth > 0) setMapWidth(nextWidth);
        }}
      >
        <Svg
          width={mapWidth}
          height={totalHeight}
          style={styles.trail}
          pointerEvents="none"
        >
          {nodes.slice(0, -1).map((node, index) => {
            const nextNode = nodes[index + 1];
            if (!nextNode) return null;
            const from = nodePoint(node);
            const to = nodePoint(nextNode);
            return (
              <Line
                key={node.id}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={node.completed ? accent : theme.colors.border}
                strokeWidth={3}
                strokeLinecap="round"
              />
            );
          })}
        </Svg>

        {showTravelers && avatarAppearance && creatureKey && !regionLocked ? (
          <Animated.View
            pointerEvents="none"
            testID="journey-travelers"
            style={[styles.travelers, { transform: [{ translateX: travelerX }, { translateY: travelerY }] }]}
          >
            <AdariPortrait creatureKey={creatureKey} size={46} mood={traveling ? 'happy' : 'ready'} />
            <PlayerAvatar appearance={avatarAppearance} height={76} />
          </Animated.View>
        ) : null}

        {adversaries.map((adv, index) => (
          <CampaignNode
            key={adv.adversary.id}
            title={adv.adversary.name}
            state={nodeState(adv)}
            isBoss={adv.adversary.isBoss}
            accent={accent}
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
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accentBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trail: { position: 'absolute', left: 0, top: 0 },
  travelers: {
    position: 'absolute', left: 0, top: 0, zIndex: 8, width: 88, height: 78,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: -12,
  },
});
