import { getCreatureByKey, totalXpForLevel, type AttributeSet } from '@ad-sidera/shared';
import type { CreatureState } from '../db/models';
import {
  applyEvolution,
  applyRewardDeltas,
  isEvolutionAvailableFor,
  levelUpAttributeGains,
} from './creatureAggregate';

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
    evolvedAt: null,
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

describe('applyRewardDeltas (Build 6 — atributos por pontos de treino)', () => {
  it('o delta soma nos PONTOS DE TREINO, não direto no valor do atributo', () => {
    const before = baseCreature();
    const applied = applyRewardDeltas(
      before,
      {},
      { xpDelta: 40, energyDelta: 12, attributeDeltas: { strength: 8 }, totalActivities: 1 },
      NOW,
    );
    expect(applied.creature.xp).toBe(40);
    expect(applied.trainingTotals.strength).toBe(8);
    // 8 de 100: o valor do atributo ainda NÃO sobe.
    expect(applied.creature.attributes.strength).toBe(before.attributes.strength);
    expect(applied.creature.attributes.energy).toBe(before.attributes.energy + 12);
    expect(applied.creature.totalActivities).toBe(1);
    expect(applied.creature.syncStatus).toBe('pending');
  });

  it('ao completar 100 pontos o atributo sobe 1 e o excedente é preservado', () => {
    const before = baseCreature();
    const applied = applyRewardDeltas(
      before,
      { strength: 96 },
      { xpDelta: 0, energyDelta: 0, attributeDeltas: { strength: 8 }, totalActivities: 1 },
      NOW,
    );
    expect(applied.creature.attributes.strength).toBe(before.attributes.strength + 1);
    const strength = applied.progress.find((p) => p.attribute === 'strength')!;
    expect(strength.trainingProgress).toBe(4);
    expect(strength.progressRequired).toBe(100);
  });

  it('delta negativo (exclusão) devolve o progresso sem ficar abaixo de zero', () => {
    const before = baseCreature({ xp: 30, attributes: { ...baseCreature().attributes, energy: 20 } });
    const applied = applyRewardDeltas(
      before,
      { strength: 12 },
      { xpDelta: -50, energyDelta: -30, attributeDeltas: { strength: -12 }, totalActivities: 0 },
      NOW,
    );
    expect(applied.creature.xp).toBe(0);
    expect(applied.creature.attributes.energy).toBe(0);
    expect(applied.trainingTotals.strength).toBe(0);
    expect(applied.creature.attributes.strength).toBe(before.attributes.strength);
  });

  it('recalcular o mesmo dia duas vezes não concede em dobro', () => {
    const before = baseCreature();
    const delta = { xpDelta: 40, energyDelta: 0, attributeDeltas: { strength: 60 }, totalActivities: 1 };
    const first = applyRewardDeltas(before, {}, delta, NOW);
    // O recálculo parte dos MESMOS fatos (totais atuais + delta líquido zero).
    const second = applyRewardDeltas(first.creature, first.trainingTotals, {
      ...delta, xpDelta: 0, attributeDeltas: {},
    }, NOW);
    expect(second.trainingTotals.strength).toBe(60);
    expect(second.creature.attributes.strength).toBe(first.creature.attributes.strength);
  });

  it('energia respeita o teto máximo', () => {
    const before = baseCreature({ attributes: { ...baseCreature().attributes, energy: 95 } });
    const applied = applyRewardDeltas(
      before,
      {},
      { xpDelta: 0, energyDelta: 50, attributeDeltas: {}, totalActivities: 0 },
      NOW,
    );
    expect(applied.creature.attributes.energy).toBe(100);
  });

  it('deriva o nível a partir do XP e fortalece TODOS os atributos', () => {
    const before = baseCreature();
    const applied = applyRewardDeltas(
      before,
      {},
      { xpDelta: totalXpForLevel(3), energyDelta: 0, attributeDeltas: {}, totalActivities: 5 },
      NOW,
    );
    expect(applied.creature.level).toBe(3);
    for (const key of ['strength', 'endurance', 'agility', 'discipline', 'recovery', 'spirit'] as const) {
      expect(applied.creature.attributes[key]).toBe(before.attributes[key] + 2);
    }
  });
});

