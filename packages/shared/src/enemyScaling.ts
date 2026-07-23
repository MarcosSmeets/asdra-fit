import { computeBattlePower } from './battlePower';
import {
  BATTLE_POWER_WEIGHTS,
  DIFFICULTY_POWER_RANGE,
  ENEMY_SCALE_CLAMP,
} from './constants';
import type { BattleStats, Combatant } from './battle/types';
import { createRng } from './rng';
import type { AdversaryDefinition } from './content/types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface ScaledEnemy {
  combatant: Combatant;
  effectiveLevel: number;
  battlePower: number;
  /** Razão battlePower(inimigo)/battlePower(jogador) obtida. */
  powerRatio: number;
}

/**
 * Escalonamento HÍBRIDO: nível-base do adversário + crescimento limitado por nível,
 * ajustado para mirar a faixa-alvo de battlePower da sua dificuldade (comum 90–100%,
 * elite 105–112%, chefe 115–125% do battlePower do jogador). NUNCA copia o nível do
 * jogador — o nível efetivo é limitado a [minLevel, maxLevel]. Determinístico via seed.
 */
export function scaleAdversary(
  adversary: AdversaryDefinition,
  playerBattlePower: number,
  playerLevel: number,
  seed: number,
): ScaledEnemy {
  const effectiveLevel = clamp(playerLevel, adversary.minLevel, adversary.maxLevel);
  const levelsAbove = Math.max(0, effectiveLevel - adversary.baseLevel);
  const g = adversary.statGrowth;
  const grown: BattleStats = {
    maxHealth: adversary.baseStats.maxHealth + (g.maxHealth ?? 0) * levelsAbove,
    attack: adversary.baseStats.attack + (g.attack ?? 0) * levelsAbove,
    defense: adversary.baseStats.defense + (g.defense ?? 0) * levelsAbove,
    speed: adversary.baseStats.speed + (g.speed ?? 0) * levelsAbove,
  };

  // Alvo de potência dentro da faixa da dificuldade (determinístico dentro da faixa).
  const [lo, hi] = DIFFICULTY_POWER_RANGE[adversary.difficultyType];
  const t = createRng(seed >>> 0).next();
  const ratio = lo + (hi - lo) * t;
  const target = Math.max(1, playerBattlePower * ratio);

  // Resolve o fator k para acertar o alvo (a contribuição de habilidades é constante).
  const statPower = computeBattlePower(grown, 0, 0);
  const abilityConst = adversary.abilities.length * BATTLE_POWER_WEIGHTS.perAbility;
  let k = statPower > 0 ? (target - abilityConst) / statPower : 1;
  // Correção de curva entre regiões: nos níveis iniciais há menos recursos táticos;
  // nos avançados, quatro habilidades aumentam muito a contribuição não-estatística.
  const regionCurve = adversary.difficultyType === 'boss'
    ? adversary.regionKey === 'r1' ? 1.05 : adversary.regionKey === 'r3' ? 1.06 : 1
    : adversary.difficultyType === 'elite'
    ? adversary.regionKey === 'r1' ? 1.18 : adversary.regionKey === 'r3' ? 0.96 : 0.98
    : adversary.difficultyType === 'common' && adversary.regionKey === 'r1'
      ? 1.16
      : adversary.difficultyType === 'common' ? 1.08 : 1;
  k *= regionCurve;
  k = clamp(k, ENEMY_SCALE_CLAMP.MIN, ENEMY_SCALE_CLAMP.MAX);

  const shape = adversary.difficultyType === 'boss'
    ? { health: 1.2, attack: 0.86 }
    : adversary.difficultyType === 'elite'
      ? { health: 1.08, attack: 0.94 }
      : { health: 1, attack: 1 };
  const finalStats: BattleStats = {
    maxHealth: Math.max(1, Math.round(grown.maxHealth * k * shape.health)),
    attack: Math.max(1, Math.round(grown.attack * k * shape.attack)),
    defense: Math.max(0, Math.round(grown.defense * k)),
    speed: Math.max(1, Math.round(grown.speed * k)),
  };

  const battlePower = computeBattlePower(finalStats, adversary.abilities.length, 0);
  const combatant: Combatant = {
    id: adversary.id,
    name: adversary.name,
    stats: finalStats,
    abilities: adversary.abilities,
    behaviorProfile: adversary.behaviorProfile,
    isBoss: adversary.isBoss,
    boss: adversary.boss,
  };

  return {
    combatant,
    effectiveLevel,
    battlePower,
    powerRatio: playerBattlePower > 0 ? battlePower / playerBattlePower : 1,
  };
}
