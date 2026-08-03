import {
  ACTIVITY_ATTRIBUTE_AFFINITY,
  ATTRIBUTE_TRAINING,
  activitiesTraining,
  addTrainingTotals,
  affinityFor,
  calculateActivityTraining,
  describeTrainingGain,
  levelAttributeBonus,
  materializeAttributes,
  splitTrainingPoints,
  trainingBasePoints,
  trainingBreakdown,
  TRAINABLE_ATTRIBUTES,
} from './attributeProgression';
import { getCreatureByKey } from './content/creatures';
import type { ActivityType, Intensity } from './enums';
import type { AttributeChanges } from './types';

const BASE = getCreatureByKey('lumora')!.baseStats;

function training(
  activityType: ActivityType,
  durationMinutes: number,
  perceivedIntensity: Intensity = 'moderada',
  position = 1,
): AttributeChanges {
  return calculateActivityTraining(
    { activityType, perceivedIntensity, durationMinutes },
    position,
  ).finalTrainingChanges;
}

describe('pontuação-base por duração', () => {
  it('abaixo de 10 minutos não gera treino', () => {
    expect(trainingBasePoints(0)).toBe(0);
    expect(trainingBasePoints(9)).toBe(0);
  });

  it('respeita as faixas 8/12/16/20', () => {
    expect(trainingBasePoints(10)).toBe(8);
    expect(trainingBasePoints(29)).toBe(8);
    expect(trainingBasePoints(30)).toBe(12);
    expect(trainingBasePoints(59)).toBe(12);
    expect(trainingBasePoints(60)).toBe(16);
    expect(trainingBasePoints(89)).toBe(16);
    expect(trainingBasePoints(90)).toBe(20);
    expect(trainingBasePoints(120)).toBe(20);
  });

  it('acima de 120 minutos satura no teto', () => {
    expect(trainingBasePoints(300)).toBe(trainingBasePoints(120));
  });
});

describe('intensidade altera os pontos', () => {
  it('leve rende menos e intensa rende mais que moderada', () => {
    const input = { activityType: 'corrida' as const, durationMinutes: 60 };
    const leve = calculateActivityTraining({ ...input, perceivedIntensity: 'leve' }, 1).finalPoints;
    const moderada = calculateActivityTraining({ ...input, perceivedIntensity: 'moderada' }, 1).finalPoints;
    const intensa = calculateActivityTraining({ ...input, perceivedIntensity: 'intensa' }, 1).finalPoints;
    expect(leve).toBeLessThan(moderada);
    expect(moderada).toBeLessThan(intensa);
    expect(moderada).toBe(16);
  });
});

describe('divisão 60/30/10 por maior resto', () => {
  it('o exemplo da especificação: corrida moderada de 30 min', () => {
    const reward = calculateActivityTraining(
      { activityType: 'corrida', perceivedIntensity: 'moderada', durationMinutes: 30 },
      1,
    );
    expect(reward.finalPoints).toBe(12);
    expect(reward.finalTrainingChanges).toEqual({ endurance: 7, agility: 4, discipline: 1 });
  });

  it('a soma das partes é sempre igual ao total (não perde nem inventa ponto)', () => {
    for (const type of Object.keys(ACTIVITY_ATTRIBUTE_AFFINITY) as ActivityType[]) {
      for (const total of [1, 2, 3, 7, 8, 12, 14, 16, 19, 20, 24]) {
        const parts = splitTrainingPoints(total, affinityFor(type));
        const sum = Object.values(parts).reduce((acc, value) => acc + (value ?? 0), 0);
        expect(sum).toBe(total);
      }
    }
  });

  it('o principal sempre recebe a maior fatia', () => {
    for (const type of Object.keys(ACTIVITY_ATTRIBUTE_AFFINITY) as ActivityType[]) {
      const affinity = affinityFor(type);
      const parts = splitTrainingPoints(20, affinity);
      expect(parts[affinity.primary]!).toBeGreaterThanOrEqual(parts[affinity.secondary] ?? 0);
    }
  });

  it('"outro" não tem complementar: a fatia volta para o principal (70/30)', () => {
    const parts = splitTrainingPoints(10, affinityFor('outro'));
    expect(parts).toEqual({ discipline: 7, spirit: 3 });
  });
});

