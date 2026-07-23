import { ADVERSARIES, CREATURES } from '../content';
import { creatureToCombatant } from '../content/combatant';
import { resolveEquippedAbilities } from '../content/abilities';
import { computeBattlePower } from '../battlePower';
import { scaleAdversary } from '../enemyScaling';
import type { AttributeSet } from '../types';
import { simulateBattle } from './engine';
import type { BattleState, Combatant, PlannedAction } from './types';

const RUNS = 200;

function playerAtLevel(creatureKey: string, level: number): Combatant {
  const definition = CREATURES.find((item) => item.key === creatureKey)!;
  const attrs: AttributeSet = {
    ...definition.baseStats,
    [definition.affinity]: definition.baseStats[definition.affinity] + Math.max(0, level - 1),
    discipline: definition.baseStats.discipline + Math.floor(Math.max(0, level - 1) / 2),
  };
  return creatureToCombatant(
    `sim-${creatureKey}`,
    definition.name,
    attrs,
    resolveEquippedAbilities(creatureKey, level, []),
  );
}

function abilityBySlot(player: Combatant, slot: string) {
  return player.abilities.find((ability) => ability.slot === slot);
}

function usable(state: BattleState, id?: string): boolean {
  return Boolean(id && (state.player.cooldowns[id] ?? 0) <= 0);
}

function basicPolicy(player: Combatant): () => PlannedAction {
  const basic = abilityBySlot(player, 'basicAttack')!;
  return () => ({ type: 'ability', abilityId: basic.id });
}

function strategyPolicy(player: Combatant): (state: BattleState) => PlannedAction {
  const basic = abilityBySlot(player, 'basicAttack')!;
  const defense = abilityBySlot(player, 'basicDefense');
  const special = abilityBySlot(player, 'special');
  const tactical = abilityBySlot(player, 'tactical');
  return (state) => {
    if (state.enemy.charging && usable(state, defense?.id)) {
      return { type: 'ability', abilityId: defense!.id };
    }
    const healthFraction = state.player.health / player.stats.maxHealth;
    if (tactical && usable(state, tactical.id)) {
      if (tactical.type === 'heal' && healthFraction < 0.65) return { type: 'ability', abilityId: tactical.id };
      if (tactical.type === 'shield' && state.player.shield === 0) return { type: 'ability', abilityId: tactical.id };
      if (tactical.type === 'buff' && !state.player.effects.some((effect) => effect.type === 'buff')) {
        return { type: 'ability', abilityId: tactical.id };
      }
    }
    if (special && usable(state, special.id)) return { type: 'ability', abilityId: special.id };
    return { type: 'ability', abilityId: basic.id };
  };
}

interface Metric { wins: number; turns: number; }

function simulate(adversaryId: string, strategy: boolean): Metric {
  const adversary = ADVERSARIES.find((item) => item.id === adversaryId)!;
  let wins = 0;
  let turns = 0;
  for (const creature of CREATURES) {
    const player = playerAtLevel(creature.key, adversary.baseLevel);
    const playerPower = computeBattlePower(player.stats, player.abilities.length, 0);
    for (let seed = 1; seed <= RUNS; seed += 1) {
      const enemy = scaleAdversary(adversary, playerPower, adversary.baseLevel, seed).combatant;
      const result = simulateBattle(
        { player, enemy, seed },
        strategy ? strategyPolicy(player) : basicPolicy(player),
      );
      if (result.status === 'victory') wins += 1;
      turns += result.round;
    }
  }
  const total = RUNS * CREATURES.length;
  return { wins: wins / total, turns: turns / total };
}

describe('simulação de balanceamento — 200 seeds por adversário', () => {
  it('mantém RNG pequeno e estratégia materialmente superior nos chefes', () => {
    const metrics = ADVERSARIES.map((adversary) => {
      const basic = simulate(adversary.id, false);
      const strategy = simulate(adversary.id, true);
      return { id: adversary.id, difficulty: adversary.difficultyType, basic, strategy };
    });
    const bosses = metrics.filter((metric) => metric.difficulty === 'boss');
    console.info(JSON.stringify(metrics));
    for (const boss of bosses) {
      expect(boss.basic.wins).toBeLessThan(0.2);
      expect(boss.strategy.wins).toBeGreaterThanOrEqual(0.55);
      expect(boss.strategy.wins).toBeLessThanOrEqual(0.75);
      expect(boss.strategy.turns).toBeGreaterThanOrEqual(7);
      expect(boss.strategy.turns).toBeLessThanOrEqual(15);
    }
    const nonBosses = metrics.filter((metric) => metric.difficulty !== 'boss');
    expect(nonBosses.every((metric) => metric.strategy.wins >= metric.basic.wins)).toBe(true);
    const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    const commonRate = average(metrics.filter((metric) => metric.difficulty === 'common').map((metric) => metric.strategy.wins));
    const eliteRate = average(metrics.filter((metric) => metric.difficulty === 'elite').map((metric) => metric.strategy.wins));
    expect(commonRate).toBeGreaterThanOrEqual(0.75);
    expect(commonRate).toBeLessThanOrEqual(0.9);
    expect(eliteRate).toBeGreaterThanOrEqual(0.55);
    expect(eliteRate).toBeLessThanOrEqual(0.75);
    // Mantém os dados visíveis no output da validação sem emitir centenas de linhas.
  });
});
