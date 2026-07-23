import type { AttributeSet } from '@ad-sidera/shared';
import type { CreatureState } from '../models';
import type { SqlDatabase, SqlValue } from '../types';

interface CreatureRow {
  id: string;
  creature_key: string;
  nickname: string | null;
  level: number;
  xp: number;
  evolution_stage: number;
  strength: number;
  endurance: number;
  agility: number;
  discipline: number;
  recovery: number;
  spirit: number;
  health: number;
  energy: number;
  max_vigor: number | null;
  vigor_recovery_rate: number | null;
  last_vigor_calculation_at: string | null;
  bond: number | null;
  satiety: number | null;
  last_satiety_calculation_at: string | null;
  active_behavior_state: string | null;
  last_interaction_at: string | null;
  equipped_abilities: string | null;
  defeated_milestones: string;
  total_activities: number;
  updated_at: string;
  sync_status: string;
}

function toState(row: CreatureRow): CreatureState {
  const attributes: AttributeSet = {
    strength: row.strength,
    endurance: row.endurance,
    agility: row.agility,
    discipline: row.discipline,
    recovery: row.recovery,
    spirit: row.spirit,
    health: row.health,
    energy: row.energy,
  };
  return {
    id: row.id,
    creatureKey: row.creature_key,
    nickname: row.nickname,
    level: row.level,
    xp: row.xp,
    evolutionStage: row.evolution_stage,
    attributes,
    maxVigor: row.max_vigor ?? 100,
    vigorRecoveryRate: row.vigor_recovery_rate ?? 5,
    lastVigorCalculationAt: row.last_vigor_calculation_at ?? row.updated_at,
    bond: row.bond ?? 0,
    satiety: row.satiety ?? 60,
    lastSatietyCalculationAt: row.last_satiety_calculation_at ?? row.updated_at,
    activeBehaviorState: (row.active_behavior_state ?? 'idle') as CreatureState['activeBehaviorState'],
    lastInteractionAt: row.last_interaction_at,
    equippedAbilities: row.equipped_abilities
      ? (JSON.parse(row.equipped_abilities) as string[])
      : [],
    defeatedMilestones: JSON.parse(row.defeated_milestones) as string[],
    totalActivities: row.total_activities,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status as CreatureState['syncStatus'],
  };
}

export const creatureRepository = {
  async get(db: SqlDatabase): Promise<CreatureState | null> {
    const row = await db.getFirstAsync<CreatureRow>('SELECT * FROM user_creature LIMIT 1');
    return row ? toState(row) : null;
  },

  async create(db: SqlDatabase, creature: CreatureState, nowIso: string): Promise<void> {
    const a = creature.attributes;
    await db.runAsync(
      `INSERT INTO user_creature
       (id, creature_key, nickname, level, xp, evolution_stage, strength, endurance, agility,
        discipline, recovery, spirit, health, energy, max_vigor, vigor_recovery_rate,
        last_vigor_calculation_at, bond, satiety, last_satiety_calculation_at,
        active_behavior_state, last_interaction_at, equipped_abilities, defeated_milestones,
        total_activities, created_at, updated_at, sync_status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        creature.id,
        creature.creatureKey,
        creature.nickname,
        creature.level,
        creature.xp,
        creature.evolutionStage,
        a.strength,
        a.endurance,
        a.agility,
        a.discipline,
        a.recovery,
        a.spirit,
        a.health,
        a.energy,
        creature.maxVigor,
        creature.vigorRecoveryRate,
        creature.lastVigorCalculationAt,
        creature.bond,
        creature.satiety,
        creature.lastSatietyCalculationAt,
        creature.activeBehaviorState,
        creature.lastInteractionAt,
        JSON.stringify(creature.equippedAbilities),
        JSON.stringify(creature.defeatedMilestones),
        creature.totalActivities,
        nowIso,
        creature.updatedAt,
        creature.syncStatus,
      ] as SqlValue[],
    );
  },

  async upsertFromServer(db: SqlDatabase, creature: CreatureState): Promise<void> {
    const current = await this.get(db);
    if (current && current.id !== creature.id) {
      throw new Error('LOCAL_PROFILE_ACCOUNT_CONFLICT');
    }
    if (current) {
      await this.update(db, creature);
    } else {
      await this.create(db, creature, creature.updatedAt);
    }
  },

  async update(db: SqlDatabase, creature: CreatureState): Promise<void> {
    const a = creature.attributes;
    await db.runAsync(
      `UPDATE user_creature SET
        nickname = ?, level = ?, xp = ?, evolution_stage = ?, strength = ?, endurance = ?,
        agility = ?, discipline = ?, recovery = ?, spirit = ?, health = ?, energy = ?,
        max_vigor = ?, vigor_recovery_rate = ?, last_vigor_calculation_at = ?, bond = ?,
        satiety = ?, last_satiety_calculation_at = ?, active_behavior_state = ?,
        last_interaction_at = ?, equipped_abilities = ?, defeated_milestones = ?, total_activities = ?,
        updated_at = ?, sync_status = ?
       WHERE id = ?`,
      [
        creature.nickname,
        creature.level,
        creature.xp,
        creature.evolutionStage,
        a.strength,
        a.endurance,
        a.agility,
        a.discipline,
        a.recovery,
        a.spirit,
        a.health,
        a.energy,
        creature.maxVigor,
        creature.vigorRecoveryRate,
        creature.lastVigorCalculationAt,
        creature.bond,
        creature.satiety,
        creature.lastSatietyCalculationAt,
        creature.activeBehaviorState,
        creature.lastInteractionAt,
        JSON.stringify(creature.equippedAbilities),
        JSON.stringify(creature.defeatedMilestones),
        creature.totalActivities,
        creature.updatedAt,
        creature.syncStatus,
        creature.id,
      ] as SqlValue[],
    );
  },

  async updateCare(db: SqlDatabase, creature: CreatureState): Promise<void> {
    await db.runAsync(
      `UPDATE user_creature SET bond = ?, satiety = ?, last_satiety_calculation_at = ?,
       active_behavior_state = ?, last_interaction_at = ? WHERE id = ?`,
      [
        creature.bond,
        creature.satiety,
        creature.lastSatietyCalculationAt,
        creature.activeBehaviorState,
        creature.lastInteractionAt,
        creature.id,
      ],
    );
  },

  /**
   * Persiste APENAS os campos de Vigor (recuperação passiva por tempo). Não toca
   * em `updated_at`/`sync_status`: a recuperação é bookkeeping local e o servidor
   * recalcula o Vigor de forma independente (não é dado competitivo).
   */
  async updateVigor(
    db: SqlDatabase,
    id: string,
    vigor: {
      currentVigor: number;
      maxVigor: number;
      vigorRecoveryRate: number;
      lastVigorCalculationAt: string;
    },
  ): Promise<void> {
    await db.runAsync(
      `UPDATE user_creature SET
        energy = ?, max_vigor = ?, vigor_recovery_rate = ?, last_vigor_calculation_at = ?
       WHERE id = ?`,
      [
        vigor.currentVigor,
        vigor.maxVigor,
        vigor.vigorRecoveryRate,
        vigor.lastVigorCalculationAt,
        id,
      ] as SqlValue[],
    );
  },
};
