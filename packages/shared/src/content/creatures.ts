import { CONTENT_VERSION } from '@ad-sidera/config';
import {
  AdariEvolutionStage,
  stageFromInt,
  nextEvolutionStage,
  type EvolutionRequirements,
} from '../evolution';
import type { AttributeKey, AttributeSet } from '../types';
import type { AdariEvolutionLine, AdariStageDefinition, CreatureDefinition } from './types';

/**
 * Três linhas evolutivas 100% ORIGINAIS (sem semelhança com IP existente).
 * Tema Asdra Fit: companheiros que evoluem "rumo às estrelas" pela disciplina.
 * Build 5: quatro estágios fixos por linha (BASE → EV 1 → EV 2 → PERFECT).
 * Nomes intermediários são CONTEÚDO — nunca hardcodar em componentes.
 */

const STAGE_SLUG: Record<AdariEvolutionStage, string> = {
  [AdariEvolutionStage.BASE]: 'base',
  [AdariEvolutionStage.EVOLUTION_1]: 'evolution-1',
  [AdariEvolutionStage.EVOLUTION_2]: 'evolution-2',
  [AdariEvolutionStage.PERFECT]: 'perfect',
};

/** Requisitos padrão por estágio (spec §18). Afinidade só na Perfeita (§19). */
function requirementsFor(
  stage: AdariEvolutionStage,
  affinity: AttributeKey,
  affinityThreshold: number,
): EvolutionRequirements | null {
  switch (stage) {
    case AdariEvolutionStage.EVOLUTION_1:
      return {
        minLevel: 5,
        minWeeksGoalMet: 1,
        minActivities: 8,
        minBond: 10,
        affinityAttribute: null,
        affinityThreshold: 0,
        campaignMilestone: null,
      };
    case AdariEvolutionStage.EVOLUTION_2:
      return {
        minLevel: 12,
        minWeeksGoalMet: 3,
        minActivities: 30,
        minBond: 25,
        affinityAttribute: null,
        affinityThreshold: 0,
        campaignMilestone: 'r1-boss',
      };
    case AdariEvolutionStage.PERFECT:
      return {
        minLevel: 25,
        minWeeksGoalMet: 8,
        minActivities: 100,
        minBond: 60,
        affinityAttribute: affinity,
        affinityThreshold,
        campaignMilestone: 'r3-boss',
      };
    default:
      return null;
  }
}

/** Reforço permanente ao ENTRAR no estágio (afinidade + vitalidade). */
function statBoostFor(stage: AdariEvolutionStage, affinity: AttributeKey): Partial<AttributeSet> {
  switch (stage) {
    case AdariEvolutionStage.EVOLUTION_1:
      return { [affinity]: 6, health: 15 };
    case AdariEvolutionStage.EVOLUTION_2:
      return { [affinity]: 10, health: 25 };
    case AdariEvolutionStage.PERFECT:
      return { [affinity]: 14, health: 40 };
    default:
      return {};
  }
}

interface StageContent {
  key?: string;
  name: string;
  description: string;
  narrative: string;
  visualDescription: string;
}

function buildStages(
  lineKey: string,
  affinity: AttributeKey,
  affinityThreshold: number,
  content: Record<AdariEvolutionStage, StageContent>,
): AdariStageDefinition[] {
  const highlighted: Record<AdariEvolutionStage, string | null> = {
    [AdariEvolutionStage.BASE]: null,
    [AdariEvolutionStage.EVOLUTION_1]: `${lineKey}-special`,
    [AdariEvolutionStage.EVOLUTION_2]: `${lineKey}-tactical`,
    [AdariEvolutionStage.PERFECT]: `${lineKey}-special`,
  };
  return (Object.keys(STAGE_SLUG) as AdariEvolutionStage[]).map((stage) => {
    const c = content[stage];
    return {
      stage,
      key: c.key ?? (stage === AdariEvolutionStage.BASE ? lineKey : `${lineKey}-${STAGE_SLUG[stage]}`),
      name: c.name,
      description: c.description,
      narrative: c.narrative,
      visualDescription: c.visualDescription,
      statBoost: statBoostFor(stage, affinity),
      highlightedAbilityId: highlighted[stage],
      requirements: requirementsFor(stage, affinity, affinityThreshold),
      assetManifestKey: `${lineKey}/${STAGE_SLUG[stage]}`,
      contentVersion: CONTENT_VERSION,
    };
  });
}

