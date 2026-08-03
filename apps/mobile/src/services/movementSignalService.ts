import type { MovementSignal } from '@ad-sidera/shared';
import { Pedometer } from 'expo-sensors';
import { classifyMovementSignal, isStepBasedActivity, movementWindow } from '../domain/movementSignal';

export interface MovementSignalResult {
  steps: number | null;
  signal: MovementSignal;
}

/**
 * Adapter do sinal de movimento. Hoje usa o pedômetro (Core Motion no iOS, que
 * guarda ~7 dias de histórico e funciona no Expo Go). Quando houver dev build,
 * um adapter HealthKit/Health Connect pode substituir este sem tocar no resto.
 * Tudo é processado no aparelho; nenhum dado bruto de sensor sai dele.
 */
export async function collectMovementSignal(input: {
  activityType: string;
  occurredAt: string;
  durationMinutes: number;
}): Promise<MovementSignalResult> {
  if (!isStepBasedActivity(input.activityType)) {
    return { steps: null, signal: 'not_applicable' };
  }
  try {
    if (!(await Pedometer.isAvailableAsync())) {
      return { steps: null, signal: 'unavailable' };
    }
    let permission = await Pedometer.getPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) {
      permission = await Pedometer.requestPermissionsAsync();
    }
    if (!permission.granted) {
      return { steps: null, signal: 'unavailable' };
    }
    const { start, end } = movementWindow(input.occurredAt, input.durationMinutes);
    // Consulta histórica: suportada no iOS; no Android resolve em erro → unavailable.
    const result = await Pedometer.getStepCountAsync(start, end);
    const steps = Number.isFinite(result.steps) ? Math.max(0, Math.round(result.steps)) : null;
    return {
      steps,
      signal: classifyMovementSignal({
        activityType: input.activityType,
        durationMinutes: input.durationMinutes,
        steps,
      }),
    };
  } catch {
    return { steps: null, signal: 'unavailable' };
  }
}
