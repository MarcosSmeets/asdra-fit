import { PVE_DAILY_WIN_LIMIT } from './constants';
import {
  calculatePveWinReward,
  getStandardActivityXp,
  hasRewardedWinAvailable,
  pveDailyXpCap,
  pveXpPerWin,
} from './pveRewards';

describe('pveRewards — limites diários', () => {
  const level = 5;

  it('XP-base de atividade padrão é positivo e o PvE é uma fração pequena', () => {
    const std = getStandardActivityXp(level);
    expect(std).toBeGreaterThan(0);
    expect(pveDailyXpCap(level)).toBeLessThanOrEqual(Math.round(std * 0.3));
    expect(pveXpPerWin(level)).toBeLessThan(pveDailyXpCap(level));
  });

  it('cada uma das 5 vitórias concede XP e a 6ª não', () => {
    for (let prior = 0; prior < PVE_DAILY_WIN_LIMIT; prior += 1) {
      const r = calculatePveWinReward(level, prior);
      expect(r.rewarded).toBe(true);
      expect(r.xp).toBeGreaterThan(0);
    }
    const sixth = calculatePveWinReward(level, PVE_DAILY_WIN_LIMIT);
    expect(sixth.rewarded).toBe(false);
    expect(sixth.xp).toBe(0);
    expect(sixth.reason).toBe('daily_limit_reached');
  });

  it('as 5 vitórias somam no máximo o teto diário (≤30%)', () => {
    let total = 0;
    for (let prior = 0; prior < PVE_DAILY_WIN_LIMIT; prior += 1) {
      total += calculatePveWinReward(level, prior).xp;
    }
    expect(total).toBe(pveDailyXpCap(level));
    expect(total).toBeLessThanOrEqual(Math.round(getStandardActivityXp(level) * 0.3));
  });

  it('a última vitória fecha exatamente o teto (absorve o arredondamento)', () => {
    const perWin = pveXpPerWin(level);
    const cap = pveDailyXpCap(level);
    const fifth = calculatePveWinReward(level, PVE_DAILY_WIN_LIMIT - 1);
    expect(fifth.xp).toBe(Math.max(0, cap - perWin * (PVE_DAILY_WIN_LIMIT - 1)));
  });

  it('hasRewardedWinAvailable respeita o limite', () => {
    expect(hasRewardedWinAvailable(0)).toBe(true);
    expect(hasRewardedWinAvailable(PVE_DAILY_WIN_LIMIT - 1)).toBe(true);
    expect(hasRewardedWinAvailable(PVE_DAILY_WIN_LIMIT)).toBe(false);
  });

  it('remainingRewardedWins decresce a cada vitória', () => {
    expect(calculatePveWinReward(level, 0).remainingRewardedWins).toBe(PVE_DAILY_WIN_LIMIT - 1);
    expect(calculatePveWinReward(level, 4).remainingRewardedWins).toBe(0);
  });

  it('grava a versão de cálculo de batalha', () => {
    expect(calculatePveWinReward(level, 0).battleCalculationVersion).toBeGreaterThanOrEqual(1);
  });
});