const TERRAVOK_STAGES = buildStages('terravok', 'strength', 70, {
  [AdariEvolutionStage.BASE]: {
    name: 'Brontu',
    description: 'Nascido das raízes profundas de montanhas antigas, Brontu transforma esforço em rocha viva.',
    narrative: 'Pequeno e leal, Brontu observa cada treino seu com olhos de âmbar atentos.',
    visualDescription:
      'Companheiro terroso, pequeno e compacto, com placas de cristal âmbar nas costas e chifres discretos.',
  },
  [AdariEvolutionStage.EVOLUTION_1]: {
    name: 'Brontar',
    description: 'A rocha ganhou postura: Brontar avança seguro, com as primeiras placas de armadura estelar.',
    narrative: 'Sua constância despertou as primeiras placas de armadura de Brontar.',
    visualDescription:
      'Corpo um pouco maior, ombros firmes, primeiras placas tecnológicas douradas nos braços e chifres definidos.',
  },
  [AdariEvolutionStage.EVOLUTION_2]: {
    name: 'Bronterra',
    description: 'Silhueta heroica e placas amplas: Bronterra é a muralha que caminha ao seu lado.',
    narrative: 'A disciplina virou fortaleza — Bronterra ergue a muralha que protege a jornada.',
    visualDescription:
      'Corpo desenvolvido e robusto, armadura elaborada com circuitos dourados, chifres amplos e presença de escudo.',
  },
  [AdariEvolutionStage.PERFECT]: {
    key: 'montarok',
    name: 'Asterhorn',
    description: 'Brontu se ergue como uma cordilheira viva, imenso e inabalável.',
    narrative: 'Sob as constelações, a montanha desperta: Asterhorn, a forma perfeita da proteção.',
    visualDescription:
      'Forma imponente com armadura completa, aura dourada, marcas de constelação nas placas e os chifres-estrela que dão nome à forma.',
  },
});

const LUMORA_STAGES = buildStages('lumora', 'endurance', 70, {
  [AdariEvolutionStage.BASE]: {
    name: 'Velune',
    description: 'Uma chama serena que não se apaga: Velune prospera na resistência e na recuperação.',
    narrative: 'Velune acompanha seu ritmo com brasas calmas que nunca se apagam.',
    visualDescription:
      'Companheiro esguio e pequeno envolto em brasas suaves cor de âmbar e violeta, cauda curta e fluida.',
  },
  [AdariEvolutionStage.EVOLUTION_1]: {
    name: 'Velair',
    description: 'O fôlego virou vento: Velair corre com linhas aerodinâmicas e brasas em espiral.',
    narrative: 'Seu fôlego constante deu asas leves a Velair.',
    visualDescription:
      'Corpo esguio alongado, pernas mais desenvolvidas, primeiras linhas aerodinâmicas teal e cauda em espiral.',
  },
  [AdariEvolutionStage.EVOLUTION_2]: {
    name: 'Velustra',
    description: 'Velustra desliza entre correntes de energia, incansável como a maré.',
    narrative: 'A resistência virou maré — Velustra atravessa qualquer distância sem apagar a chama.',
    visualDescription:
      'Silhueta heroica e aerodinâmica, asas leves de energia teal, cauda longa fluida e marcas de movimento no corpo.',
  },
  [AdariEvolutionStage.PERFECT]: {
    key: 'pyrelith',
    name: 'Stridara',
    description: 'Velune se torna uma estrela estável, irradiando energia inesgotável.',
    narrative: 'O horizonte se curva: Stridara, a forma perfeita do movimento sem fim.',
    visualDescription:
      'Forma final esguia e majestosa, aura ciano-teal, asas amplas de energia, cauda-cometa e marcas de constelação.',
  },
});

