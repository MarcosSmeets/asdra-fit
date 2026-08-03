import {
  classifyMovementSignal,
  isStepBasedActivity,
  minStepsToConfirm,
  movementWindow,
} from './movementSignal';

describe('sinal de movimento', () => {
  it('só considera passos para tipos compatíveis', () => {
    expect(isStepBasedActivity('caminhada')).toBe(true);
    expect(isStepBasedActivity('corrida')).toBe(true);
    expect(isStepBasedActivity('esporte_coletivo')).toBe(true);
    expect(isStepBasedActivity('musculacao')).toBe(false);
    expect(isStepBasedActivity('mobilidade')).toBe(false);
    expect(isStepBasedActivity('ciclismo')).toBe(false);
    expect(isStepBasedActivity('natacao')).toBe(false);
    expect(isStepBasedActivity('outro')).toBe(false);
  });

  it('tipos sem passos são not_applicable mesmo com sensor disponível', () => {
    expect(
      classifyMovementSignal({ activityType: 'musculacao', durationMinutes: 60, steps: 12 }),
    ).toBe('not_applicable');
  });

  it('sem dado do sensor, o sinal é unavailable (nunca negativo)', () => {
    expect(
      classifyMovementSignal({ activityType: 'caminhada', durationMinutes: 30, steps: null }),
    ).toBe('unavailable');
  });

  it('confirma com piso generoso de passos', () => {
    expect(minStepsToConfirm(10)).toBe(300); // mínimo absoluto
    expect(minStepsToConfirm(30)).toBe(600);
    expect(
      classifyMovementSignal({ activityType: 'caminhada', durationMinutes: 30, steps: 600 }),
    ).toBe('confirmed');
    expect(
      classifyMovementSignal({ activityType: 'caminhada', durationMinutes: 30, steps: 599 }),
    ).toBe('unconfirmed');
    expect(
      classifyMovementSignal({ activityType: 'corrida', durationMinutes: 20, steps: 2400 }),
    ).toBe('confirmed');
  });

  it('a janela medida termina no registro e cobre a duração declarada', () => {
    const { start, end } = movementWindow('2026-07-23T12:00:00.000Z', 45);
    expect(end.toISOString()).toBe('2026-07-23T12:00:00.000Z');
    expect(start.toISOString()).toBe('2026-07-23T11:15:00.000Z');
  });
});
