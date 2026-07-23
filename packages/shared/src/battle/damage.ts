import { BATTLE } from '../constants';

/**
 * Serviço de dano PURO e determinístico. Considera ataque, potência da habilidade,
 * defesa do alvo, buffs/debuffs, postura de guarda, escudo (aplicado fora daqui),
 * resistência/fraqueza temporária, crítico limitado e variância pequena com seed.
 *
 * Fórmula base:
 *   bruto = ataque × potência × buffAtaque − defesa × DEFENSE_FACTOR × debuffDefesa
 *   dano  = max(MIN, round(bruto × variância × resistência × (crít) × (guarda)))
 */
export interface DamageInput {
  attackerAttack: number;
  abilityPower: number;
  defenderDefense: number;
  /** Multiplicador de ataque do atacante por buffs (1 = neutro). */
  attackerBuffMultiplier?: number;
  /** Multiplicador da defesa do alvo por debuffs (1 = neutro; <1 = defesa reduzida). */
  defenderDefenseMultiplier?: number;
  /** Alvo em postura defensiva? */
  guarding?: boolean;
  /** Resistência/fraqueza temporária do alvo (1 = neutro; <1 resiste; >1 é fraqueza). */
  resistanceMultiplier?: number;
  /** Variância determinística já sorteada em [1-V, 1+V]. */
  variance: number;
  /** Golpe crítico? */
  crit?: boolean;
}

export function computeDamage(input: DamageInput): number {
  const attackBuff = input.attackerBuffMultiplier ?? 1;
  const defenseDebuff = input.defenderDefenseMultiplier ?? 1;
  const resistance = input.resistanceMultiplier ?? 1;

  const raw =
    input.attackerAttack * input.abilityPower * attackBuff -
    input.defenderDefense * BATTLE.DEFENSE_FACTOR * defenseDebuff;

  let dmg = raw * input.variance * resistance;
  if (input.crit) {
    dmg *= BATTLE.CRIT_MULTIPLIER;
  }
  if (input.guarding) {
    dmg *= BATTLE.DEFEND_MITIGATION;
  }
  return Math.max(BATTLE.MIN_DAMAGE, Math.round(dmg));
}

export function estimateDamageRange(
  input: Omit<DamageInput, 'variance' | 'crit'>,
): { min: number; max: number } {
  return {
    min: computeDamage({ ...input, variance: 1 - BATTLE.VARIANCE, crit: false }),
    max: computeDamage({ ...input, variance: 1 + BATTLE.VARIANCE, crit: false }),
  };
}

/** Aplica dano a (escudo, vida): o escudo absorve primeiro. */
export function applyDamageToPool(
  health: number,
  shield: number,
  damage: number,
): { health: number; shield: number; absorbed: number } {
  const absorbed = Math.min(shield, damage);
  const remaining = damage - absorbed;
  return {
    shield: shield - absorbed,
    health: Math.max(0, health - remaining),
    absorbed,
  };
}
