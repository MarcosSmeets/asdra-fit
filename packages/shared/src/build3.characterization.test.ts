import {
  applyFood,
  BATTLE,
  calculateBondReward,
  computeDamage,
  getFoodDefinition,
  MAX_EQUIPPED_ABILITIES,
  PVE_DAILY_WIN_LIMIT,
  pveDailyXpCap,
} from './index';

describe('Build 3 — caracterização das regras preservadas', () => {
  it('mantém carinho local em 3, 1 e 0 sem impedir novas reações', () => {
    const base = { interactionType: 'pet' as const, currentBond: 10, commonGrantedToday: 0 };
    expect(calculateBondReward({ ...base, sameTypeCountToday: 0 }).granted).toBe(3);
    expect(calculateBondReward({ ...base, sameTypeCountToday: 1 }).granted).toBe(1);
    expect(calculateBondReward({ ...base, sameTypeCountToday: 2 }).granted).toBe(0);
  });

  it('preserva alimento quando o Adari recusa por Saciedade', () => {
    const food = getFoodDefinition('astral_fruit');
    expect(food).toBeDefined();
    expect(applyFood(95, food!, 'lumora')).toMatchObject({
      accepted: false,
      nextSatiety: 95,
      satietyGranted: 0,
    });
  });

  it('mantém dano determinístico e variação limitada a ±5%', () => {
    const input = {
      attackerAttack: 24,
      abilityPower: 1.2,
      defenderDefense: 10,
      variance: 1.03,
    };
    expect(computeDamage(input)).toBe(computeDamage(input));
    expect(BATTLE.VARIANCE).toBe(0.05);
  });

  it('mantém quatro habilidades e cinco vitórias PvE no teto diário', () => {
    expect(MAX_EQUIPPED_ABILITIES).toBe(4);
    expect(PVE_DAILY_WIN_LIMIT).toBe(5);
    expect(pveDailyXpCap(1)).toBeGreaterThan(0);
  });
});
