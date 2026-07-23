import type { RegionDefinition } from './types';

/** Três regiões da campanha offline (versionadas). */
export const REGIONS: readonly RegionDefinition[] = [
  {
    key: 'r1',
    order: 1,
    name: 'Planície Nascente',
    theme: 'Início da jornada, aprendizado e constância básica.',
    description:
      'Onde toda jornada começa. Desafios gentis ensinam seu companheiro a manter o ritmo.',
    scenario: 'Campos abertos ao amanhecer, com trilhas suaves e horizonte dourado.',
    unlockAfterBoss: null,
  },
  {
    key: 'r2',
    order: 2,
    name: 'Desfiladeiro da Disciplina',
    theme: 'Disciplina, resistência e desafios intermediários.',
    description:
      'Caminhos mais íngremes exigem foco e fôlego. A constância vira força de verdade.',
    scenario: 'Cânions de pedra avermelhada, ventos firmes e pontes estreitas.',
    unlockAfterBoss: 'r1-boss',
  },
  {
    key: 'r3',
    order: 3,
    name: 'Cume das Estrelas',
    theme: 'Superação, equilíbrio e o chefe final do MVP.',
    description:
      'O topo da montanha, perto das estrelas. Aqui a jornada encontra seu maior desafio.',
    scenario: 'Picos nevados sob um céu estrelado, com auroras suaves ao fundo.',
    unlockAfterBoss: 'r2-boss',
  },
];

export function getRegionByKey(key: string): RegionDefinition | undefined {
  return REGIONS.find((r) => r.key === key);
}
