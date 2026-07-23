import {
  creatureBattlePower,
  creatureToCombatant,
  getAdversaryById,
  getCreatureByKey,
  resolveEquippedAbilities,
  scaleAdversary,
  vigorCostForBattle,
  type AdversaryDefinition,
  type BattleVigorKind,
  type Combatant,
} from '@ad-sidera/shared';
import { BRAND } from '../constants/brand';
import type { CreatureState } from '../db/models';

/** Habilidades equipadas resolvidas (salvas ou padrão do nível). */
export function equippedAbilityDefs(creature: CreatureState) {
  return resolveEquippedAbilities(creature.creatureKey, creature.level, creature.equippedAbilities);
}

/** Monta o Combatant do jogador a partir do Adari e das habilidades equipadas. */
export function playerCombatant(creature: CreatureState): Combatant {
  const definition = getCreatureByKey(creature.creatureKey);
  return creatureToCombatant(
    creature.id,
    creature.nickname ?? definition?.name ?? BRAND.companionSingular,
    creature.attributes,
    equippedAbilityDefs(creature),
  );
}

/** battlePower do Adari (referência do escalonamento do adversário). */
export function playerBattlePower(creature: CreatureState): number {
  return creatureBattlePower(
    creature.attributes,
    equippedAbilityDefs(creature).length,
    creature.evolutionStage,
  );
}

export interface EnemyBundle {
  combatant: Combatant;
  effectiveLevel: number;
  powerRatio: number;
}

/**
 * Monta o adversário ESCALADO para o Adari (nível efetivo limitado + faixa-alvo de
 * battlePower por dificuldade). Determinístico via seed.
 */
export function enemyCombatant(
  adversaryId: string,
  creature: CreatureState,
  seed: number,
): EnemyBundle | null {
  const adversary = getAdversaryById(adversaryId);
  if (!adversary) {
    return null;
  }
  const scaled = scaleAdversary(adversary, playerBattlePower(creature), creature.level, seed);
  return {
    combatant: scaled.combatant,
    effectiveLevel: scaled.effectiveLevel,
    powerRatio: scaled.powerRatio,
  };
}

/** Tipo de custo de Vigor conforme a dificuldade do adversário. */
export function vigorKindForAdversary(adversary: AdversaryDefinition): BattleVigorKind {
  switch (adversary.difficultyType) {
    case 'boss':
      return 'bossPve';
    case 'elite':
      return 'elitePve';
    default:
      return 'normalPve';
  }
}

export function vigorCostForAdversary(adversary: AdversaryDefinition): number {
  return vigorCostForBattle(vigorKindForAdversary(adversary));
}

/** Seed estável: retentar o mesmo adversário não rerrola o balanceamento. */
export function stableBattleSeed(adversaryId: string, creatureId: string): number {
  let hash = 0x811c9dc5;
  for (const char of `${creatureId}:${adversaryId}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 2147483647 || 1;
}
