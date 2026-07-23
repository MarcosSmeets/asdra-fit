import {
  buildJourneyNodes,
  getNodeByIdSafe,
  getNodePositionSafe,
  journeyPath,
  resolvePathNodes,
  travelerStartIndex,
  validateJourneyGraph,
  type JourneyNode,
} from './journeyNodes';
import { getCampaignState } from './campaign';

describe('JourneyNode map', () => {
  it('connects only adjacent declared nodes and finds the correct route', () => {
    const nodes = buildJourneyNodes(getCampaignState(['r1-1', 'r1-2', 'r1-3'])[0]!);
    expect(nodes[1]?.connectedNodeIds).toEqual(['r1-1', 'r1-3']);
    expect(journeyPath(nodes, 'r1-1', 'r1-4')).toEqual(['r1-1', 'r1-2', 'r1-3', 'r1-4']);
  });

  it('keeps locked nodes non-selectable and positions traveler on last victory', () => {
    const region = getCampaignState(['r1-1'])[0]!;
    const nodes = buildJourneyNodes(region);
    expect(nodes[2]?.unlocked).toBe(false);
    expect(travelerStartIndex(region.adversaries)).toBe(0);
  });

  it('rejects a node without finite x/y instead of exposing it to animation', () => {
    const malformed = {
      id: 'broken', type: 'stage', position: { x: undefined, y: 48 },
      connectedNodeIds: [], unlocked: true, completed: false,
    } as unknown as JourneyNode;

    expect(getNodeByIdSafe([malformed], 'broken')).toBeUndefined();
    expect(getNodePositionSafe([malformed], 'broken')).toBeUndefined();
    expect(validateJourneyGraph([malformed]).valid).toBe(false);
  });

  it('reports an invalid connectedNodeId and never resolves a partial animation path', () => {
    const nodes: JourneyNode[] = [
      { id: 'a', type: 'stage', position: { x: 0.2, y: 48 }, connectedNodeIds: ['missing'], unlocked: true, completed: false },
      { id: 'b', type: 'boss', position: { x: 0.8, y: 144 }, connectedNodeIds: [], unlocked: true, completed: false },
    ];

    expect(validateJourneyGraph(nodes)).toMatchObject({ valid: false });
    expect(resolvePathNodes(nodes, ['a', 'missing', 'b'])).toBeUndefined();
    expect(resolvePathNodes(nodes, [])).toBeUndefined();
    expect(journeyPath(nodes, 'a', 'b')).toEqual([]);
  });

  it('resolves every valid node and position in a selectable route', () => {
    const nodes = buildJourneyNodes(getCampaignState([])[0]!);
    const path = journeyPath(nodes, 'r1-1', 'r1-3');
    const resolved = resolvePathNodes(nodes, path);

    expect(resolved?.map((node) => node.id)).toEqual(['r1-1', 'r1-2', 'r1-3']);
    expect(resolved?.every((node) => Number.isFinite(node.position.x) && Number.isFinite(node.position.y))).toBe(true);
  });
});
