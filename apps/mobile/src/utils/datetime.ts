import { DateTime } from 'luxon';

export function nowIso(): string {
  return new Date().toISOString();
}

/** Limites do dia local (no fuso do usuário), retornados em UTC ISO. */
export function dayBounds(instantIso: string, timezone: string): { start: string; end: string } {
  const local = DateTime.fromISO(instantIso, { zone: 'utc' }).setZone(timezone);
  const start = local.startOf('day').toUTC().toISO();
  const end = local.endOf('day').toUTC().toISO();
  if (!start || !end) {
    throw new Error('Falha ao calcular limites do dia');
  }
  return { start, end };
}

/** Chave estável do dia local (YYYY-MM-DD no fuso do usuário). Reinicia limites diários. */
export function dayKey(instantIso: string, timezone: string): string {
  const key = DateTime.fromISO(instantIso, { zone: 'utc' }).setZone(timezone).toISODate();
  if (!key) {
    throw new Error('Falha ao calcular a chave do dia');
  }
  return key;
}

/** Formata data/hora para exibição no fuso do usuário. */
export function formatDateTime(instantIso: string, timezone: string): string {
  return DateTime.fromISO(instantIso, { zone: 'utc' })
    .setZone(timezone)
    .toFormat("dd/MM/yyyy 'às' HH:mm");
}

export function formatDate(instantIso: string, timezone: string): string {
  return DateTime.fromISO(instantIso, { zone: 'utc' }).setZone(timezone).toFormat('dd/MM/yyyy');
}