describe('afinidades por tipo de atividade', () => {
  it('musculação aumenta Força', () => {
    expect(training('musculacao', 60).strength).toBeGreaterThan(0);
  });

  it('corrida aumenta Resistência e Agilidade', () => {
    const points = training('corrida', 60);
    expect(points.endurance).toBeGreaterThan(0);
    expect(points.agility).toBeGreaterThan(0);
    expect(points.endurance!).toBeGreaterThan(points.agility!);
  });

  it('caminhada aumenta Recuperação e Resistência', () => {
    const points = training('caminhada', 60);
    expect(points.recovery).toBeGreaterThan(0);
    expect(points.endurance).toBeGreaterThan(0);
  });

  it('ciclismo aumenta Resistência e Agilidade', () => {
    const points = training('ciclismo', 60);
    expect(points.endurance).toBeGreaterThan(0);
    expect(points.agility).toBeGreaterThan(0);
  });

  it('natação aumenta Resistência e Recuperação', () => {
    const points = training('natacao', 60);
    expect(points.endurance).toBeGreaterThan(0);
    expect(points.recovery).toBeGreaterThan(0);
  });

  it('funcional aumenta Agilidade e Força', () => {
    const points = training('funcional', 60);
    expect(points.agility).toBeGreaterThan(0);
    expect(points.strength).toBeGreaterThan(0);
  });

  it('mobilidade aumenta Recuperação e Agilidade', () => {
    const points = training('mobilidade', 60);
    expect(points.recovery).toBeGreaterThan(0);
    expect(points.agility).toBeGreaterThan(0);
  });

  it('esporte coletivo aumenta Agilidade e Espírito', () => {
    const points = training('esporte_coletivo', 60);
    expect(points.agility).toBeGreaterThan(0);
    expect(points.spirit).toBeGreaterThan(0);
  });

  it('toda afinidade referencia apenas atributos treináveis', () => {
    for (const affinity of Object.values(ACTIVITY_ATTRIBUTE_AFFINITY)) {
      expect(TRAINABLE_ATTRIBUTES).toContain(affinity.primary);
      expect(TRAINABLE_ATTRIBUTES).toContain(affinity.secondary);
      if (affinity.tertiary) expect(TRAINABLE_ATTRIBUTES).toContain(affinity.tertiary);
    }
  });

  it('a UI consegue listar as atividades que desenvolvem um atributo', () => {
    expect(activitiesTraining('endurance')).toEqual(
      expect.arrayContaining(['corrida', 'ciclismo', 'natacao']),
    );
    expect(activitiesTraining('strength')).toEqual(expect.arrayContaining(['musculacao', 'funcional']));
  });
});

describe('multiplicador diário', () => {
  const input = { activityType: 'corrida' as const, perceivedIntensity: 'moderada' as const, durationMinutes: 60 };

  it('primeira atividade recebe 100%', () => {
    expect(calculateActivityTraining(input, 1).finalPoints).toBe(16);
  });

  it('segunda recebe 25%', () => {
    expect(calculateActivityTraining(input, 2).finalPoints).toBe(4);
  });

  it('terceira e além não recebem progresso, mas a atividade segue registrada', () => {
    expect(calculateActivityTraining(input, 3).finalPoints).toBe(0);
    expect(calculateActivityTraining(input, 9).finalTrainingChanges).toEqual({});
    // A base continua calculada — o registro sabe o que teria valido.
    expect(calculateActivityTraining(input, 3).basePoints).toBe(16);
  });

  it('duração abaixo do mínimo nunca gera pontos, mesmo em 1ª posição', () => {
    expect(calculateActivityTraining({ ...input, durationMinutes: 5 }, 1).finalPoints).toBe(0);
  });
});

describe('acúmulo de progresso e subida de atributo', () => {
  it('progresso acumula sem subir o atributo antes de 100', () => {
    const { progress } = materializeAttributes({
      baseStats: BASE, trainingTotals: { endurance: 34 }, level: 1,
    });
    const endurance = progress.find((p) => p.attribute === 'endurance')!;
    expect(endurance.value).toBe(BASE.endurance);
    expect(endurance.trainingProgress).toBe(34);
    expect(endurance.progressRequired).toBe(100);
  });

  it('chegar a 100 aumenta o atributo em 1', () => {
    const { progress } = materializeAttributes({
      baseStats: BASE, trainingTotals: { endurance: 100 }, level: 1,
    });
    const endurance = progress.find((p) => p.attribute === 'endurance')!;
    expect(endurance.value).toBe(BASE.endurance + 1);
    expect(endurance.trainingProgress).toBe(0);
  });

  it('preserva o excedente: 96 + 8 vira +1 e sobra 4', () => {
    const total = addTrainingTotals({ endurance: 96 }, { endurance: 8 });
    const { earned, remainder } = trainingBreakdown(total.endurance!);
    expect(earned).toBe(1);
    expect(remainder).toBe(4);
    const { progress } = materializeAttributes({ baseStats: BASE, trainingTotals: total, level: 1 });
    const endurance = progress.find((p) => p.attribute === 'endurance')!;
    expect(endurance.value).toBe(BASE.endurance + 1);
    expect(endurance.trainingProgress).toBe(4);
  });

  it('vários pontos de uma vez são todos concedidos', () => {
    const { progress } = materializeAttributes({
      baseStats: BASE, trainingTotals: { endurance: 250 }, level: 1,
    });
    const endurance = progress.find((p) => p.attribute === 'endurance')!;
    expect(endurance.value).toBe(BASE.endurance + 2);
    expect(endurance.trainingProgress).toBe(50);
  });
});

