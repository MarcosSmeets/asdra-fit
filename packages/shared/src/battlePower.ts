import { BATTLE_POWER_WEIGHTS } from './constants';
import type { BattleStats } from './battle/types';

/**
 * battlePower — soma ponderada de stats + habilidades + evolução. É a referência
 * do escalonamento de adversários (não o nível cru). Puro e determinístico.
 */
export function computeBattlePower(
  stats: BattleStats,
  abilityCount: number,
  evolutionStage: number,
): number {
  const w = BATTLE_POWER_WEIGHTS;
  return Math.round(
    stats.maxHealth * w.health +
      stats.attack * w.attack +
      stats.defense * w.defense +
      stats.speed * w.speed +
      Math.max(0, abilityCount) * w.perAbility +
      Math.max(0, evolutionStage) * w.perEvolutionStage,
  );
}
