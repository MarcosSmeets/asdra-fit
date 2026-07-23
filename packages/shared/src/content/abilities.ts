import { ABILITY_CONTENT_VERSION } from '@ad-sidera/config';
import {
  ABILITY_SLOT_COOLDOWN,
  ABILITY_SLOT_UNLOCK_LEVEL,
  type AbilityDefinition,
  type AbilitySlot,
  type AbilityType,
} from '../ability';

function ability(
  creatureKey: string,
  slot: AbilitySlot,
  name: string,
  description: string,
  type: AbilityType,
  power: number,
  duration: number,
): AbilityDefinition {
  return {
    id: `${creatureKey}-${slot}`,
    creatureKey,
    slot,
    name,
    description,
    type,
    unlockLevel: ABILITY_SLOT_UNLOCK_LEVEL[slot],
    cooldown: ABILITY_SLOT_COOLDOWN[slot],
    power,
    duration,
    contentVersion: ABILITY_CONTENT_VERSION,
  };
}

/**
 * 12 habilidades (3 Adaris × 4 slots), 100% originais. Progressão:
 * - L1: ataque básico (dano) + defesa básica.
 * - L4: especial do arquétipo (recarga 2).
 * - L7: tática do arquétipo (recarga 3).
 * - L10+: melhorias (mais potência, NÃO novos botões).
 */
export const ABILITIES: readonly AbilityDefinition[] = [
  // Brontu (força) — golpe sólido e muralhas.
  ability('terravok', 'basicAttack', 'Impacto', 'Um golpe sólido e confiável.', 'damage', 1, 0),
  ability(
    'terravok',
    'basicDefense',
    'Guarda de Âmbar',
    'Assume uma postura firme, reduzindo o próximo dano recebido.',
    'defense',
    0.7,
    1,
  ),
  ability(
    'terravok',
    'special',
    'Investida Estelar',
    'Concentra a força acumulada em uma investida devastadora.',
    'damage',
    1.8,
    0,
  ),
  ability(
    'terravok',
    'tactical',
    'Muralha Celeste',
    'Ergue uma barreira estelar que absorve dano por alguns turnos.',
    'shield',
    0.6,
    2,
  ),

  // Velune (resistência) — bruma persistente e fôlego incansável.
  ability('lumora', 'basicAttack', 'Brasa', 'Uma chama constante e persistente.', 'damage', 1, 0),
  ability(
    'lumora',
    'basicDefense',
    'Véu de Brasa',
    'Envolve-se em brasas suaves que amortecem o próximo golpe.',
    'defense',
    0.7,
    1,
  ),
  ability(
    'lumora',
    'special',
    'Corrente de Bruma',
    'Libera uma bruma corrosiva que causa dano contínuo ao adversário.',
    'damageOverTime',
    0.7,
    3,
  ),
  ability(
    'lumora',
    'tactical',
    'Passo Incansável',
    'Encontra o ritmo perfeito, aumentando ataque e ímpeto por alguns turnos.',
    'buff',
    0.25,
    3,
  ),

  // Myrin (equilíbrio) — harmonia e reequilíbrio.
  ability('solivar', 'basicAttack', 'Lampejo', 'Um golpe ágil e preciso.', 'damage', 1, 0),
  ability(
    'solivar',
    'basicDefense',
    'Guarda Estelar',
    'Alinha-se às constelações para desviar parte do próximo golpe.',
    'defense',
    0.5,
    1,
  ),
  ability(
    'solivar',
    'special',
    'Pulso Harmônico',
    'Sincroniza movimento e foco em um golpe equilibrado e certeiro.',
    'damage',
    1.6,
    0,
  ),
  ability(
    'solivar',
    'tactical',
    'Equilíbrio Solar',
    'Reequilibra corpo e espírito, restaurando parte da vida.',
    'heal',
    0.25,
    0,
  ),
];

const BY_CREATURE = new Map<string, AbilityDefinition[]>();
for (const a of ABILITIES) {
  const list = BY_CREATURE.get(a.creatureKey) ?? [];
  list.push(a);
  BY_CREATURE.set(a.creatureKey, list);
}

const SLOT_ORDER: Record<AbilitySlot, number> = {
  basicAttack: 0,
  basicDefense: 1,
  special: 2,
  tactical: 3,
};

/** Todas as 4 habilidades de um Adari (ordenadas por slot). */
export function abilitiesForCreature(creatureKey: string): AbilityDefinition[] {
  const list = BY_CREATURE.get(creatureKey) ?? [];
  return [...list].sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]);
}

/** Habilidades DESBLOQUEADAS no nível informado. */
export function unlockedAbilities(creatureKey: string, level: number): AbilityDefinition[] {
  return abilitiesForCreature(creatureKey).filter((a) => a.unlockLevel <= level);
}

/** Conjunto equipado padrão: todas as desbloqueadas (até o máximo), ordem de slot. */
export function defaultEquippedAbilityIds(creatureKey: string, level: number): string[] {
  return unlockedAbilities(creatureKey, level).map((a) => a.id);
}

/**
 * Resolve as habilidades equipadas: usa o conjunto salvo (filtrando por desbloqueio)
 * ou, se vazio/inválido, o conjunto padrão do nível. Fonte única para app e motor.
 */
export function resolveEquippedAbilities(
  creatureKey: string,
  level: number,
  savedIds: readonly string[],
): AbilityDefinition[] {
  const unlocked = unlockedAbilities(creatureKey, level);
  const byId = new Map(unlocked.map((a) => [a.id, a]));
  const saved = savedIds.filter((id) => byId.has(id));
  const ids = saved.length > 0 ? saved : unlocked.map((a) => a.id);
  return ids.map((id) => byId.get(id)).filter((a): a is AbilityDefinition => Boolean(a));
}

export function getAbilityById(id: string): AbilityDefinition | undefined {
  return ABILITIES.find((a) => a.id === id);
}
