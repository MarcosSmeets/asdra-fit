import type { MovementSignal } from '@ad-sidera/shared';

/**
 * Tipos em que passos são um sinal razoável do treino declarado. Musculação,
 * mobilidade, ciclismo e natação ficam de fora de propósito: um treino legítimo
 * gera poucos passos e jamais deve aparecer como "não confirmado".
 */
const STEP_BASED_ACTIVITY_TYPES: ReadonlySet<string> = new Set([
  'caminhada',
  'corrida',
  'esporte_coletivo',
]);

export function isStepBasedActivity(activityType: string): boolean {
  return STEP_BASED_ACTIVITY_TYPES.has(activityType);
}

/**
 * O registro acontece após o treino (occurredAt é capturado ao abrir a tela),
 * então a janela medida é [occurredAt - duração, occurredAt].
 */
export function movementWindow(
  occurredAtIso: string,
  durationMinutes: number,
): { start: Date; end: Date } {
  const end = new Date(occurredAtIso);
  const start = new Date(end.getTime() - durationMinutes * 60_000);
  return { start, end };
}

/**
 * Piso generoso de passos para "movimento confirmado": caminhar de verdade
 * produz ~100 passos/min; exigimos 20/min (mín. 300) para tolerar pausas,
 * aquecimento parado e o celular fora do bolso em parte do treino.
 */
export function minStepsToConfirm(durationMinutes: number): number {
  return Math.max(300, durationMinutes * 20);
}

export function classifyMovementSignal(input: {
  activityType: string;
  durationMinutes: number;
  steps: number | null;
}): MovementSignal {
  if (!isStepBasedActivity(input.activityType)) return 'not_applicable';
  if (input.steps === null) return 'unavailable';
  return input.steps >= minStepsToConfirm(input.durationMinutes) ? 'confirmed' : 'unconfirmed';
}
