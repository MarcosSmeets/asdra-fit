import type { WorldPosition } from '@ad-sidera/shared';
import type { ObservatoryObjectType } from './world';

export type ObservatoryRuntimeState =
  | { type: 'loadingAssets' }
  | { type: 'ready' }
  | { type: 'walking'; destination: WorldPosition }
  | { type: 'interacting'; targetId: string }
  | { type: 'petting'; adariId: string }
  | { type: 'feeding'; adariId: string }
  | { type: 'resting' }
  | { type: 'openingPortal' }
  | { type: 'errorRecoverable'; errorCode: string };

export function runtimeForInteraction(
  targetId: string,
  targetType: ObservatoryObjectType,
  adariId: string,
): ObservatoryRuntimeState {
  switch (targetType) {
    case 'adari':
      return { type: 'petting', adariId };
    case 'feeding_table':
      return { type: 'feeding', adariId };
    case 'nest':
      return { type: 'resting' };
    case 'journey_portal':
      return { type: 'openingPortal' };
    default:
      return { type: 'interacting', targetId };
  }
}

export function isBlockingRuntimeState(state: ObservatoryRuntimeState): boolean {
  return state.type === 'loadingAssets';
}
