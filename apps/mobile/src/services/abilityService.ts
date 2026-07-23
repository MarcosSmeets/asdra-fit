import {
  abilitiesForCreature,
  defaultEquippedAbilityIds,
  validateEquippedSet,
  type AbilityDefinition,
} from '@ad-sidera/shared';
import { getDatabase } from '../db/database';
import type { CreatureState } from '../db/models';
import { creatureRepository } from '../db/repositories/creatureRepository';
import { nowIso } from '../utils/datetime';
import { getCreature } from './creatureService';
import { enqueueOperation } from './outbox';
import { creatureSyncPayload } from './syncPayloads';

export interface AbilityView {
  ability: AbilityDefinition;
  unlocked: boolean;
  equipped: boolean;
  /** Ordem no conjunto equipado (1-based), ou null se não equipada. */
  equippedOrder: number | null;
}

export interface AbilitiesState {
  creatureKey: string;
  creatureName: string;
  level: number;
  abilities: AbilityView[];
  /** IDs equipados resolvidos (usa o padrão do nível quando nada foi salvo). */
  equippedIds: string[];
}

/** Resolve os IDs equipados: usa o padrão do nível quando o Adari nada tem salvo. */
export function resolveEquippedIds(creature: CreatureState): string[] {
  const unlocked = new Set(
    abilitiesForCreature(creature.creatureKey)
      .filter((a) => a.unlockLevel <= creature.level)
      .map((a) => a.id),
  );
  const saved = creature.equippedAbilities.filter((id) => unlocked.has(id));
  if (saved.length > 0) {
    return saved;
  }
  return defaultEquippedAbilityIds(creature.creatureKey, creature.level);
}

function buildState(creature: CreatureState, creatureName: string): AbilitiesState {
  const equippedIds = resolveEquippedIds(creature);
  const orderById = new Map(equippedIds.map((id, i) => [id, i + 1]));
  const abilities = abilitiesForCreature(creature.creatureKey).map<AbilityView>((ability) => ({
    ability,
    unlocked: ability.unlockLevel <= creature.level,
    equipped: orderById.has(ability.id),
    equippedOrder: orderById.get(ability.id) ?? null,
  }));
  return {
    creatureKey: creature.creatureKey,
    creatureName,
    level: creature.level,
    abilities,
    equippedIds,
  };
}

export async function getAbilitiesState(): Promise<AbilitiesState | null> {
  const creature = await getCreature();
  if (!creature) {
    return null;
  }
  return buildState(creature, creature.nickname ?? creature.creatureKey);
}

/**
 * Define o conjunto equipado (equipar/reordenar). Valida (máx 4, ataque básico
 * sempre, ≥1 defensiva, tudo desbloqueado), persiste localmente e enfileira sync.
 * Lança Error com mensagem amigável se o conjunto for inválido.
 */
export async function setEquippedAbilities(ids: string[]): Promise<AbilitiesState> {
  const db = await getDatabase();
  const creature = await getCreature();
  if (!creature) {
    throw new Error('Adari não encontrado.');
  }

  const abilities = abilitiesForCreature(creature.creatureKey);
  const validation = validateEquippedSet(abilities, creature.level, ids);
  if (!validation.valid) {
    throw new Error(validation.message ?? 'Conjunto de habilidades inválido.');
  }

  const now = nowIso();
  const updated: CreatureState = {
    ...creature,
    equippedAbilities: ids,
    updatedAt: now,
    syncStatus: 'pending',
  };
  await creatureRepository.update(db, updated);
  await enqueueOperation(db, {
    entityType: 'user_creature',
    entityId: updated.id,
    operationType: 'upsert',
    updatedAt: now,
    payload: creatureSyncPayload(updated),
  });

  return buildState(updated, updated.nickname ?? updated.creatureKey);
}
