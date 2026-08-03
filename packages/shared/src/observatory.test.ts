import {
  ADARI_BEHAVIOR_PROFILES,
  applyFood,
  BOND,
  bondTierFor,
  calculateBondReward,
  FOOD_DEFINITIONS,
  FOOD_REGEN,
  foodRegenIntervalHours,
  getAdariBehaviorProfile,
  getFoodDefinition,
  hoursUntilNextFood,
  recalculateSatiety,
  regenerateFoodStock,
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

describe('reposição natural de alimentos (sem loja)', () => {
  const start = '2026-07-24T00:00:00.000Z';
  const plusHours = (hours: number) => new Date(Date.parse(start) + hours * 3_600_000).toISOString();

  it('alimento que devolve MENOS saciedade volta mais rápido', () => {
    const light = getFoodDefinition('lunar_seed')!;   // 16 de saciedade
    const heavy = getFoodDefinition('golden_root')!;  // 28 de saciedade
    expect(light.satietyValue).toBeLessThan(heavy.satietyValue);
    expect(foodRegenIntervalHours(light)).toBeLessThan(foodRegenIntervalHours(heavy));
  });

  it('a ordem de espera acompanha a saciedade de todos os alimentos', () => {
    const ordered = [...FOOD_DEFINITIONS].sort((a, b) => a.satietyValue - b.satietyValue);
    const intervals = ordered.map(foodRegenIntervalHours);
    for (let i = 1; i < intervals.length; i += 1) {
      expect(intervals[i]!).toBeGreaterThanOrEqual(intervals[i - 1]!);
    }
  });

  it('repõe uma unidade a cada intervalo completo, mesmo com o app fechado', () => {
    const food = getFoodDefinition('lunar_seed')!;
    const interval = foodRegenIntervalHours(food);
    const state = { quantity: 0, updatedAt: start };
    expect(regenerateFoodStock(food, state, plusHours(interval - 0.1)).regenerated).toBe(0);
    const after = regenerateFoodStock(food, state, plusHours(interval));
    expect(after.quantity).toBe(1);
    expect(after.regenerated).toBe(1);
    expect(regenerateFoodStock(food, state, plusHours(interval * 2)).quantity).toBe(2);
  });

  it('preserva a fração de tempo já corrida rumo à próxima unidade', () => {
    const food = getFoodDefinition('lunar_seed')!;
    const interval = foodRegenIntervalHours(food);
    const first = regenerateFoodStock(food, { quantity: 0, updatedAt: start }, plusHours(interval * 1.5));
    expect(first.quantity).toBe(1);
    // Meio intervalo já corrido: meio intervalo depois já vale a próxima unidade.
    expect(regenerateFoodStock(food, first, plusHours(interval * 2)).quantity).toBe(2);
  });

  it('nunca passa do teto e não acumula espera com estoque cheio', () => {
    const food = getFoodDefinition('golden_root')!;
    const full = regenerateFoodStock(food, { quantity: 0, updatedAt: start }, plusHours(500));
    expect(full.quantity).toBe(FOOD_REGEN.MAX_PER_FOOD);
    const stillFull = regenerateFoodStock(food, full, plusHours(1000));
    expect(stillFull.quantity).toBe(FOOD_REGEN.MAX_PER_FOOD);
    expect(stillFull.regenerated).toBe(0);
    // O relógio só passa a correr depois do consumo: espera cheia, sem banco de horas.
    expect(hoursUntilNextFood(food, { quantity: 2, updatedAt: stillFull.updatedAt }, stillFull.updatedAt))
      .toBeCloseTo(foodRegenIntervalHours(food), 5);
  });

  it('relógio inválido ou para trás nunca cria nem destrói estoque', () => {
    const food = getFoodDefinition('astral_fruit')!;
    const state = { quantity: 1, updatedAt: start };
    expect(regenerateFoodStock(food, state, 'data-invalida').quantity).toBe(1);
    expect(regenerateFoodStock(food, state, plusHours(-48)).quantity).toBe(1);
    expect(regenerateFoodStock(food, state, plusHours(-48)).regenerated).toBe(0);
  });

  it('informa a espera restante e zera quando o estoque está no teto', () => {
    const food = getFoodDefinition('mist_biscuit')!;
    const interval = foodRegenIntervalHours(food);
    expect(hoursUntilNextFood(food, { quantity: 0, updatedAt: start }, plusHours(interval / 2)))
      .toBeCloseTo(interval / 2, 5);
    expect(hoursUntilNextFood(food, { quantity: FOOD_REGEN.MAX_PER_FOOD, updatedAt: start }, plusHours(1)))
      .toBe(0);
  });
});
