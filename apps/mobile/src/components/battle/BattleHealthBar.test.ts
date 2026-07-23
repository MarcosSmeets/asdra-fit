import { normalizedBattleHealth } from '../../features/battle/healthAnimation';

describe('BattleHealthBar', () => {
  it('normaliza vida para a animaÃ§Ã£o e limita valores invÃ¡lidos', () => {
    expect(normalizedBattleHealth(30, 100)).toBe(0.3);
    expect(normalizedBattleHealth(-10, 100)).toBe(0);
    expect(normalizedBattleHealth(120, 100)).toBe(1);
    expect(normalizedBattleHealth(20, 0)).toBe(0);
  });
});
