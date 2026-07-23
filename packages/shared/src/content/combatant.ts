import type { AbilityDefinition } from '../ability';
import { computeBattlePower } from '../battlePower';
import { toBattleStats } from '../battle/stats';
import type { BattleAbility, Combatant } from '../battle/types';
import type { AttributeSet } from '../types';

/** Converte uma AbilityDefinition (conteúdo) na BattleAbility consumida pelo motor. */
export function abilityToBattleAbility(a: AbilityDefinition): BattleAbility {
  return {
    id: a.id,
    name: a.name,
    slot: a.slot,
    type: a.type,
    power: a.power,
    cooldown: a.cooldown,
    duration: a.duration,
  };
}

/**
 * Monta o Combatant do jogador a partir dos atributos atuais e do conjunto de
 * habilidades EQUIPADAS (já resolvidas). O perfil de comportamento do jogador é
 * ignorado pelo motor (o jogador escolhe as ações).
 */
export function creatureToCombatant(
  id: string,
  name: string,
  attributes: AttributeSet,
  abilities: readonly AbilityDefinition[],
): Combatant {
  return {
    id,
    name,
    stats: toBattleStats(attributes),
    abilities: abilities.map(abilityToBattleAbility),
    behaviorProfile: 'aggressive',
    isBoss: false,
  };
}

/** battlePower do Adari (referência do escalonamento de adversários). */
export function creatureBattlePower(
  attributes: AttributeSet,
  abilityCount: number,
  evolutionStage: number,
): number {
  return computeBattlePower(toBattleStats(attributes), abilityCount, evolutionStage);
}
