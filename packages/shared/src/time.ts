import { DateTime } from 'luxon';

/**
 * Cálculo de semana *timezone-aware*. A semana do usuário vai de segunda 00:00
 * a domingo 23:59:59.999 no SEU fuso; os limites são retornados em UTC (ISO)
 * para persistência. O ranking competitivo é sempre calculado no backend.
 */
export interface WeekBounds {
  /** Segunda 00:00 do fuso, em UTC ISO. */
  weekStart: string;
  /** Domingo 23:59:59.999 do fuso, em UTC ISO. */
  weekEnd: string;
  /** Chave estável da semana ISO no fuso (ex.: "2026-W03"). */
  weekKey: string;
}

function toLocal(instant: string | Date, timezone: string): DateTime {
  const base =
    typeof instant === 'string'
      ? DateTime.fromISO(instant, { zone: 'utc' })
      : DateTime.fromJSDate(instant, { zone: 'utc' });
  const local = base.setZone(timezone);
  if (!local.isValid) {
    throw new Error(`Data/fuso inválidos: "${String(instant)}" / "${timezone}"`);
  }
  return local;
}

export function getWeekBounds(instant: string | Date, timezone: string): WeekBounds {
  const local = toLocal(instant, timezone);
  const startLocal = local.startOf('week'); // Luxon: semana começa na segunda (ISO)
  const endLocal = local.endOf('week'); // domingo 23:59:59.999

  const weekStart = startLocal.toUTC().toISO();
  const weekEnd = endLocal.toUTC().toISO();
  if (!weekStart || !weekEnd) {
    throw new Error('Falha ao calcular os limites da semana');
  }
  return {
    weekStart,
    weekEnd,
    weekKey: `${startLocal.weekYear}-W${String(startLocal.weekNumber).padStart(2, '0')}`,
  };
}

export function getWeekKey(instant: string | Date, timezone: string): string {
  return getWeekBounds(instant, timezone).weekKey;
}

/** Chave estável do dia local (YYYY-MM-DD no fuso do usuário). Reinicia limites diários. */
export function getDayKey(instant: string | Date, timezone: string): string {
  const key = toLocal(instant, timezone).toISODate();
  if (!key) {
    throw new Error('Falha ao calcular a chave do dia');
  }
  return key;
}

export function isSameWeek(a: string | Date, b: string | Date, timezone: string): boolean {
  return getWeekKey(a, timezone) === getWeekKey(b, timezone);
}

/** Início da semana seguinte (segunda 00:00) em UTC ISO. */
export function getNextWeekStart(instant: string | Date, timezone: string): string {
  const local = toLocal(instant, timezone);
  const next = local.startOf('week').plus({ weeks: 1 });
  const iso = next.toUTC().toISO();
  if (!iso) {
    throw new Error('Falha ao calcular a próxima semana');
  }
  return iso;
}

/** Sequência de chaves de semana entre dois instantes (inclusive), no fuso. */
export function weekKeysBetween(
  from: string | Date,
  to: string | Date,
  timezone: string,
): string[] {
  let cursor = toLocal(from, timezone).startOf('week');
  const end = toLocal(to, timezone).startOf('week');
  if (cursor > end) {
    return [];
  }
  const keys: string[] = [];
  while (cursor <= end) {
    keys.push(`${cursor.weekYear}-W${String(cursor.weekNumber).padStart(2, '0')}`);
    cursor = cursor.plus({ weeks: 1 });
  }
  return keys;
}
