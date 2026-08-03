import { CREATURES, getCreatureByKey } from './content';
import { checkEvolution } from './evolution';

/**
 * Caracterização pré-Build 5 (pixel art + evolução em 4 estágios).
 * Congela o comportamento que DEVE sobreviver à refatoração:
 * - as três linhas evolutivas terminam em Asterhorn, Stridara e Solvyr;
 * - a evolução nunca depende apenas de nível;
 * - cada linha exige a afinidade do próprio arquétipo.
 * O modelo de estágio único (0→1) será substituído por 4 estágios; os testes
 * de forma final e de semântica de requisitos continuam válidos após a troca.
 */
describe('build5 — invariantes das linhas evolutivas', () => {
  it('mantém as três criaturas iniciais com os nomes públicos do MVP', () => {
    expect(CREATURES.map((c) => c.name)).toEqual(['Brontu', 'Velune', 'Myrin']);
    expect(CREATURES.map((c) => c.key)).toEqual(['terravok', 'lumora', 'solivar']);
  });

  it('cada linha termina na sua Evolução Perfeita nomeada', () => {
    expect(getCreatureByKey('terravok')?.evolution.toName).toBe('Asterhorn');
    expect(getCreatureByKey('lumora')?.evolution.toName).toBe('Stridara');
    expect(getCreatureByKey('solivar')?.evolution.toName).toBe('Solvyr');
  });

  it('cada linha exige afinidade do próprio arquétipo para evoluir', () => {
    expect(getCreatureByKey('terravok')?.evolution.requirements.affinityAttribute).toBe('strength');
    expect(getCreatureByKey('lumora')?.evolution.requirements.affinityAttribute).toBe('endurance');
    expect(getCreatureByKey('solivar')?.evolution.requirements.affinityAttribute).toBe('discipline');
  });

  it('a evolução final nunca depende apenas do nível (para todas as linhas)', () => {
    for (const creature of CREATURES) {
      const req = creature.evolution.requirements;
      const soLevel = checkEvolution(
        {
          level: 99,
          weeksGoalMet: 0,
          totalActivities: 0,
          bond: 0,
          attributes: {
            strength: 0, endurance: 0, agility: 0, discipline: 0,
            recovery: 0, spirit: 0, health: 1, energy: 0,
          },
          defeatedMilestones: [],
        },
        req,
      );
      expect(soLevel.available).toBe(false);
      expect(req.campaignMilestone).not.toBeNull();
      expect(req.minWeeksGoalMet).toBeGreaterThan(0);
      expect(req.minActivities).toBeGreaterThan(0);
    }
  });
});
