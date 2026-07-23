import { CALCULATION_VERSION } from '@ad-sidera/config';
import { DURATION, INTENSITY_XP, VIGOR } from './constants';
import {
  calculateActivityReward,
  durationFactor,
  getDailyRewardMultiplier,
  isRewardEligibleDuration,
  totalAttributePoints,
} from './rewards';

const activity = (over: Partial<{ activityType: string; perceivedIntensity: string; durationMinutes: number }> = {}) => ({
  activityType: 'musculacao',
  perceivedIntensity: 'moderada',
  durationMinutes: 45,
  ...over,
});

describe('rewards v2', () => {
  describe('getDailyRewardMultiplier', () => {
    it('1ª = 1, 2ª = 0.25, 3ª e além = 0', () => {
      expect(getDailyRewardMultiplier(1)).toBe(1);
      expect(getDailyRewardMultiplier(2)).toBe(0.25);
      expect(getDailyRewardMultiplier(3)).toBe(0);
      expect(getDailyRewardMultiplier(4)).toBe(0);
      expect(getDailyRewardMultiplier(0)).toBe(0);
    });
  });

  describe('isRewardEligibleDuration', () => {
    it('exige duração mínima', () => {
      expect(isRewardEligibleDuration(DURATION.MIN_MINUTES - 1)).toBe(false);
      expect(isRewardEligibleDuration(DURATION.MIN_MINUTES)).toBe(true);
    });
  });

  describe('durationFactor', () => {
    it('escala de 1 até 1 + MAX_BONUS no CAP e não cresce além', () => {
      expect(durationFactor(0)).toBe(1);
      expect(durationFactor(DURATION.CAP_MINUTES)).toBeCloseTo(1 + DURATION.MAX_BONUS);
      expect(durationFactor(999)).toBe(durationFactor(DURATION.CAP_MINUTES));
    });
  });

  describe('calculateActivityReward', () => {
    it('1ª atividade elegível recebe 100%', () => {
      const r = calculateActivityReward(activity({ durationMinutes: 120 }), 1);
      expect(r.eligible).toBe(true);
      expect(r.dailyRewardMultiplier).toBe(1);
      expect(r.countsTowardGoal).toBe(true);
      expect(r.finalXp).toBe(r.baseXp);
      expect(r.baseXp).toBe(Math.round(INTENSITY_XP.moderada * (1 + DURATION.MAX_BONUS)));
      // v3: a 1ª atividade elegível do dia concede o bônus de Vigor cheio.
      expect(r.finalEnergy).toBe(VIGOR.ACTIVITY_BONUS);
      expect(r.baseEnergy).toBe(VIGOR.ACTIVITY_BONUS);
      expect(totalAttributePoints(r.finalAttributeChanges)).toBeGreaterThan(0);
    });

    it('2ª atividade recebe 25% e não conta para a meta', () => {
      const r = calculateActivityReward(activity({ durationMinutes: 120 }), 2);
      expect(r.dailyRewardMultiplier).toBe(0.25);
      expect(r.finalXp).toBe(Math.round(r.baseXp * 0.25));
      // v3: o bônus de Vigor é concedido apenas à 1ª atividade elegível do dia.
      expect(r.finalEnergy).toBe(0);
      expect(r.countsTowardGoal).toBe(false);
      expect(r.reason).toBe('reduced_second');
    });

    it('3ª atividade não recebe recompensa mas continua elegível/registrada', () => {
      const r = calculateActivityReward(activity(), 3);
      expect(r.dailyRewardMultiplier).toBe(0);
      expect(r.finalXp).toBe(0);
      expect(r.finalEnergy).toBe(0);
      expect(totalAttributePoints(r.finalAttributeChanges)).toBe(0);
      expect(r.countsTowardGoal).toBe(false);
      expect(r.reason).toBe('no_reward_position');
    });

    it('4ª atividade também recebe 0', () => {
      expect(calculateActivityReward(activity(), 4).finalXp).toBe(0);
    });

    it('atividade abaixo do mínimo de duração não é elegível (sem recompensa, sem posição)', () => {
      const r = calculateActivityReward(activity({ durationMinutes: DURATION.MIN_MINUTES - 1 }), 1);
      expect(r.eligible).toBe(false);
      expect(r.rewardEligiblePosition).toBe(0);
      expect(r.finalXp).toBe(0);
      expect(r.countsTowardGoal).toBe(false);
      expect(r.reason).toBe('below_min_duration');
      // baseXp ainda é calculado (para exibição), mas final é 0.
      expect(r.baseXp).toBeGreaterThan(0);
    });

    it('duração acima do teto usa no máximo CAP_MINUTES no cálculo', () => {
      const at120 = calculateActivityReward(activity({ durationMinutes: 120 }), 1);
      const at300 = calculateActivityReward(activity({ durationMinutes: 300 }), 1);
      expect(at300.baseXp).toBe(at120.baseXp);
    });

    it('grava a versão de cálculo v3', () => {
      expect(calculateActivityReward(activity(), 1).calculationVersion).toBe(CALCULATION_VERSION);
      expect(CALCULATION_VERSION).toBe(3);
    });

    it('rejeita entradas inválidas', () => {
      expect(() => calculateActivityReward(activity({ activityType: 'x' }), 1)).toThrow();
      expect(() => calculateActivityReward(activity({ perceivedIntensity: 'x' }), 1)).toThrow();
    });
  });
});