const SOLIVAR_STAGES = buildStages('solivar', 'discipline', 64, {
  [AdariEvolutionStage.BASE]: {
    name: 'Myrin',
    description: 'Guiado pelas constelações, Myrin equilibra corpo e espírito, adaptando-se a cada desafio.',
    narrative: 'Myrin lê as constelações da sua rotina com curiosidade silenciosa.',
    visualDescription:
      'Companheiro leve e pequeno, alado, com padrões de constelação na pelagem prateada e olhos violeta.',
  },
  [AdariEvolutionStage.EVOLUTION_1]: {
    name: 'Myrix',
    description: 'As constelações se acenderam: Myrix reage ao seu foco com luz própria.',
    narrative: 'Seu foco acendeu as primeiras constelações de Myrix.',
    visualDescription:
      'Corpo levemente maior e simétrico, asas definidas, primeiras linhas de circuito violeta e marcas estelares ativas.',
  },
  [AdariEvolutionStage.EVOLUTION_2]: {
    name: 'Myrandel',
    description: 'Estrategista alado, Myrandel antecipa cada movimento com precisão estelar.',
    narrative: 'O equilíbrio virou estratégia — Myrandel enxerga o caminho antes do primeiro passo.',
    visualDescription:
      'Silhueta nobre e equilibrada, asas amplas, armadura leve azul-violeta com detalhes dourados e padrões de constelação completos.',
  },
  [AdariEvolutionStage.PERFECT]: {
    key: 'astravel',
    name: 'Solvyr',
    description: 'Myrin alça voo como um cometa, veloz e harmonioso entre as estrelas.',
    narrative: 'Entre as estrelas, o equilíbrio encontra sua forma: Solvyr, o cometa perfeito.',
    visualDescription:
      'Forma final alada e luminosa, aura violeta-dourada, asas-cometa, simetria perfeita e constelações orbitando o corpo.',
  },
});

function perfectOf(stages: readonly AdariStageDefinition[]): AdariStageDefinition {
  return stages[stages.length - 1]!;
}

/** Deriva o campo legado `evolution` (Build 4) do estágio PERFECT. */
function legacyEvolution(stages: readonly AdariStageDefinition[]): CreatureDefinition['evolution'] {
  const perfect = perfectOf(stages);
  return {
    toKey: perfect.key,
    toName: perfect.name,
    description: perfect.description,
    requirements: perfect.requirements!,
  };
}

export const CREATURES: readonly CreatureDefinition[] = [
  {
    key: 'terravok',
    name: 'Brontu',
    archetype: 'forca',
    affinity: 'strength',
    personality: 'Leal, determinado e protetor.',
    description:
      'Nascido das raízes profundas de montanhas antigas, Brontu transforma esforço em rocha viva.',
    visualDescription:
      'Companheiro terroso e compacto, com placas de cristal âmbar nas costas que brilham quando forte.',
    baseStats: {
      strength: 22,
      endurance: 14,
      agility: 8,
      discipline: 12,
      recovery: 8,
      spirit: 10,
      health: 110,
      energy: 40,
    },
    basicAbility: {
      id: 'terravok-basic',
      name: 'Impacto',
      description: 'Um golpe sólido e confiável.',
      energyCost: 0,
      power: 1,
    },
    specialAbility: {
      id: 'terravok-special',
      name: 'Fenda Tectônica',
      description: 'Concentra a força acumulada em um único golpe devastador.',
      energyCost: 20,
      power: 1.8,
    },
    stages: TERRAVOK_STAGES,
    evolution: legacyEvolution(TERRAVOK_STAGES),
    contentVersion: CONTENT_VERSION,
  },
  {
    key: 'lumora',
    name: 'Velune',
    archetype: 'resistencia',
    affinity: 'endurance',
    personality: 'Persistente, sereno e incansável.',
    description:
      'Uma chama serena que não se apaga: Velune prospera na resistência e na recuperação.',
    visualDescription:
      'Companheiro esguio envolto em uma aura de brasas suaves cor de âmbar e violeta, que pulsam devagar.',
    baseStats: {
      strength: 10,
      endurance: 22,
      agility: 10,
      discipline: 12,
      recovery: 16,
      spirit: 12,
      health: 130,
      energy: 45,
    },
    basicAbility: {
      id: 'lumora-basic',
      name: 'Brasa',
      description: 'Uma chama constante e persistente.',
      energyCost: 0,
      power: 1,
    },
    specialAbility: {
      id: 'lumora-special',
      name: 'Onda Persistente',
      description: 'Libera o fôlego acumulado em uma onda contínua e eficiente.',
      energyCost: 15,
      power: 1.5,
    },
    stages: LUMORA_STAGES,
    evolution: legacyEvolution(LUMORA_STAGES),
    contentVersion: CONTENT_VERSION,
  },
  {
    key: 'solivar',
    name: 'Myrin',
    archetype: 'equilibrio',
    affinity: 'discipline',
    personality: 'Curioso, disciplinado e adaptável.',
    description:
      'Guiado pelas constelações, Myrin equilibra corpo e espírito, adaptando-se a cada desafio.',
    visualDescription:
      'Companheiro leve e alado com padrões de constelação na pelagem prateada, que giram lentamente.',
    baseStats: {
      strength: 14,
      endurance: 14,
      agility: 16,
      discipline: 16,
      recovery: 12,
      spirit: 14,
      health: 120,
      energy: 42,
    },
    basicAbility: {
      id: 'solivar-basic',
      name: 'Lampejo',
      description: 'Um golpe ágil e preciso.',
      energyCost: 0,
      power: 1,
    },
    specialAbility: {
      id: 'solivar-special',
      name: 'Alinhamento Estelar',
      description: 'Sincroniza movimento e foco em um golpe equilibrado e certeiro.',
      energyCost: 18,
      power: 1.6,
    },
    stages: SOLIVAR_STAGES,
    evolution: legacyEvolution(SOLIVAR_STAGES),
    contentVersion: CONTENT_VERSION,
  },
];

