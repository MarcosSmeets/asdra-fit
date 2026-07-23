import { RANKING } from './constants';
import { computeRankingScore, rankLeague, type RankingInput } from './ranking';

const input = (over: Partial<RankingInput> = {}): RankingInput => ({
  userId: 'u1',
  validActivityCount: 4,
  targetCount: 4,
  currentStreakWeeks: 0,
  completed: true,
  completedWeeksInSeason: 1,
  goalCompletedAt: '2026-01-07T10:00:00.000Z',
  ...over,
});

describe('ranking', () => {
  it('base é o percentual da meta (limitado a 100)', () => {
    expect(computeRankingScore(input({ validActivityCount: 2, targetCount: 4, completed: false })).base).toBe(50);
    expect(computeRankingScore(input({ validActivityCount: 8, targetCount: 4 })).base).toBe(100);
  });

  it('bônus de sequência é limitado pelo cap', () => {
    const r = computeRankingScore(input({ currentStreakWeeks: 999 }));
    expect(r.streakBonus).toBe(RANKING.STREAK_BONUS_CAP_WEEKS * RANKING.STREAK_BONUS_PER_WEEK);
  });

  it('bônus de semana perfeita só quando completa', () => {
    expect(computeRankingScore(input({ completed: true })).completionBonus).toBe(
      RANKING.PERFECT_WEEK_BONUS,
    );
    expect(
      computeRankingScore(input({ completed: false, validActivityCount: 1 })).completionBonus,
    ).toBe(0);
  });

  it('cumprir a própria meta domina o volume: quem bate 100% supera quem só tem bônus sem meta', () => {
    const meetsGoal = computeRankingScore(
      input({ userId: 'a', validActivityCount: 4, targetCount: 4, completed: true, currentStreakWeeks: 0 }),
    );
    const hugeVolumeNoGoal = computeRankingScore(
      input({ userId: 'b', validActivityCount: 3, targetCount: 10, completed: false, currentStreakWeeks: 5 }),
    );
    expect(meetsGoal.finalScore).toBeGreaterThan(hugeVolumeNoGoal.finalScore);
  });

  it('atribui posições e aplica desempates estáveis', () => {
    const table = rankLeague([
      input({ userId: 'later', goalCompletedAt: '2026-01-07T12:00:00.000Z' }),
      input({ userId: 'earlier', goalCompletedAt: '2026-01-07T08:00:00.000Z' }),
    ]);
    // Mesmo score → conclusão mais antiga primeiro.
    expect(table[0]?.userId).toBe('earlier');
    expect(table[0]?.position).toBe(1);
    expect(table[1]?.position).toBe(2);
  });

  it('desempate final estável por userId', () => {
    const table = rankLeague([
      input({ userId: 'zeta', goalCompletedAt: null, completed: false, validActivityCount: 2, targetCount: 4 }),
      input({ userId: 'alpha', goalCompletedAt: null, completed: false, validActivityCount: 2, targetCount: 4 }),
    ]);
    expect(table[0]?.userId).toBe('alpha');
  });
});