describe('nível fortalece todos os atributos', () => {
  it('cada nível concede +1 em cada atributo treinável', () => {
    expect(levelAttributeBonus(1)).toBe(0);
    expect(levelAttributeBonus(2)).toBe(1);
    expect(levelAttributeBonus(5)).toBe(4);
  });

  it('subir de nível aumenta TODOS os atributos', () => {
    const before = materializeAttributes({ baseStats: BASE, trainingTotals: {}, level: 1 }).values;
    const after = materializeAttributes({ baseStats: BASE, trainingTotals: {}, level: 2 }).values;
    for (const attribute of TRAINABLE_ATTRIBUTES) {
      expect(after[attribute]).toBe(before[attribute] + ATTRIBUTE_TRAINING.LEVEL_UP_GAIN);
    }
  });

  it('o ganho de nível é independente do progresso de treino', () => {
    const values = materializeAttributes({
      baseStats: BASE, trainingTotals: { endurance: 100 }, level: 3,
    }).values;
    expect(values.endurance).toBe(BASE.endurance + 2 + 1);
    expect(values.strength).toBe(BASE.strength + 2);
  });
});

describe('descrição do ganho para a tela de recompensa', () => {
  it('mostra progresso anterior → novo e a quantidade recebida', () => {
    const after = materializeAttributes({
      baseStats: BASE, trainingTotals: { endurance: 42, agility: 22 }, level: 1,
    }).progress;
    const rows = describeTrainingGain(after, { endurance: 8, agility: 4 });
    expect(rows).toHaveLength(2);
    const endurance = rows.find((r) => r.attribute === 'endurance')!;
    expect(endurance.previousProgress).toBe(34);
    expect(endurance.currentProgress).toBe(42);
    expect(endurance.gained).toBe(8);
    expect(endurance.increased).toBe(false);
  });

  it('sinaliza quando o atributo realmente aumentou, com o antes e depois', () => {
    const after = materializeAttributes({
      baseStats: BASE, trainingTotals: { endurance: 104 }, level: 1,
    }).progress;
    const rows = describeTrainingGain(after, { endurance: 8 });
    const endurance = rows[0]!;
    expect(endurance.increased).toBe(true);
    expect(endurance.previousValue).toBe(BASE.endurance);
    expect(endurance.value).toBe(BASE.endurance + 1);
    expect(endurance.previousProgress).toBe(96);
    expect(endurance.currentProgress).toBe(4);
  });

  it('atributos sem ganho nesta atividade não aparecem', () => {
    const after = materializeAttributes({
      baseStats: BASE, trainingTotals: { endurance: 40 }, level: 1,
    }).progress;
    expect(describeTrainingGain(after, { endurance: 8 }).map((r) => r.attribute)).toEqual(['endurance']);
    expect(describeTrainingGain(after, {})).toEqual([]);
  });
});

describe('materialização é idempotente e não duplica', () => {
  it('recalcular com os mesmos fatos dá exatamente o mesmo resultado', () => {
    const input = {
      baseStats: BASE,
      trainingTotals: { endurance: 137, agility: 42 },
      level: 4,
      stageBoost: { endurance: 10, health: 30 },
    };
    expect(materializeAttributes(input)).toEqual(materializeAttributes(input));
  });

  it('aplicar a mesma atividade duas vezes exige total dobrado — nunca acontece por recálculo', () => {
    const once = addTrainingTotals({}, { endurance: 8 });
    const derivedOnce = materializeAttributes({ baseStats: BASE, trainingTotals: once, level: 1 });
    // Materializar de novo com o MESMO total não muda nada (idempotente).
    expect(materializeAttributes({ baseStats: BASE, trainingTotals: once, level: 1 })).toEqual(derivedOnce);
  });

  it('excluir atividade devolve o progresso (delta negativo) sem quebrar', () => {
    const afterTwo = addTrainingTotals({ endurance: 8 }, { endurance: 8 });
    const afterDelete = addTrainingTotals(afterTwo, { endurance: -8 });
    expect(afterDelete.endurance).toBe(8);
  });

  it('nunca deixa o total negativo', () => {
    expect(addTrainingTotals({ endurance: 3 }, { endurance: -99 }).endurance).toBe(0);
  });

  it('reforço de estágio evolutivo entra no valor final', () => {
    const values = materializeAttributes({
      baseStats: BASE, trainingTotals: {}, level: 1, stageBoost: { strength: 5, health: 30 },
    }).values;
    expect(values.strength).toBe(BASE.strength + 5);
    expect(values.health).toBe(BASE.health + 30);
  });

  it('Vigor (energy) não é treinado nem materializado aqui', () => {
    const { progress } = materializeAttributes({ baseStats: BASE, trainingTotals: {}, level: 9 });
    expect(progress.map((p) => p.attribute)).not.toContain('energy');
    expect(progress.map((p) => p.attribute)).not.toContain('health');
  });
});
