import { computeDayRewards, countGoalCounting, type DayActivity } from './dailyRewards';

const mk = (over: Partial<DayActivity>): DayActivity => ({
  id: 'a',
  activityType: 'corrida',
  perceivedIntensity: 'moderada',
  durationMinutes: 40,
  occurredAt: '2026-01-05T10:00:00.000Z',
  createdAt: '2026-01-05T10:00:00.000Z',
  ...over,
});

describe('computeDayRewards', () => {
  it('atribui posições 1/2/3 por ordem de occurredAt e aplica 1.0/0.25/0', () => {
    const rewards = computeDayRewards([
      mk({ id: 'c', occurredAt: '2026-01-05T20:00:00Z' }),
      mk({ id: 'a', occurredAt: '2026-01-05T08:00:00Z' }),
      mk({ id: 'b', occurredAt: '2026-01-05T12:00:00Z' }),
    ]);
    const byId = new Map(rewards.map((r) => [r.activityId, r]));
    expect(byId.get('a')?.rewardEligiblePosition).toBe(1);
    expect(byId.get('a')?.dailyRewardMultiplier).toBe(1);
    expect(byId.get('b')?.rewardEligiblePosition).toBe(2);
    expect(byId.get('b')?.dailyRewardMultiplier).toBe(0.25);
    expect(byId.get('c')?.rewardEligiblePosition).toBe(3);
    expect(byId.get('c')?.dailyRewardMultiplier).toBe(0);
  });

  it('apenas a 1ª elegível conta para a meta', () => {
    const rewards = computeDayRewards([
      mk({ id: 'a', occurredAt: '2026-01-05T08:00:00Z' }),
      mk({ id: 'b', occurredAt: '2026-01-05T12:00:00Z' }),
    ]);
    expect(countGoalCounting(rewards)).toBe(1);
  });

  it('desempata por createdAt e depois por id', () => {
    const rewards = computeDayRewards([
      mk({ id: 'z', occurredAt: '2026-01-05T08:00:00Z', createdAt: '2026-01-05T09:00:00Z' }),
      mk({ id: 'a', occurredAt: '2026-01-05T08:00:00Z', createdAt: '2026-01-05T08:30:00Z' }),
    ]);
    const byId = new Map(rewards.map((r) => [r.activityId, r]));
    expect(byId.get('a')?.rewardEligiblePosition).toBe(1);
    expect(byId.get('z')?.rewardEligiblePosition).toBe(2);
  });

  it('atividades excluídas não ocupam posição (promoção)', () => {
    const rewards = computeDayRewards([
      mk({ id: 'a', occurredAt: '2026-01-05T08:00:00Z', deleted: true }),
      mk({ id: 'b', occurredAt: '2026-01-05T12:00:00Z' }),
      mk({ id: 'c', occurredAt: '2026-01-05T16:00:00Z' }),
    ]);
    const byId = new Map(rewards.map((r) => [r.activityId, r]));
    expect(byId.get('a')?.rewardEligiblePosition).toBe(0);
    expect(byId.get('a')?.finalXp).toBe(0);
    // b e c são promovidos para 1ª e 2ª.
    expect(byId.get('b')?.rewardEligiblePosition).toBe(1);
    expect(byId.get('b')?.dailyRewardMultiplier).toBe(1);
    expect(byId.get('c')?.rewardEligiblePosition).toBe(2);
    expect(byId.get('c')?.dailyRewardMultiplier).toBe(0.25);
  });

  it('atividades curtas (<10min) não ocupam posição', () => {
    const rewards = computeDayRewards([
      mk({ id: 'a', occurredAt: '2026-01-05T08:00:00Z', durationMinutes: 5 }),
      mk({ id: 'b', occurredAt: '2026-01-05T12:00:00Z', durationMinutes: 40 }),
    ]);
    const byId = new Map(rewards.map((r) => [r.activityId, r]));
    expect(byId.get('a')?.rewardEligiblePosition).toBe(0);
    expect(byId.get('b')?.rewardEligiblePosition).toBe(1);
  });
});
