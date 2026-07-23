import { countValidDays, type CountableActivity } from './activityCounting';

const act = (occurredAt: string, over: Partial<CountableActivity> = {}): CountableActivity => ({
  activityType: 'corrida',
  occurredAt,
  durationMinutes: 40,
  ...over,
});

describe('countValidDays (economia v2)', () => {
  it('duas atividades no MESMO dia contam como 1 dia (independente da categoria)', () => {
    const activities = [
      act('2026-01-05T10:00:00Z', { activityType: 'corrida' }),
      act('2026-01-05T18:00:00Z', { activityType: 'musculacao' }),
    ];
    expect(countValidDays(activities, 'UTC')).toBe(1);
  });

  it('atividades em dias diferentes contam cada dia', () => {
    const activities = [act('2026-01-05T10:00:00Z'), act('2026-01-06T10:00:00Z')];
    expect(countValidDays(activities, 'UTC')).toBe(2);
  });

  it('atividade abaixo do mínimo de duração não conta como dia válido', () => {
    const activities = [act('2026-01-05T10:00:00Z', { durationMinutes: 5 })];
    expect(countValidDays(activities, 'UTC')).toBe(0);
  });

  it('um dia com uma curta e uma válida ainda conta 1', () => {
    const activities = [
      act('2026-01-05T10:00:00Z', { durationMinutes: 5 }),
      act('2026-01-05T18:00:00Z', { durationMinutes: 40 }),
    ];
    expect(countValidDays(activities, 'UTC')).toBe(1);
  });

  it('usa o fuso do usuário para agrupar por dia', () => {
    // 02:30Z de 12/01 é 23:30 de 11/01 em Sao_Paulo → mesmo dia local que 20:00Z de 11/01.
    const activities = [act('2026-01-11T23:00:00Z'), act('2026-01-12T02:30:00Z')];
    expect(countValidDays(activities, 'America/Sao_Paulo')).toBe(1);
    expect(countValidDays(activities, 'UTC')).toBe(2);
  });
});
