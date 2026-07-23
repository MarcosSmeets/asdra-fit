import type { WorldPosition } from '@ad-sidera/shared';
import { distance } from './geometry';
import type { InteractiveObject } from './world';

export function nearestInteractionTarget(
  player: WorldPosition,
  targets: readonly InteractiveObject[],
): InteractiveObject | null {
  let nearest: InteractiveObject | null = null;
  let nearestDistance = Infinity;
  for (const target of targets) {
    if (!target.enabled) continue;
    const d = distance(player, target.position);
    if (d <= target.interactionRadius && d < nearestDistance) {
      nearest = target;
      nearestDistance = d;
    }
  }
  return nearest;
}

export function canInteract(player: WorldPosition, target: InteractiveObject): boolean {
  return target.enabled && distance(player, target.position) <= target.interactionRadius;
}

