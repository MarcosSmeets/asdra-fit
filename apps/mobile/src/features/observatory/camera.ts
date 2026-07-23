import type { WorldPosition } from '@ad-sidera/shared';
import { OBSERVATORY_WORLD } from './world';

export interface CameraState extends WorldPosition {
  viewportWidth: number;
  viewportHeight: number;
  scale: number;
}

export function cameraFor(
  target: WorldPosition,
  viewportWidth: number,
  viewportHeight: number,
  previous?: CameraState,
  reducedMotion = false,
): CameraState {
  const scale = Math.max(viewportWidth / OBSERVATORY_WORLD.width, 0.62);
  const visibleWorldWidth = viewportWidth / scale;
  const visibleWorldHeight = viewportHeight / scale;
  const maxX = Math.max(0, OBSERVATORY_WORLD.width - visibleWorldWidth);
  const maxY = Math.max(0, OBSERVATORY_WORLD.height - visibleWorldHeight);
  const desiredX = Math.max(0, Math.min(maxX, target.x - visibleWorldWidth / 2));
  const desiredY = Math.max(0, Math.min(maxY, target.y - visibleWorldHeight / 2));
  const smoothing = reducedMotion || !previous ? 1 : 0.16;
  return {
    x: (previous?.x ?? desiredX) + (desiredX - (previous?.x ?? desiredX)) * smoothing,
    y: (previous?.y ?? desiredY) + (desiredY - (previous?.y ?? desiredY)) * smoothing,
    viewportWidth,
    viewportHeight,
    scale,
  };
}

export function screenToWorld(point: WorldPosition, camera: CameraState): WorldPosition {
  return { x: point.x / camera.scale + camera.x, y: point.y / camera.scale + camera.y };
}

