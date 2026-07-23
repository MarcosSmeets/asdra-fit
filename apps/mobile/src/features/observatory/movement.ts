import type { WorldPosition } from '@ad-sidera/shared';
import { findPath } from './navigation';

export interface MovementCommand {
  destination: WorldPosition;
  path: WorldPosition[];
  commandId: number;
}

/** Um novo toque sempre substitui, de forma atômica, o caminho anterior. */
export function replaceMovementCommand(
  currentCommandId: number,
  from: WorldPosition,
  destination: WorldPosition,
): MovementCommand {
  return {
    destination,
    path: findPath(from, destination),
    commandId: currentCommandId + 1,
  };
}

