import { DateTime } from 'luxon';
import { isRewardEligibleDuration } from './rewards';

export interface CountableActivity {
  activityType: string;
  /** ISO (UTC). */
  occurredAt: string;
  durationMinutes: number;
}

/**
 * Conta os DIAS válidos da semana (economia v2): número de dias locais distintos
 * (no fuso do usuário) com pelo menos uma atividade ELEGÍVEL (duração >= mínimo).
 * Apenas a 1ª atividade elegível de cada dia conta para a meta/liga — por isso a
 * unidade de progresso é o DIA, não a atividade. Fonte única usada por app e backend.
 */
export function countValidDays(
  activities: readonly CountableActivity[],
  timezone: string,
): number {
  const days = new Set<string>();
  for (const activity of activities) {
    if (!isRewardEligibleDuration(activity.durationMinutes)) {
      continue;
    }
    const day = DateTime.fromISO(activity.occurredAt, { zone: 'utc' }).setZone(timezone);
    if (!day.isValid) {
      continue;
    }
    const iso = day.toISODate();
    if (iso) {
      days.add(iso);
    }
  }
  return days.size;
}
