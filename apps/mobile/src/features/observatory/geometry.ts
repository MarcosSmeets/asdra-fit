import type { WorldPosition } from '@ad-sidera/shared';
import { OBSERVATORY_WORLD, STATIC_OBSTACLES, type WorldRect } from './world';

export function distance(a: WorldPosition, b: WorldPosition): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pointInRect(point: WorldPosition, rect: WorldRect, padding = 0): boolean {
  return (
    point.x >= rect.x - padding &&
    point.x <= rect.x + rect.width + padding &&
    point.y >= rect.y - padding &&
    point.y <= rect.y + rect.height + padding
  );
}

export function isWalkable(
  point: WorldPosition,
  obstacles: readonly WorldRect[] = STATIC_OBSTACLES,
  actorRadius = 14,
): boolean {
  const bounds = OBSERVATORY_WORLD.walkableBounds;
  if (
    point.x < bounds.x + actorRadius ||
    point.x > bounds.x + bounds.width - actorRadius ||
    point.y < bounds.y + actorRadius ||
    point.y > bounds.y + bounds.height - actorRadius
  ) {
    return false;
  }
  return !obstacles.some((obstacle) => pointInRect(point, obstacle, actorRadius));
}

export function nearestWalkable(point: WorldPosition): WorldPosition {
  if (isWalkable(point)) return point;
  const { gridSize } = OBSERVATORY_WORLD;
  for (let radius = gridSize; radius <= 360; radius += gridSize) {
    for (let angle = 0; angle < 360; angle += 15) {
      const radians = (angle * Math.PI) / 180;
      const candidate = {
        x: Math.round(point.x + Math.cos(radians) * radius),
        y: Math.round(point.y + Math.sin(radians) * radius),
      };
      if (isWalkable(candidate)) return candidate;
    }
  }
  return { ...OBSERVATORY_WORLD.startPosition };
}

export function moveTowards(
  from: WorldPosition,
  to: WorldPosition,
  maxDistance: number,
): WorldPosition {
  const total = distance(from, to);
  if (total <= maxDistance || total === 0) return { ...to };
  const ratio = maxDistance / total;
  return { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio };
}

export function renderOrder(position: WorldPosition): number {
  return position.y;
}

