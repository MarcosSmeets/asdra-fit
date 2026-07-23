import { getCreatureByKey, totalXpForLevel, type AttributeSet } from '@ad-sidera/shared';
import type { CreatureState } from '../db/models';
import { applyEvolution, applyRewardDeltas, isEvolutionAvailableFor } from './creatureAggregate';

const NOW = '2026-01-07T12:00:00.000Z';

function baseCreature(over: Partial<CreatureState> = {}): CreatureState {
  const def = getCreatureByKey('terravok');
  const attributes: AttributeSet = { ...(def?.baseStats as AttributeSet) };
  return {
    id: 'c1',
    creatureKey: 'terravok',
    nickname: null,
    level: 1,
    xp: 0,
    evolutionStage: 0,
    attributes,
    maxVigor: 100,
    vigorRecoveryRate: 5,
    lastVigorCalculationAt: NOW,
    bond: 0,
    satiety: 60,
    lastSatietyCalculationAt: NOW,
    activeBehaviorState: 'idle',
    lastInteractionAt: null,
    equippedAbilities: [],
    defeatedMilestones: [],
    totalActivities: 0,
    updatedAt: NOW,
    syncStatus: 'local_only',
    ...over,
  };
}

describe('applyRewardDeltas', () => {
  it('aplica delta positivo de XP/energia/atributos e marca pending', () => {
    const before = baseCreature();
    const after = applyRewardDeltas(
      before,
      { xpDelta: 40, energyDelta: 12, attributeDeltas: { strength: 2 }, totalActivities: 1 },
      NOW,
    );
    expect(after.xp).toBe(40);
    expect(after.attributes.strength).toBe(before.attributes.strength + 2);
    expect(after.attributes.energy).toBe(before.attributes.energy + 12);
    expect(after.totalActivities).toBe(1);
    expect(after.syncStatus).toBe('pending');
  });

  it('delta negativo (ex.: exclusão) reduz XP sem ficar abaixo de 0', () => {
    const before = baseCreature({ xp: 30, attributes: { ...baseCreature().attributes, energy: 20 } });
    const after = applyRewardDeltas(
      before,
      { xpDelta: -50, energyDelta: -30, attributeDeltas: { strength: -1 }, totalActivities: 0 },
      NOW,
    );
    expect(after.xp).toBe(0);
    expect(after.attributes.energy).toBe(0);
    expect(after.attributes.strength).toBe(before.attributes.strength - 1);
  });

  it('energia respeita o teto máximo', () => {
    const before = baseCreature({ attributes: { ...baseCreature().attributes, energy: 95 } });
    const after = applyRewardDeltas(
      before,
      { xpDelta: 0, energyDelta: 50, attributeDeltas: {}, totalActivities: 0 },
      NOW,
    );
    expect(after.attributes.energy).toBe(100);
  });

  it('deriva o nível a partir do XP', () => {
    const before = baseCreature();
    const after = applyRewardDeltas(
      before,
      { xpDelta: totalXpForLevel(3), energyDelta: 0, attributeDeltas: {}, totalActivities: 5 },
      NOW,
    );
    expect(after.level).toBe(3);
  });
});

describe('isEvolutionAvailableFor', () => {
  it('true quando todos os requisitos são atendidos', () => {
    const req = getCreatureByKey('terravok')?.evolution.requirements;
    expect(req).toBeDefined();
    if (!req) return;
    const strong = baseCreature({
      level: req.minLevel,
      totalActivities: req.minActivities,
      attributes: { ...baseCreature().attributes, strength: req.affinityThreshold + 5 },
      defeatedMilestones: [req.campaignMilestone ?? ''],
    });
    expect(isEvolutionAvailableFor(strong, req.minWeeksGoalMet)).toBe(true);
  });

  it('false quando falta um requisito', () => {
    const req = getCreatureByKey('terravok')?.evolution.requirements;
    if (!req) return;
    const weak = baseCreature({ level: req.minLevel - 1 });
    expect(isEvolutionAvailableFor(weak, req.minWeeksGoalMet)).toBe(false);
  });
});

describe('applyEvolution', () => {
  it('avança o estágio e concede reforço permanente, idempotente', () => {
    const once = applyEvolution(baseCreature(), NOW);
    expect(once.evolutionStage).toBe(1);
    expect(once.attributes.health).toBeGreaterThan(baseCreature().attributes.health);
    const twice = applyEvolution(once, NOW);
    expect(twice.attributes.health).toBe(once.attributes.health);
  });
});
