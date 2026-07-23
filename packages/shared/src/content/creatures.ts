import { CONTENT_VERSION } from '@ad-sidera/config';
import type { CreatureDefinition } from './types';

/**
 * Três criaturas iniciais 100% ORIGINAIS (sem semelhança com IP existente).
 * Tema Ad Sidera: companheiros que evoluem "rumo às estrelas" pela disciplina.
 */
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
    evolution: {
      toKey: 'montarok',
      toName: 'Asterhorn',
      description: 'Brontu se ergue como uma cordilheira viva, imenso e inabalável.',
      requirements: {
        minLevel: 10,
        minWeeksGoalMet: 3,
        minActivities: 20,
        affinityAttribute: 'strength',
        affinityThreshold: 38,
        campaignMilestone: 'r1-boss',
      },
    },
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
    evolution: {
      toKey: 'pyrelith',
      toName: 'Stridara',
      description: 'Velune se torna uma estrela estável, irradiando energia inesgotável.',
      requirements: {
        minLevel: 10,
        minWeeksGoalMet: 3,
        minActivities: 20,
        affinityAttribute: 'endurance',
        affinityThreshold: 38,
        campaignMilestone: 'r1-boss',
      },
    },
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
    evolution: {
      toKey: 'astravel',
      toName: 'Solvyr',
      description: 'Myrin alça voo como um cometa, veloz e harmonioso entre as estrelas.',
      requirements: {
        minLevel: 10,
        minWeeksGoalMet: 3,
        minActivities: 20,
        affinityAttribute: 'discipline',
        affinityThreshold: 34,
        campaignMilestone: 'r1-boss',
      },
    },
    contentVersion: CONTENT_VERSION,
  },
];

export function getCreatureByKey(key: string): CreatureDefinition | undefined {
  return CREATURES.find((c) => c.key === key);
}