export function getCreatureByKey(key: string): CreatureDefinition | undefined {
  return CREATURES.find((c) => c.key === key);
}

/** Linha evolutiva completa de um Adari. */
export function getEvolutionLine(creatureKey: string): AdariEvolutionLine | undefined {
  const creature = getCreatureByKey(creatureKey);
  return creature ? { adariKey: creature.key, stages: creature.stages } : undefined;
}

/** Definição de um estágio específico da linha. */
export function getStageDefinition(
  creatureKey: string,
  stage: AdariEvolutionStage,
): AdariStageDefinition | undefined {
  return getCreatureByKey(creatureKey)?.stages.find((s) => s.stage === stage);
}

/** Estágio a partir do inteiro persistido (0..3). */
export function getStageDefinitionByInt(
  creatureKey: string,
  stageInt: number,
): AdariStageDefinition | undefined {
  return getStageDefinition(creatureKey, stageFromInt(stageInt));
}

/** Próximo estágio da linha (alvo da evolução), ou undefined quando PERFECT. */
export function getNextStageDefinition(
  creatureKey: string,
  currentStage: AdariEvolutionStage,
): AdariStageDefinition | undefined {
  const next = nextEvolutionStage(currentStage);
  return next ? getStageDefinition(creatureKey, next) : undefined;
}

/** Nome público exibido para o estágio atual (ex.: Brontar). */
export function displayNameForStage(creatureKey: string, stageInt: number): string {
  const def = getStageDefinitionByInt(creatureKey, stageInt);
  return def?.name ?? getCreatureByKey(creatureKey)?.name ?? 'Adari';
}

/**
 * Soma dos reforços permanentes de TODOS os estágios já alcançados (1..stage).
 * Usada pela materialização server-side de atributos: atributos = base +
 * recompensas de atividade + este acumulado (senão o recompute apagaria o
 * reforço de evolução).
 */
export function cumulativeStageStatBoost(
  creatureKey: string,
  stageInt: number,
): Partial<AttributeSet> {
  const creature = getCreatureByKey(creatureKey);
  if (!creature) return {};
  const total: Partial<AttributeSet> = {};
  for (const stageDef of creature.stages) {
    const index = creature.stages.indexOf(stageDef);
    if (index === 0 || index > stageInt) continue;
    for (const [key, value] of Object.entries(stageDef.statBoost) as [keyof AttributeSet, number][]) {
      total[key] = (total[key] ?? 0) + value;
    }
  }
  return total;
}
