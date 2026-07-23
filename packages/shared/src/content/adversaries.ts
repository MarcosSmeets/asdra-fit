import type { DifficultyType } from '../constants';
import type {
  BattleAbility,
  BattleStats,
  BehaviorProfile,
  BossConfig,
} from '../battle/types';
import type { AdversaryDefinition, AdversaryReward } from './types';

function basicAttack(id: string): BattleAbility {
  return {
    id: `${id}-atk`,
    name: 'Golpe',
    slot: 'basicAttack',
    type: 'damage',
    power: 1,
    cooldown: 0,
    duration: 0,
  };
}

function special(id: string, name: string, power: number): BattleAbility {
  return {
    id: `${id}-special`,
    name,
    slot: 'special',
    type: 'damage',
    power,
    cooldown: 2,
    duration: 0,
  };
}

function guard(id: string): BattleAbility {
  return {
    id: `${id}-guard`, name: 'Postura Firme', slot: 'basicDefense', type: 'defense',
    power: 0.7, cooldown: 1, duration: 1,
  };
}

const DEFAULT_BOSS: BossConfig = {
  phaseThresholds: [0.7, 0.35],
  telegraphEveryTurns: 3,
  telegraphPower: 1.85,
  chargingVulnerability: 1.3,
  phaseDamageBonus: 0.15,
};

interface CommonArgs {
  region: string;
  order: number;
  name: string;
  description: string;
  difficulty: DifficultyType;
  baseLevel: number;
  minLevel: number;
  maxLevel: number;
  stats: BattleStats;
  growth: Partial<BattleStats>;
  behavior: BehaviorProfile;
  special?: { name: string; power: number };
  reward: AdversaryReward;
  unlockAfter: string | null;
}

function common(a: CommonArgs): AdversaryDefinition {
  const id = `${a.region}-${a.order}`;
  const abilities = [basicAttack(id)];
  if (a.special) {
    abilities.push(special(id, a.special.name, a.special.power));
  }
  if (a.difficulty === 'elite') {
    abilities.push(guard(id));
  }
  return {
    id,
    regionKey: a.region,
    name: a.name,
    description: a.description,
    isBoss: false,
    order: a.order,
    difficultyType: a.difficulty,
    baseLevel: a.baseLevel,
    minLevel: a.minLevel,
    maxLevel: a.maxLevel,
    baseStats: a.stats,
    statGrowth: a.growth,
    abilities,
    behaviorProfile: a.behavior,
    reward: a.reward,
    unlockAfter: a.unlockAfter,
  };
}

interface BossArgs {
  region: string;
  name: string;
  description: string;
  baseLevel: number;
  minLevel: number;
  maxLevel: number;
  stats: BattleStats;
  growth: Partial<BattleStats>;
  special: { name: string; power: number };
  reward: AdversaryReward;
}

function boss(a: BossArgs): AdversaryDefinition {
  const id = `${a.region}-boss`;
  return {
    id,
    regionKey: a.region,
    name: a.name,
    description: a.description,
    isBoss: true,
    order: 5,
    difficultyType: 'boss',
    baseLevel: a.baseLevel,
    minLevel: a.minLevel,
    maxLevel: a.maxLevel,
    baseStats: a.stats,
    statGrowth: a.growth,
    abilities: [basicAttack(id), special(id, a.special.name, a.special.power)],
    behaviorProfile: 'bossPattern',
    boss: DEFAULT_BOSS,
    reward: a.reward,
    unlockAfter: `${a.region}-4`,
  };
}

const GROWTH_R1: Partial<BattleStats> = { maxHealth: 5, attack: 1, defense: 1 };
const GROWTH_R2: Partial<BattleStats> = { maxHealth: 7, attack: 1, defense: 1, speed: 1 };
const GROWTH_R3: Partial<BattleStats> = { maxHealth: 9, attack: 2, defense: 1, speed: 1 };

