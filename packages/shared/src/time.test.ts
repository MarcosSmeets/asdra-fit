import { DateTime } from 'luxon';
import {
  getNextWeekStart,
  getWeekBounds,
  getWeekKey,
  isSameWeek,
  weekKeysBetween,
} from './time';

const SP = 'America/Sao_Paulo';

describe('time (semana timezone-aware)', () => {
  it('segunda→domingo no fuso do usuário', () => {
    // 2026-01-07 é uma quarta-feira.
    const { weekStart, weekEnd } = getWeekBounds('2026-01-07T12:00:00.000Z', SP);
    const startLocal = DateTime.fromISO(weekStart, { zone: 'utc' }).setZone(SP);
    const endLocal = DateTime.fromISO(weekEnd, { zone: 'utc' }).setZone(SP);
    expect(startLocal.weekday).toBe(1); // segunda
    expect(startLocal.hour).toBe(0);
    expect(endLocal.weekday).toBe(7); // domingo
    expect(endLocal.hour).toBe(23);
  });

  it('mesma semana para dias diferentes dentro dela', () => {
    expect(isSameWeek('2026-01-05T00:00:00Z', '2026-01-11T00:00:00Z', 'UTC')).toBe(true);
    expect(isSameWeek('2026-01-05T00:00:00Z', '2026-01-12T00:00:00Z', 'UTC')).toBe(false);
  });

  it('virada de ano: semana ISO cruzando dezembro/janeiro', () => {
    // 2025-12-31 (quarta) e 2026-01-01 (quinta) estão na mesma semana ISO.
    expect(isSameWeek('2025-12-31T12:00:00Z', '2026-01-01T12:00:00Z', 'UTC')).toBe(true);
  });

  it('fusos diferentes podem colocar o mesmo instante em semanas diferentes', () => {
    // Domingo 23:30 em SP (UTC-3) = segunda 02:30 UTC → semanas distintas.
    const instant = '2026-01-12T02:30:00.000Z';
    const spKey = getWeekKey(instant, SP);
    const utcKey = getWeekKey(instant, 'UTC');
    expect(spKey).not.toBe(utcKey);
  });

  it('atividade offline perto da meia-noite fica na semana local correta', () => {
    // 2026-01-12T02:30Z: em SP são 23:30 de domingo 11/01 → semana que começa 05/01.
    const { weekStart } = getWeekBounds('2026-01-12T02:30:00.000Z', SP);
    const startLocal = DateTime.fromISO(weekStart, { zone: 'utc' }).setZone(SP);
    expect(startLocal.toISODate()).toBe('2026-01-05');
  });

  it('horário de verão não quebra os limites (Sao_Paulo historicamente com DST)', () => {
    // 2018 ainda tinha DST no Brasil; garante que start/end permanecem seg/dom.
    const { weekStart, weekEnd } = getWeekBounds('2018-02-14T12:00:00.000Z', SP);
    const startLocal = DateTime.fromISO(weekStart, { zone: 'utc' }).setZone(SP);
    const endLocal = DateTime.fromISO(weekEnd, { zone: 'utc' }).setZone(SP);
    expect(startLocal.weekday).toBe(1);
    expect(endLocal.weekday).toBe(7);
  });

  it('getNextWeekStart avança exatamente uma semana', () => {
    const next = getNextWeekStart('2026-01-07T12:00:00Z', 'UTC');
    expect(next.startsWith('2026-01-12')).toBe(true);
  });

  it('weekKeysBetween lista as semanas inclusive', () => {
    const keys = weekKeysBetween('2026-01-05T00:00:00Z', '2026-01-26T00:00:00Z', 'UTC');
    expect(keys).toHaveLength(4);
    expect(keys[0]).toBe('2026-W02');
  });

  it('rejeita fuso inválido', () => {
    expect(() => getWeekBounds('2026-01-07T00:00:00Z', 'Nao/Existe')).toThrow();
  });
});
