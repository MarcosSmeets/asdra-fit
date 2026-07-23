import {
  checkEvolution,
  isEvolutionAvailable,
  type EvolutionProgress,
  type EvolutionRequirements,
} from './evolution';
import type { AttributeSet } from './types';

const attrs = (over: Partial<AttributeSet> = {}): AttributeSet => ({
  strength: 20,
  endurance: 10,
  agility: 10,
  discipline: 10,
  recovery: 10,
  spirit: 10,
  health: 100,
  energy: 50,
  ...over,
});

const req: EvolutionRequirements = {
  minLevel: 10,
  minWeeksGoalMet: 3,
  minActivities: 20,
  affinityAttribute: 'strength',
  affinityThreshold: 20,
  campaignMilestone: 'r1-boss',
};

const progress = (over: Partial<EvolutionProgress> = {}): EvolutionProgress => ({
  level: 10,
  weeksGoalMet: 3,
  totalActivities: 20,
  attributes: attrs(),
  defeatedMilestones: ['r1-boss'],
  ...over,
});

describe('evolution', () => {
  it('disponível quando todos os requisitos são atendidos', () => {
    expect(isEvolutionAvailable(progress(), req)).toBe(true);
  });

  it('indisponível quando falta nível', () => {
    expect(isEvolutionAvailable(progress({ level: 9 }), req)).toBe(false);
  });

  it('indisponível quando falta o marco de campanha', () => {
    expect(isEvolutionAvailable(progress({ defeatedMilestones: [] }), req)).toBe(false);
  });

  it('indisponível quando afinidade abaixo do limiar', () => {
    expect(isEvolutionAvailable(progress({ attributes: attrs({ strength: 19 }) }), req)).toBe(false);
  });

  it('não depende apenas do nível (spec §9)', () => {
    // Nível altíssimo mas sem constância nem marco → ainda indisponível.
    const p = progress({ level: 50, weeksGoalMet: 0, defeatedMilestones: [] });
    expect(isEvolutionAvailable(p, req)).toBe(false);
  });

  it('detalha o status de cada requisito para a UI', () => {
    const check = checkEvolution(progress({ level: 8 }), req);
    expect(check.available).toBe(false);
    const levelReq = check.requirements.find((r) => r.key === 'level');
    expect(levelReq?.met).toBe(false);
    expect(levelReq?.current).toBe(8);
  });
});
