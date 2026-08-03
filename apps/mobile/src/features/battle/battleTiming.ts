import { adariMotionFor } from '../my-adari/animationCatalog';
import type { BattleAnimationPhase } from './actionSequence';

/**
 * Durações da encenação de um turno, num lugar só.
 *
 * Antes eram números mágicos espalhados pela tela de batalha, e por isso
 * desalinharam do catálogo de animação: a fase de ataque durava 110ms enquanto a
 * animação de ataque do Adari leva ~640ms, então ela era cortada no meio e o
 * jogador não percebia que tinha atacado.
 *
 * A regra aqui é simples: as fases anteriores ao impacto precisam somar pelo menos
 * a duração da animação que estão encenando. `battleTiming.test.ts` trava isso.
 */

/** Quanto o inimigo leva para percorrer a sequência de ataque (4 frames a 150ms). */
const ENEMY_ATTACK_ANIMATION_MS = 600;

export const BATTLE_TIMING = {
  /** Sobra depois do impacto para a reação de dano terminar de tocar. */
  targetReactionMs: 520,
  returningMs: 240,
  /** Tempo mínimo para ler "{Nome} usou {Habilidade}" antes do próximo beat. */
  announcementHoldMs: 900,
  /** Respiro antes de liberar a tela de vitória/derrota. */
  outcomeHoldMs: 700,
  /** Um pouco mais quando o último golpe foi fatal: o desfecho merece ser visto. */
  fatalOutcomeHoldMs: 1100,
} as const;

type PhaseDurations = Record<BattleAnimationPhase, number>;

/**
 * Distribui o orçamento de tempo entre as fases de um ator.
 *
 * O ator define de qual animação vem o orçamento pré-impacto: o Adari usa o
 * catálogo (atacando ~640ms, defendendo ~960ms), o inimigo usa a própria
 * sequência de frames do atlas.
 */
export function phaseDurations(
  actor: 'player' | 'enemy',
  intent: 'attack' | 'guard' = 'attack',
): PhaseDurations {
  const budget = actor === 'player' ? playerApproachBudget(intent) : ENEMY_ATTACK_ANIMATION_MS;
  // 28/34/38: a aproximação acelera até o golpe, em vez de três fatias iguais.
  return {
    preparing: Math.round(budget * 0.28),
    advancing: Math.round(budget * 0.34),
    attacking: Math.round(budget * 0.38),
    impact: 220,
    targetReaction: BATTLE_TIMING.targetReactionMs,
    returning: BATTLE_TIMING.returningMs,
  };
}

function playerApproachBudget(intent: 'attack' | 'guard'): number {
  const motion = adariMotionFor(intent === 'guard' ? 'defending' : 'attacking');
  // A animação começa junto com a fase `preparing`, então o orçamento tem que
  // cobrir antecipação + ação + retorno para não ser interrompida no meio.
  return motion.anticipationMs + motion.actionMs + motion.returnMs;
}

/** Soma das fases anteriores ao impacto — o que a animação de aproximação tem. */
export function approachDurationMs(
  actor: 'player' | 'enemy',
  intent: 'attack' | 'guard' = 'attack',
): number {
  const durations = phaseDurations(actor, intent);
  return durations.preparing + durations.advancing + durations.attacking;
}