describe('levelUpAttributeGains', () => {
  it('concede +1 em cada atributo por nível ganho', () => {
    expect(levelUpAttributeGains(1, 2)).toEqual({
      strength: 1, endurance: 1, agility: 1, discipline: 1, recovery: 1, spirit: 1,
    });
  });

  it('cobre saltos de mais de um nível', () => {
    expect(levelUpAttributeGains(1, 4).strength).toBe(3);
  });

  it('sem subida de nível não há ganho', () => {
    expect(levelUpAttributeGains(3, 3)).toEqual({});
    expect(levelUpAttributeGains(4, 2)).toEqual({});
  });
});

describe('isEvolutionAvailableFor (Build 5 — 4 estágios)', () => {
  const ev1 = () => getCreatureByKey('terravok')?.stages[1]?.requirements ?? null;

  it('true quando os requisitos do PRÓXIMO estágio (EV 1) são atendidos', () => {
    const req = ev1();
    expect(req).toBeTruthy();
    if (!req) return;
    const strong = baseCreature({
      level: req.minLevel,
      totalActivities: req.minActivities,
      bond: req.minBond,
    });
    expect(isEvolutionAvailableFor(strong, req.minWeeksGoalMet)).toBe(true);
  });

  it('false quando falta nível', () => {
    const req = ev1();
    if (!req) return;
    const weak = baseCreature({ level: req.minLevel - 1, totalActivities: req.minActivities, bond: req.minBond });
    expect(isEvolutionAvailableFor(weak, req.minWeeksGoalMet)).toBe(false);
  });

  it('false quando falta Vínculo (EV 1 exige Vínculo mínimo)', () => {
    const req = ev1();
    if (!req) return;
    const semVinculo = baseCreature({ level: req.minLevel, totalActivities: req.minActivities, bond: req.minBond - 1 });
    expect(isEvolutionAvailableFor(semVinculo, req.minWeeksGoalMet)).toBe(false);
  });

  it('false quando já está na Evolução Perfeita (não há próximo estágio)', () => {
    const perfect = baseCreature({ evolutionStage: 3, level: 99, totalActivities: 999, bond: 100 });
    expect(isEvolutionAvailableFor(perfect, 99)).toBe(false);
  });
});

describe('applyEvolution (Build 5 — 4 estágios)', () => {
  it('avança UM estágio por vez e aplica o reforço do estágio de destino', () => {
    const base = baseCreature();
    const ev1 = applyEvolution(base, NOW);
    expect(ev1.evolutionStage).toBe(1);
    expect(ev1.evolvedAt).toBe(NOW);
    expect(ev1.attributes.health).toBeGreaterThan(base.attributes.health);
    expect(ev1.attributes.strength).toBeGreaterThan(base.attributes.strength);

    const ev2 = applyEvolution(ev1, NOW);
    expect(ev2.evolutionStage).toBe(2);
    const perfect = applyEvolution(ev2, NOW);
    expect(perfect.evolutionStage).toBe(3);
  });

  it('não evolui além da Evolução Perfeita (nunca duplica reforço)', () => {
    const perfect = baseCreature({ evolutionStage: 3 });
    const again = applyEvolution(perfect, NOW);
    expect(again.evolutionStage).toBe(3);
    expect(again.attributes.health).toBe(perfect.attributes.health);
    expect(again).toBe(perfect);
  });

  it('não regride nem pula estágio (transição sempre +1)', () => {
    const ev1 = applyEvolution(baseCreature(), NOW);
    expect(ev1.evolutionStage - baseCreature().evolutionStage).toBe(1);
  });
});
