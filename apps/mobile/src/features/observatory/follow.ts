import type { AdariBehaviorProfile, WorldPosition } from '@ad-sidera/shared';
import { distance, isWalkable, moveTowards, nearestWalkable } from './geometry';

export interface FollowState {
  position: WorldPosition;
  stuckForMs: number;
  shouldReappear: boolean;
  moving: boolean;
}

export function updateAdariFollow(
  state: FollowState,
  player: WorldPosition,
  profile: AdariBehaviorProfile,
  elapsedMs: number,
): FollowState {
  const d = distance(state.position, player);
  if (d <= profile.followDistance) {
    return { ...state, stuckForMs: 0, shouldReappear: false, moving: false };
  }
  const targetDistance = Math.max(30, profile.followDistance);
  const ratio = Math.max(0, (d - targetDistance) / d);
  const target = {
    x: state.position.x + (player.x - state.position.x) * ratio,
    y: state.position.y + (player.y - state.position.y) * ratio,
  };
  const speed = d > 130 ? profile.movementSpeed * 1.45 : profile.movementSpeed;
  const candidate = moveTowards(state.position, target, speed * (elapsedMs / 1000));
  if (isWalkable(candidate)) {
    return { position: candidate, stuckForMs: 0, shouldReappear: false, moving: true };
  }
  const stuckForMs = state.stuckForMs + elapsedMs;
  if (stuckForMs >= 1800) {
    const safe = nearestWalkable({ x: player.x - 34, y: player.y + 28 });
    return { position: safe, stuckForMs: 0, shouldReappear: true, moving: false };
  }
  return { ...state, stuckForMs, moving: false };
}

