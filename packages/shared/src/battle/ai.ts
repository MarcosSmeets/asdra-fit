import type { BattleAbility, Combatant, CombatantState, PlannedAction } from './types';

/**
 * IA de adversário — determinística e por PERFIL. Nunca lê a ação FUTURA do jogador
 * (só o estado visível atual). Um valor de RNG entra apenas como desempate estável.
 */

function availableAbilities(enemy: Combatant, state: CombatantState): BattleAbility[] {
  return enemy.abilities.filter((a) => (state.cooldowns[a.id] ?? 0) <= 0);
}

function strongestDamage(abilities: BattleAbility[]): BattleAbility | undefined {
  return abilities
    .filter((a) => a.type === 'damage' || a.type === 'damageOverTime')
    .sort((a, b) => b.power - a.power)[0];
}

function firstOfTypes(abilities: BattleAbility[], types: BattleAbility['type'][]): BattleAbility | undefined {
  return abilities.find((a) => types.includes(a.type));
}

function act(ability: BattleAbility | undefined, fallback: BattleAbility): PlannedAction {
  return { type: 'ability', abilityId: (ability ?? fallback).id };
}

export interface EnemyDecisionContext {
  enemy: Combatant;
  state: CombatantState;
  /** Fração de vida do jogador [0,1] (estado atual — nunca a ação futura). */
  playerHealthFraction: number;
  /** Desempate determinístico em [0,1). */
  tiebreak: number;
  /** Turno visível atual; guia padrões, sem ler a escolha futura do jogador. */
  round: number;
}

/**
 * Escolhe a ação do adversário conforme o perfil. Sempre há um fallback: o ataque
 * básico (primeira habilidade), garantindo uma ação válida.
 */
export function chooseEnemyAction(ctx: EnemyDecisionContext): PlannedAction {
  const { enemy, state, playerHealthFraction } = ctx;
  const available = availableAbilities(enemy, state);
  const basic = enemy.abilities.find((a) => a.slot === 'basicAttack') ?? enemy.abilities[0];
  if (!basic) {
    // Combatente sem habilidades (não deveria acontecer): sinaliza ação nula segura.
    return { type: 'ability', abilityId: 'none' };
  }
  const availableBasic = available.find((a) => a.id === basic.id) ?? basic;
  const healthFraction = enemy.stats.maxHealth > 0 ? state.health / enemy.stats.maxHealth : 1;

  switch (enemy.behaviorProfile) {
    case 'aggressive':
      return act(ctx.round % 4 === 0 ? strongestDamage(available) : availableBasic, availableBasic);

    case 'defensive': {
      if (healthFraction < 0.4) {
        const guard = firstOfTypes(available, ['heal', 'shield', 'defense']);
        if (guard) {
          return act(guard, availableBasic);
        }
      }
      return act(strongestDamage(available) ?? availableBasic, availableBasic);
    }

    case 'support': {
      if (healthFraction < 0.5) {
        const relief = firstOfTypes(available, ['heal', 'shield']);
        if (relief) {
          return act(relief, availableBasic);
        }
      }
      const hasBuff = state.effects.some((e) => e.type === 'buff');
      const buff = hasBuff ? undefined : firstOfTypes(available, ['buff']);
      if (buff) {
        return act(buff, availableBasic);
      }
      return act(strongestDamage(available) ?? availableBasic, availableBasic);
    }

    case 'adaptive': {
      if (ctx.round % 3 === 0) {
        const guard = firstOfTypes(available, ['defense', 'shield']);
        if (guard) return act(guard, availableBasic);
      }
      if (healthFraction < 0.35) {
        const relief = firstOfTypes(available, ['heal', 'shield', 'defense']);
        if (relief) {
          return act(relief, availableBasic);
        }
      }
      if (playerHealthFraction < 0.35) {
        return act(strongestDamage(available) ?? availableBasic, availableBasic);
      }
      // Alterna entre golpe forte e ataque básico, de forma estável.
      const strong = strongestDamage(available);
      const useStrong = ctx.round % 4 === 0 && strong;
      return act(useStrong ? strong : availableBasic, availableBasic);
    }

    case 'bossPattern':
    default: {
      // O pico de dano do chefe é sempre o golpe anunciado. Fora da carga ele usa
      // um padrão legível, sem esconder outro especial decisivo atrás da IA.
      const debuff = firstOfTypes(available, ['debuff', 'control']);
      if (debuff && ctx.round % 4 === 2) {
        return act(debuff, availableBasic);
      }
      return act(availableBasic, availableBasic);
    }
  }
}