/** ~15 adversários: 3 regiões × (3 comuns + 1 elite + 1 chefe). Curva crescente. */
export const ADVERSARIES: readonly AdversaryDefinition[] = [
  // Região 1 — Planície Nascente (introdutória). Níveis efetivos ~1–8.
  common({ region: 'r1', order: 1, name: 'Espírito Errante', description: 'Um sopro curioso que testa seus primeiros passos.', difficulty: 'common', baseLevel: 2, minLevel: 1, maxLevel: 6, stats: { maxHealth: 45, attack: 12, defense: 5, speed: 8 }, growth: GROWTH_R1, behavior: 'aggressive', reward: { creatureXp: 0, energy: 0 }, unlockAfter: null }),
  common({ region: 'r1', order: 2, name: 'Broto Teimoso', description: 'Insiste em crescer no caminho — persistente, mas frágil.', difficulty: 'common', baseLevel: 3, minLevel: 1, maxLevel: 7, stats: { maxHealth: 55, attack: 13, defense: 6, speed: 9 }, growth: GROWTH_R1, behavior: 'aggressive', reward: { creatureXp: 0, energy: 0 }, unlockAfter: 'r1-1' }),
  common({ region: 'r1', order: 3, name: 'Sombra Tímida', description: 'Some quando pressionada, mas volta com coragem.', difficulty: 'common', baseLevel: 4, minLevel: 2, maxLevel: 8, stats: { maxHealth: 62, attack: 14, defense: 7, speed: 10 }, growth: GROWTH_R1, behavior: 'defensive', reward: { creatureXp: 0, energy: 0 }, unlockAfter: 'r1-2' }),
  common({ region: 'r1', order: 4, name: 'Guardião de Palha', description: 'O último obstáculo antes do chefe da planície.', difficulty: 'elite', baseLevel: 5, minLevel: 3, maxLevel: 9, stats: { maxHealth: 72, attack: 16, defense: 8, speed: 10 }, growth: GROWTH_R1, behavior: 'adaptive', special: { name: 'Fardo de Palha', power: 1.9 }, reward: { creatureXp: 0, energy: 0 }, unlockAfter: 'r1-3' }),
  boss({ region: 'r1', name: 'Coloss de Argila', description: 'O guardião da Planície Nascente. Sólido, mas justo com quem treinou.', baseLevel: 6, minLevel: 4, maxLevel: 10, stats: { maxHealth: 110, attack: 20, defense: 10, speed: 12 }, growth: GROWTH_R1, special: { name: 'Terremoto', power: 1.8 }, reward: { creatureXp: 0, energy: 0 } }),

  // Região 2 — Desfiladeiro da Disciplina (intermediária). Níveis efetivos ~6–16.
  common({ region: 'r2', order: 1, name: 'Vigia do Desfiladeiro', description: 'Observa cada passo em falso nas alturas.', difficulty: 'common', baseLevel: 8, minLevel: 6, maxLevel: 14, stats: { maxHealth: 95, attack: 20, defense: 12, speed: 12 }, growth: GROWTH_R2, behavior: 'aggressive', reward: { creatureXp: 0, energy: 0 }, unlockAfter: null }),
  common({ region: 'r2', order: 2, name: 'Corredor de Pedra', description: 'Veloz entre as fendas — exige ritmo constante.', difficulty: 'common', baseLevel: 9, minLevel: 6, maxLevel: 15, stats: { maxHealth: 110, attack: 22, defense: 13, speed: 14 }, growth: GROWTH_R2, behavior: 'aggressive', reward: { creatureXp: 0, energy: 0 }, unlockAfter: 'r2-1' }),
  common({ region: 'r2', order: 3, name: 'Eco Persistente', description: 'Devolve cada golpe com a mesma disciplina.', difficulty: 'common', baseLevel: 10, minLevel: 7, maxLevel: 16, stats: { maxHealth: 120, attack: 24, defense: 14, speed: 14 }, growth: GROWTH_R2, behavior: 'defensive', reward: { creatureXp: 0, energy: 0 }, unlockAfter: 'r2-2' }),
  common({ region: 'r2', order: 4, name: 'Sentinela de Ferro', description: 'Guarda o caminho para o Titã. Resistente e firme.', difficulty: 'elite', baseLevel: 11, minLevel: 8, maxLevel: 17, stats: { maxHealth: 135, attack: 26, defense: 16, speed: 15 }, growth: GROWTH_R2, behavior: 'adaptive', special: { name: 'Muralha de Ferro', power: 1.6 }, reward: { creatureXp: 0, energy: 0 }, unlockAfter: 'r2-3' }),
  boss({ region: 'r2', name: 'Titã do Desfiladeiro', description: 'O colosso que só cede à disciplina de muitas semanas.', baseLevel: 12, minLevel: 9, maxLevel: 18, stats: { maxHealth: 200, attack: 32, defense: 20, speed: 16 }, growth: GROWTH_R2, special: { name: 'Avalanche', power: 2 }, reward: { creatureXp: 0, energy: 0 } }),

  // Região 3 — Cume das Estrelas (avançada; chefe final do MVP). Níveis efetivos ~12–30.
  common({ region: 'r3', order: 1, name: 'Andarilho Gélido', description: 'Caminha na neve sem pressa, mas sem parar.', difficulty: 'common', baseLevel: 15, minLevel: 12, maxLevel: 26, stats: { maxHealth: 165, attack: 30, defense: 20, speed: 16 }, growth: GROWTH_R3, behavior: 'aggressive', reward: { creatureXp: 0, energy: 0 }, unlockAfter: null }),
  common({ region: 'r3', order: 2, name: 'Vento Cortante', description: 'Rápido e afiado como o ar do cume.', difficulty: 'common', baseLevel: 16, minLevel: 12, maxLevel: 27, stats: { maxHealth: 180, attack: 33, defense: 22, speed: 18 }, growth: GROWTH_R3, behavior: 'aggressive', reward: { creatureXp: 0, energy: 0 }, unlockAfter: 'r3-1' }),
  common({ region: 'r3', order: 3, name: 'Guardião Estelar', description: 'Reflete a luz das constelações em cada golpe.', difficulty: 'common', baseLevel: 17, minLevel: 13, maxLevel: 28, stats: { maxHealth: 200, attack: 35, defense: 24, speed: 18 }, growth: GROWTH_R3, behavior: 'defensive', reward: { creatureXp: 0, energy: 0 }, unlockAfter: 'r3-2' }),
  common({ region: 'r3', order: 4, name: 'Presságio Sombrio', description: 'A última sombra antes da aurora final.', difficulty: 'elite', baseLevel: 18, minLevel: 14, maxLevel: 29, stats: { maxHealth: 220, attack: 38, defense: 26, speed: 20 }, growth: GROWTH_R3, behavior: 'adaptive', special: { name: 'Véu Sombrio', power: 1.7 }, reward: { creatureXp: 0, energy: 0 }, unlockAfter: 'r3-3' }),
  boss({ region: 'r3', name: 'Devorador de Auroras', description: 'O desafio final do MVP: aquele que tenta apagar a luz das estrelas.', baseLevel: 20, minLevel: 15, maxLevel: 30, stats: { maxHealth: 340, attack: 46, defense: 30, speed: 22 }, growth: GROWTH_R3, special: { name: 'Eclipse', power: 2.2 }, reward: { creatureXp: 0, energy: 0 } }),
];

export function getAdversaryById(id: string): AdversaryDefinition | undefined {
  return ADVERSARIES.find((a) => a.id === id);
}

export function getAdversariesByRegion(regionKey: string): AdversaryDefinition[] {
  return ADVERSARIES.filter((a) => a.regionKey === regionKey).sort((a, b) => a.order - b.order);
}
