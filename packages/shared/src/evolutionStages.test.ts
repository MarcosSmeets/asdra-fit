import {
  ADARI_STAGE_LABEL,
  ADARI_STAGE_ORDER,
  AdariEvolutionStage,
  isValidStageTransition,
  nextEvolutionStage,
  stageFromInt,
  stageToInt,
} from './evolution';
import {
  CREATURES,
  cumulativeStageStatBoost,
  getNextStageDefinition,
  getStageDefinition,
  getStageDefinitionByInt,
} from './content';

describe('estágios de evolução (Build 5)', () => {
  it('ordem canônica tem 4 estágios e mapeia 0..3', () => {
    expect(ADARI_STAGE_ORDER).toHaveLength(4);
    expect(stageToInt(AdariEvolutionStage.BASE)).toBe(0);
    expect(stageToInt(AdariEvolutionStage.PERFECT)).toBe(3);
    expect(stageFromInt(0)).toBe(AdariEvolutionStage.BASE);
    expect(stageFromInt(1)).toBe(AdariEvolutionStage.EVOLUTION_1);
    expect(stageFromInt(3)).toBe(AdariEvolutionStage.PERFECT);
    // Valores fora da faixa não explodem (clamp).
    expect(stageFromInt(-1)).toBe(AdariEvolutionStage.BASE);
    expect(stageFromInt(99)).toBe(AdariEvolutionStage.PERFECT);
  });

  it('texto exibido segue a spec §14', () => {
    expect(ADARI_STAGE_LABEL[AdariEvolutionStage.BASE]).toBe('Base');
    expect(ADARI_STAGE_LABEL[AdariEvolutionStage.EVOLUTION_1]).toBe('EV 1');
    expect(ADARI_STAGE_LABEL[AdariEvolutionStage.EVOLUTION_2]).toBe('EV 2');
    expect(ADARI_STAGE_LABEL[AdariEvolutionStage.PERFECT]).toBe('Evolução Perfeita');
  });

  it('transição válida é sempre +1 (nunca pula, nunca regride)', () => {
    expect(isValidStageTransition(AdariEvolutionStage.BASE, AdariEvolutionStage.EVOLUTION_1)).toBe(true);
    expect(isValidStageTransition(AdariEvolutionStage.BASE, AdariEvolutionStage.EVOLUTION_2)).toBe(false);
    expect(isValidStageTransition(AdariEvolutionStage.EVOLUTION_2, AdariEvolutionStage.EVOLUTION_1)).toBe(false);
    expect(isValidStageTransition(AdariEvolutionStage.PERFECT, AdariEvolutionStage.PERFECT)).toBe(false);
    expect(nextEvolutionStage(AdariEvolutionStage.PERFECT)).toBeNull();
  });

  it('cada linha possui exatamente 4 estágios com nomes e manifests próprios', () => {
    for (const creature of CREATURES) {
      expect(creature.stages).toHaveLength(4);
      const names = new Set(creature.stages.map((s) => s.name));
      const manifests = new Set(creature.stages.map((s) => s.assetManifestKey));
      expect(names.size).toBe(4);
      expect(manifests.size).toBe(4);
      expect(creature.stages[0]!.stage).toBe(AdariEvolutionStage.BASE);
      expect(creature.stages[0]!.requirements).toBeNull();
      expect(creature.stages[0]!.name).toBe(creature.name);
    }
  });

  it('Perfeitas preservam os nomes do MVP (Asterhorn, Stridara, Solvyr)', () => {
    expect(getStageDefinition('terravok', AdariEvolutionStage.PERFECT)?.name).toBe('Asterhorn');
    expect(getStageDefinition('lumora', AdariEvolutionStage.PERFECT)?.name).toBe('Stridara');
    expect(getStageDefinition('solivar', AdariEvolutionStage.PERFECT)?.name).toBe('Solvyr');
  });

  it('requisitos escalam por estágio: EV 1 sem chefe, EV 2 exige r1-boss, Perfeita exige r3-boss + afinidade + Vínculo alto', () => {
    for (const creature of CREATURES) {
      const ev1 = getStageDefinition(creature.key, AdariEvolutionStage.EVOLUTION_1)?.requirements;
      const ev2 = getStageDefinition(creature.key, AdariEvolutionStage.EVOLUTION_2)?.requirements;
      const perfect = getStageDefinition(creature.key, AdariEvolutionStage.PERFECT)?.requirements;
      expect(ev1?.campaignMilestone).toBeNull();
      expect(ev1?.affinityAttribute).toBeNull();
      expect(ev1?.minBond).toBeGreaterThan(0);
      expect(ev2?.campaignMilestone).toBe('r1-boss');
      expect(perfect?.campaignMilestone).toBe('r3-boss');
      expect(perfect?.affinityAttribute).toBe(creature.affinity);
      expect(perfect?.minBond).toBeGreaterThanOrEqual(60);
      // Progressão significativa: cada estágio pede mais que o anterior.
      expect(ev2!.minLevel).toBeGreaterThan(ev1!.minLevel);
      expect(perfect!.minLevel).toBeGreaterThan(ev2!.minLevel);
      expect(perfect!.minActivities).toBeGreaterThan(ev2!.minActivities);
    }
  });

  it('boost cumulativo soma os estágios alcançados (materialização server-side)', () => {
    expect(cumulativeStageStatBoost('terravok', 0)).toEqual({});
    expect(cumulativeStageStatBoost('terravok', 1)).toEqual({ strength: 6, health: 15 });
    expect(cumulativeStageStatBoost('terravok', 3)).toEqual({ strength: 30, health: 80 });
  });

  it('resolução por inteiro e próximo estágio funcionam', () => {
    expect(getStageDefinitionByInt('lumora', 1)?.name).toBe('Velair');
    expect(getNextStageDefinition('lumora', AdariEvolutionStage.EVOLUTION_1)?.name).toBe('Velustra');
    expect(getNextStageDefinition('lumora', AdariEvolutionStage.PERFECT)).toBeUndefined();
  });

  it('cada estágio evoluído destaca uma habilidade existente da linha', () => {
    for (const creature of CREATURES) {
      for (const stage of creature.stages.slice(1)) {
        expect(stage.highlightedAbilityId).toMatch(new RegExp(`^${creature.key}-`));
      }
    }
  });
});
