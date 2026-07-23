import {
  ADARI_BEHAVIOR_PROFILES,
  applyFood,
  BOND,
  bondTierFor,
  calculateBondReward,
  FOOD_DEFINITIONS,
  getAdariBehaviorProfile,
  getFoodDefinition,
  recalculateSatiety,
  satietyLabel,
} from './observatory';

describe('perfis de comportamento do Observatório', () => {
  it('mantém perfis distintos e centralizados para os três Adaris', () => {
    expect(Object.keys(ADARI_BEHAVIOR_PROFILES)).toEqual(['terravok', 'lumora', 'solivar']);
    expect(new Set(Object.values(ADARI_BEHAVIOR_PROFILES).map((p) => p.movementSpeed)).size).toBe(3);
    expect(getAdariBehaviorProfile('terravok').followDistance).toBeLessThan(
      getAdariBehaviorProfile('lumora').followDistance,
    );
  });
});

describe('BondRewardPolicy', () => {
  const base = { currentBond: 10, commonGrantedToday: 0, sameTypeCountToday: 0 };

  it('concede 3, depois 1 e depois zero nos carinhos do dia', () => {
    expect(calculateBondReward({ ...base, interactionType: 'pet' }).granted).toBe(3);
    expect(
      calculateBondReward({ ...base, interactionType: 'pet', sameTypeCountToday: 1 }).granted,
    ).toBe(1);
    expect(
      calculateBondReward({ ...base, interactionType: 'pet', sameTypeCountToday: 2 }).granted,
    ).toBe(0);
  });

  it('respeita teto comum diário, mas marcos podem ultrapassá-lo', () => {
    expect(
      calculateBondReward({ ...base, interactionType: 'feed', commonGrantedToday: 8 }).granted,
    ).toBe(0);
    expect(
      calculateBondReward({ ...base, interactionType: 'boss', commonGrantedToday: 8 }).granted,
    ).toBe(4);
  });

  it('nunca ultrapassa 100 e desbloqueia níveis narrativos', () => {
    expect(calculateBondReward({ ...base, currentBond: 99, interactionType: 'boss' }).nextBond).toBe(
      BOND.MAX,
    );
    expect(bondTierFor(0).label).toBe('Primeiro Contato');
    expect(bondTierFor(80).label).toBe('União Sideral');
  });
});

describe('alimentação e Saciedade', () => {
  it('define cinco alimentos originais e preferências próprias', () => {
    expect(FOOD_DEFINITIONS).toHaveLength(5);
    expect(getFoodDefinition('golden_root')?.preferredByAdariKeys).toContain('terravok');
    expect(getFoodDefinition('celestial_nectar')?.preferredByAdariKeys).toContain('lumora');
    expect(getFoodDefinition('lunar_seed')?.preferredByAdariKeys).toContain('solivar');
  });

  it('decai dois pontos por bloco de seis horas, inclusive offline, sem ficar negativo', () => {
    expect(
      recalculateSatiety(
        { satiety: 50, lastSatietyCalculationAt: '2026-07-20T00:00:00.000Z' },
        '2026-07-21T00:00:00.000Z',
      ).satiety,
    ).toBe(42);
    expect(
      recalculateSatiety(
        { satiety: 3, lastSatietyCalculationAt: '2026-07-01T00:00:00.000Z' },
        '2026-07-21T00:00:00.000Z',
      ).satiety,
    ).toBe(0);
  });

  it('recusa educadamente quando muito satisfeito sem aplicar alimento', () => {
    const food = getFoodDefinition('astral_fruit')!;
    expect(applyFood(95, food, 'lumora')).toMatchObject({
      accepted: false,
      nextSatiety: 95,
      satietyGranted: 0,
      favorite: true,
    });
    expect(satietyLabel(95)).toBe('Muito satisfeito');
  });

  it('alimento favorito concede mais Saciedade e reação especial', () => {
    const food = getFoodDefinition('astral_fruit')!;
    const favorite = applyFood(20, food, 'lumora');
    const regular = applyFood(20, food, 'terravok');
    expect(favorite.favorite).toBe(true);
    expect(favorite.satietyGranted).toBeGreaterThan(regular.satietyGranted);
  });
});
