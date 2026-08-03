import type { WorldPosition } from '@ad-sidera/shared';
import type { AdversaryState, RegionState } from './campaign';

export type JourneyNodeType = 'stage' | 'elite' | 'boss' | 'event';

export interface JourneyNode {
  id: string;
  type: JourneyNodeType;
  position: WorldPosition;
  connectedNodeIds: string[];
  unlocked: boolean;
  completed: boolean;
}

export type JourneyGraphIssueCode = 'duplicate-id' | 'invalid-position' | 'missing-connection';

export interface JourneyGraphIssue {
  code: JourneyGraphIssueCode;
  nodeId: string;
  relatedNodeId?: string;
}

export interface JourneyGraphValidation {
  valid: boolean;
  issues: JourneyGraphIssue[];
}

function isFinitePosition(position: WorldPosition | undefined): boolean {
  return Boolean(position)
    && Number.isFinite(position?.x)
    && Number.isFinite(position?.y);
}

function hasFinitePosition(node: JourneyNode | undefined): node is JourneyNode {
  return node !== undefined && isFinitePosition(node.position);
}

/** Nunca entrega um nó malformado para Animated.ValueXY. */
export function getNodeByIdSafe(nodes: readonly JourneyNode[], id: string): JourneyNode | undefined {
  const node = nodes.find((candidate) => candidate.id === id);
  return hasFinitePosition(node) ? node : undefined;
}

export function getNodePositionSafe(nodes: readonly JourneyNode[], id: string): WorldPosition | undefined {
  return getNodeByIdSafe(nodes, id)?.position;
}

/** Resolve o caminho de forma atômica: um único trecho inválido rejeita toda a animação. */
export function resolvePathNodes(
  nodes: readonly JourneyNode[],
  pathIds: readonly string[],
): JourneyNode[] | undefined {
  if (pathIds.length === 0) return undefined;
  const resolved = pathIds.map((id) => getNodeByIdSafe(nodes, id));
  return resolved.every((node): node is JourneyNode => Boolean(node)) ? resolved : undefined;
}

export function validateJourneyGraph(nodes: readonly JourneyNode[]): JourneyGraphValidation {
  const issues: JourneyGraphIssue[] = [];
  const ids = new Set<string>();
  for (const node of nodes) {
    if (ids.has(node.id)) issues.push({ code: 'duplicate-id', nodeId: node.id });
    ids.add(node.id);
    if (!isFinitePosition(node.position)) issues.push({ code: 'invalid-position', nodeId: node.id });
  }
  for (const node of nodes) {
    for (const connectedNodeId of node.connectedNodeIds) {
      if (!ids.has(connectedNodeId)) {
        issues.push({ code: 'missing-connection', nodeId: node.id, relatedNodeId: connectedNodeId });
      }
    }
  }
  return { valid: issues.length === 0, issues };
}

function nodeType(state: AdversaryState): JourneyNodeType {
  if (state.adversary.difficultyType === 'boss') return 'boss';
  if (state.adversary.difficultyType === 'elite') return 'elite';
  return 'stage';
}

/** Coordenadas lógicas normalizadas; a view apenas escala X para a largura disponível. */
export function buildJourneyNodes(region: RegionState): JourneyNode[] {
  return region.adversaries.map((state, index, all) => ({
    id: state.adversary.id,
    type: nodeType(state),
    position: { x: index % 2 === 0 ? 0.18 : 0.82, y: index * 96 + 48 },
    connectedNodeIds: [all[index - 1]?.adversary.id, all[index + 1]?.adversary.id]
      .filter((id): id is string => Boolean(id)),
    unlocked: state.unlocked,
    completed: state.defeated,
  }));
}

/** BFS sobre conexões declaradas: não existe pathfinding livre no mapa da Jornada. */
export function journeyPath(nodes: readonly JourneyNode[], fromId: string, toId: string): string[] {
  if (fromId === toId) return [fromId];
  const byId = new Map(nodes.filter(hasFinitePosition).map((node) => [node.id, node]));
  if (!byId.has(fromId) || !byId.has(toId)) return [];
  const queue: string[][] = [[fromId]];
  const seen = new Set([fromId]);
  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = byId.get(path[path.length - 1]!);
    for (const next of current?.connectedNodeIds ?? []) {
      if (seen.has(next) || !byId.has(next)) continue;
      const candidate = [...path, next];
      if (next === toId) return candidate;
      seen.add(next);
      queue.push(candidate);
    }
  }
  return [];
}

export function travelerStartIndex(adversaries: readonly AdversaryState[]): number {
  const lastDefeated = adversaries.reduce((last, item, index) => item.defeated ? index : last, -1);
  if (lastDefeated >= 0) return lastDefeated;
  const firstUnlocked = adversaries.findIndex((item) => item.unlocked);
  return Math.max(0, firstUnlocked);
}
