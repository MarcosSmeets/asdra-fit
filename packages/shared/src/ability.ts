import { ABILITY_CONTENT_VERSION } from '@ad-sidera/config';

/**
 * Habilidades dos Adaris — tipos e regras (fonte única). O conteúdo (nomes/efeitos)
 * vive em `content/abilities.ts`. O motor de batalha (Fase 5) consome estas definições
 * com recarga por turno (sem energia em combate).
 */
export type AbilityType =
  | 'damage'
  | 'defense'
  | 'shield'
  | 'heal'
  | 'buff'
  | 'debuff'
  | 'control'
  | 'counter'
  | 'damageOverTime'
  | 'cooldownReduction';

/** Categoria/slot da habilidade — define desbloqueio e recarga. */
export type AbilitySlot = 'basicAttack' | 'basicDefense' | 'special' | 'tactical';

/** Máximo de habilidades equipadas simultaneamente. */
export const MAX_EQUIPPED_ABILITIES = 4;

/** Recarga (em turnos) por categoria. Básico 0, defesa 1, especial 2, tática 3. */
export const ABILITY_SLOT_COOLDOWN: Record<AbilitySlot, number> = {
  basicAttack: 0,
  basicDefense: 1,
  special: 2,
  tactical: 3,
};

/** Nível de desbloqueio por categoria. */
export const ABILITY_SLOT_UNLOCK_LEVEL: Record<AbilitySlot, number> = {
  basicAttack: 1,
  basicDefense: 1,
  special: 4,
  tactical: 7,
};

export interface AbilityDefinition {
  id: string;
  /** Chave interna do Adari (terravok | lumora | solivar). */
  creatureKey: string;
  slot: AbilitySlot;
  /** Nome original (sem semelhança com IP existente). */
  name: string;
  description: string;
  type: AbilityType;
  /** Nível a partir do qual fica disponível. */
  unlockLevel: number;
  /** Recarga em turnos (0 = utilizável todo turno). */
  cooldown: number;
  /** Escalar do efeito (multiplicador de dano, fração de mitigação/cura, etc.). */
  power: number;
  /** Duração em turnos de efeitos persistentes (buff/debuff/dot/shield). 0 = instantâneo. */
  duration: number;
  contentVersion: number;
}

/** Tipos considerados DEFENSIVOS (todo conjunto equipado precisa de ≥1). */
export function isDefensiveType(type: AbilityType): boolean {
  return type === 'defense' || type === 'shield';
}

export function isDefensiveAbility(ability: AbilityDefinition): boolean {
  return ability.slot === 'basicDefense' || isDefensiveType(ability.type);
}

export interface EquipValidation {
  valid: boolean;
  reason?:
    | 'empty'
    | 'too_many'
    | 'unknown_ability'
    | 'not_owned'
    | 'locked'
    | 'duplicate'
    | 'missing_basic_attack'
    | 'missing_defense';
  message?: string;
}

/**
 * Valida um conjunto equipado. Regras: 1..MAX ids; sem duplicatas; todas do Adari e
 * desbloqueadas no nível atual; sempre inclui o ATAQUE BÁSICO e ao menos UMA defensiva.
 */
export function validateEquippedSet(
  abilities: readonly AbilityDefinition[],
  level: number,
  equippedIds: readonly string[],
): EquipValidation {
  if (equippedIds.length === 0) {
    return { valid: false, reason: 'empty', message: 'Equipe ao menos uma habilidade.' };
  }
  if (equippedIds.length > MAX_EQUIPPED_ABILITIES) {
    return {
      valid: false,
      reason: 'too_many',
      message: `No máximo ${MAX_EQUIPPED_ABILITIES} habilidades equipadas.`,
    };
  }
  if (new Set(equippedIds).size !== equippedIds.length) {
    return { valid: false, reason: 'duplicate', message: 'Habilidade repetida no conjunto.' };
  }

  const byId = new Map(abilities.map((a) => [a.id, a]));
  const equipped: AbilityDefinition[] = [];
  for (const id of equippedIds) {
    const ability = byId.get(id);
    if (!ability) {
      return { valid: false, reason: 'unknown_ability', message: 'Habilidade desconhecida.' };
    }
    if (ability.unlockLevel > level) {
      return {
        valid: false,
        reason: 'locked',
        message: `${ability.name} ainda está bloqueada (nível ${ability.unlockLevel}).`,
      };
    }
    equipped.push(ability);
  }

  if (!equipped.some((a) => a.slot === 'basicAttack')) {
    return {
      valid: false,
      reason: 'missing_basic_attack',
      message: 'O ataque básico deve estar sempre equipado.',
    };
  }
  if (!equipped.some((a) => isDefensiveAbility(a))) {
    return {
      valid: false,
      reason: 'missing_defense',
      message: 'Equipe ao menos uma habilidade defensiva.',
    };
  }
  return { valid: true };
}

/** Marca de versão do conteúdo de habilidades (para gravar em cálculos/sync). */
export const ABILITY_VERSION = ABILITY_CONTENT_VERSION;
