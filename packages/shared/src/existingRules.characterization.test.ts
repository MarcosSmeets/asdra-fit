import {
  calculateActivityReward,
  computeWeeklyProgress,
  CREATURES,
  getCreatureByKey,
  levelFromTotalXp,
  recoverVigor,
  totalXpForLevel,
} from './index';

describe('regras existentes — caracterização antes do Observatório', () => {
  it('mantém os três Adaris atuais, suas chaves e evoluções', () => {
    expect(CREATURES.map(({ key, name }) => ({ key, name }))).toEqual([
      { key: 'terravok', name: 'Brontu' },
      { key: 'lumora', name: 'Velune' },
      { key: 'solivar', name: 'Myrin' },
    ]);
    expect(getCreatureByKey('terravok')?.evolution.toName).toBe('Asterhorn');
    expect(getCreatureByKey('lumora')?.evolution.toName).toBe('Stridara');
    expect(getCreatureByKey('solivar')?.evolution.toName).toBe('Solvyr');
  });

  it('mantém nível como valor derivado do XP total', () => {
    const threshold = totalXpForLevel(10);
    expect(levelFromTotalXp(threshold - 1).level).toBe(9);
    expect(levelFromTotalXp(threshold).level).toBe(10);
  });

  it('mantém recompensa decrescente e apenas a primeira atividade contando para a meta', () => {
    const input = {
      activityType: 'corrida',
      perceivedIntensity: 'moderada',
      durationMinutes: 30,
    };
    const first = calculateActivityReward(input, 1);
    const second = calculateActivityReward(input, 2);
    const third = calculateActivityReward(input, 3);

    expect(first.countsTowardGoal).toBe(true);
    expect(first.dailyRewardMultiplier).toBe(1);
    expect(second.countsTowardGoal).toBe(false);
    expect(second.dailyRewardMultiplier).toBe(0.25);
    expect(third.finalXp).toBe(0);
  });

  it('mantém meta semanal por dias válidos sem punição por exceder 100%', () => {
    expect(computeWeeklyProgress(5, 4)).toEqual({
      targetCount: 4,
      validActivityCount: 5,
      percentageDisplayed: 1.25,
      percentageForRanking: 1,
      completed: true,
      remaining: 0,
    });
  });

  it('mantém recuperação de Vigor offline e resistente a relógio regressivo', () => {
    const state = {
      currentVigor: 40,
      maxVigor: 100,
      vigorRecoveryRate: 5,
      lastVigorCalculationAt: '2026-07-22T00:00:00.000Z',
    };
    expect(recoverVigor(state, '2026-07-22T06:00:00.000Z').currentVigor).toBe(70);
    expect(recoverVigor(state, '2026-07-21T23:00:00.000Z').currentVigor).toBe(40);
  });
});
