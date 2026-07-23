import { chooseEnemyAction } from './battle/ai';
import { initBattle, resolveRound } from './battle/engine';
import type { BattleStats, Combatant } from './battle/types';
import { computeBattlePower } from './battlePower';
import { BATTLE_POWER_WEIGHTS } from './constants';
import { createRng } from './rng';

/**
 * Duelos amistosos entre membros da mesma liga (assíncronos, MVP).
 *
 * Princípios: NÃO concedem XP/atributos e não afetam liga/campanha/streak/energia.
 * São server-authoritative (exigem conexão) e determinísticos (mesma seed + snapshots
 * → mesmo resultado, re-simulável). "Duelo equilibrado" (padrão): normalização parcial
 * de nível que preserva arquétipo (proporções de stats) e habilidades.
 */

const MAX_DUEL_ROUNDS = 60;

function scaleStatsToPower(
  stats: BattleStats,
  abilityCount: number,
  targetPower: number,
): BattleStats {
  const statPower = computeBattlePower(stats, 0, 0);
  const abilityConst = abilityCount * BATTLE_POWER_WEIGHTS.perAbility;
  const raw = statPower > 0 ? (targetPower - abilityConst) / statPower : 1;
  const k = Math.max(0.3, Math.min(3, raw));
  return {
    maxHealth: Math.max(1, Math.round(stats.maxHealth * k)),
    attack: Math.max(1, Math.round(stats.attack * k)),
    defense: Math.max(0, Math.round(stats.defense * k)),
    speed: Math.max(1, Math.round(stats.speed * k)),
  };
}

/**
 * Normaliza dois combatentes ao MESMO battlePower (média dos dois), preservando as
 * proporções de stats (arquétipo) e as habilidades. Habilidades bloqueadas devem ter
 * sido excluídas do conjunto ANTES (o snapshot só inclui as desbloqueadas).
 */
export function normalizeDuel(
  challenger: Combatant,
  opponent: Combatant,
): { challenger: Combatant; opponent: Combatant } {
  const pc = computeBattlePower(challenger.stats, challenger.abilities.length, 0);
  const po = computeBattlePower(opponent.stats, opponent.abilities.length, 0);
  const target = Math.round((pc + po) / 2);
  return {
    challenger: {
      ...challenger,
      stats: scaleStatsToPower(challenger.stats, challenger.abilities.length, target),
    },
    opponent: {
      ...opponent,
      stats: scaleStatsToPower(opponent.stats, opponent.abilities.length, target),
    },
  };
}

export type DuelWinner = 'challenger' | 'opponent' | 'draw';

export interface DuelOutcome {
  winner: DuelWinner;
  rounds: number;
  challengerHealth: number;
  opponentHealth: number;
  seed: number;
}

/**
 * Simula o duelo completo de forma determinística. Ambos os lados são conduzidos por
 * IA (o desafiante pelo seu perfil; o oponente offline por um perfil DEFENSIVO). O
 * resultado é re-simulável no servidor com a mesma seed + snapshots.
 */
export function simulateDuel(
  challenger: Combatant,
  opponent: Combatant,
  seed: number,
  options: { normalize?: boolean } = { normalize: true },
): DuelOutcome {
  const pair = options.normalize ? normalizeDuel(challenger, opponent) : { challenger, opponent };
  const player = pair.challenger;
  const enemy = pair.opponent;

  let state = initBattle({ player, enemy, seed });
  let guard = 0;
  while (state.status === 'ongoing' && guard < MAX_DUEL_ROUNDS + 1) {
    const tiebreak = createRng((seed + state.round * 0x9e3779b9) >>> 0).next();
    const action = chooseEnemyAction({
      enemy: player,
      state: state.player,
      playerHealthFraction: enemy.stats.maxHealth > 0 ? state.enemy.health / enemy.stats.maxHealth : 1,
      tiebreak,
      round: state.round + 1,
    });
    state = resolveRound(state, action, { player, enemy });
    guard += 1;
  }

  const winner: DuelWinner =
    state.status === 'victory' ? 'challenger' : state.status === 'defeat' ? 'opponent' : 'draw';

  return {
    winner,
    rounds: state.round,
    challengerHealth: state.player.health,
    opponentHealth: state.enemy.health,
    seed,
  };
}
