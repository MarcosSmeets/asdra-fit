import type { WorldPosition } from '@ad-sidera/shared';
import { isWalkable, nearestWalkable } from './geometry';
import { OBSERVATORY_WORLD } from './world';

interface GridPoint {
  col: number;
  row: number;
}

const keyOf = ({ col, row }: GridPoint): string => `${col}:${row}`;
const fromKey = (key: string): GridPoint => {
  const [col = '0', row = '0'] = key.split(':');
  return { col: Number(col), row: Number(row) };
};
const toGrid = (point: WorldPosition): GridPoint => ({
  col: Math.round(point.x / OBSERVATORY_WORLD.gridSize),
  row: Math.round(point.y / OBSERVATORY_WORLD.gridSize),
});
const toWorld = (point: GridPoint): WorldPosition => ({
  x: point.col * OBSERVATORY_WORLD.gridSize,
  y: point.row * OBSERVATORY_WORLD.gridSize,
});

/** A* ortogonal determinístico para a pequena malha estática do Observatório. */
export function findPath(start: WorldPosition, requestedDestination: WorldPosition): WorldPosition[] {
  const destination = nearestWalkable(requestedDestination);
  const startGrid = toGrid(nearestWalkable(start));
  const goalGrid = toGrid(destination);
  const startKey = keyOf(startGrid);
  const goalKey = keyOf(goalGrid);
  const open = new Set([startKey]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>([[startKey, 0]]);
  const fScore = new Map<string, number>([
    [startKey, Math.abs(startGrid.col - goalGrid.col) + Math.abs(startGrid.row - goalGrid.row)],
  ]);

  for (let iterations = 0; open.size > 0 && iterations < 2500; iterations += 1) {
    let currentKey = [...open][0]!;
    for (const candidate of open) {
      if ((fScore.get(candidate) ?? Infinity) < (fScore.get(currentKey) ?? Infinity)) {
        currentKey = candidate;
      }
    }
    if (currentKey === goalKey) {
      const path: WorldPosition[] = [destination];
      while (cameFrom.has(currentKey)) {
        currentKey = cameFrom.get(currentKey)!;
        if (currentKey !== startKey) path.unshift(toWorld(fromKey(currentKey)));
      }
      return path;
    }
    open.delete(currentKey);
    const current = fromKey(currentKey);
    const neighbors: GridPoint[] = [
      { col: current.col + 1, row: current.row },
      { col: current.col - 1, row: current.row },
      { col: current.col, row: current.row + 1 },
      { col: current.col, row: current.row - 1 },
    ];
    for (const neighbor of neighbors) {
      if (!isWalkable(toWorld(neighbor))) continue;
      const neighborKey = keyOf(neighbor);
      const tentative = (gScore.get(currentKey) ?? Infinity) + 1;
      if (tentative >= (gScore.get(neighborKey) ?? Infinity)) continue;
      cameFrom.set(neighborKey, currentKey);
      gScore.set(neighborKey, tentative);
      fScore.set(
        neighborKey,
        tentative + Math.abs(neighbor.col - goalGrid.col) + Math.abs(neighbor.row - goalGrid.row),
      );
      open.add(neighborKey);
    }
  }
  return [];
}

