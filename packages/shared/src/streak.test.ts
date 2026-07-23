import { STREAK_MESSAGES, computeStreak, type WeekOutcome } from './streak';

const week = (weekStart: string, completed: boolean): WeekOutcome => ({ weekStart, completed });

describe('streak', () => {
  it('exemplo do spec: cumprida, cumprida, falha, cumprida => atual 1, melhor 2', () => {
    const r = computeStreak([
      week('2026-01-05', true),
      week('2026-01-12', true),
      week('2026-01-19', false),
      week('2026-01-26', true),
    ]);
    expect(r.bestStreak).toBe(2);
    expect(r.currentStreak).toBe(1);
  });

  it('sequência atual conta apenas semanas contíguas até o fim', () => {
    const r = computeStreak([
      week('2026-01-05', true),
      week('2026-01-12', true),
      week('2026-01-19', true),
    ]);
    expect(r.currentStreak).toBe(3);
    expect(r.bestStreak).toBe(3);
  });

  it('quebra zera a atual sem punição e usa mensagem encorajadora', () => {
    const r = computeStreak([week('2026-01-05', true), week('2026-01-12', false)]);
    expect(r.currentStreak).toBe(0);
    expect(r.bestStreak).toBe(1);
    expect(r.message).toBe(STREAK_MESSAGES.broken);
  });

  it('ordena por weekStart independentemente da ordem de entrada', () => {
    const r = computeStreak([
      week('2026-01-26', true),
      week('2026-01-05', true),
      week('2026-01-12', true),
    ]);
    expect(r.currentStreak).toBe(3);
  });

  it('lista vazia retorna zeros e mensagem inicial', () => {
    const r = computeStreak([]);
    expect(r.currentStreak).toBe(0);
    expect(r.bestStreak).toBe(0);
    expect(r.message).toBe(STREAK_MESSAGES.start);
  });
});
