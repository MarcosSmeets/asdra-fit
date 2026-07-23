import type {
  AdariInteractionRecord,
  FoodInventoryItem,
  ObservatoryStateRecord,
} from '../models';
import type { SqlDatabase, SqlValue } from '../types';

interface InventoryRow {
  food_definition_id: string;
  quantity: number;
  updated_at: string;
}

interface InteractionAggregateRow {
  count: number;
  bond_granted: number;
}

interface ObservatoryRow {
  id: string;
  selected_control_mode: string;
  last_safe_player_position: string;
  unlocked_objects: string;
  seen_dialogue_keys: string;
  tutorial_completed: number;
  reduce_motion: number;
  particles_enabled: number;
  movement_speed: number;
  quality_mode: string;
  music_enabled: number;
  effects_enabled: number;
  haptics_enabled: number;
  updated_at: string;
}

export const observatoryRepository = {
  async inventory(db: SqlDatabase): Promise<FoodInventoryItem[]> {
    const rows = await db.getAllAsync<InventoryRow>(
      'SELECT * FROM user_food_inventory ORDER BY food_definition_id',
    );
    return rows.map((row) => ({
      foodDefinitionId: row.food_definition_id,
      quantity: row.quantity,
      updatedAt: row.updated_at,
    }));
  },

  async inventoryQuantity(db: SqlDatabase, foodDefinitionId: string): Promise<number> {
    const row = await db.getFirstAsync<{ quantity: number }>(
      'SELECT quantity FROM user_food_inventory WHERE food_definition_id = ?',
      [foodDefinitionId],
    );
    return row?.quantity ?? 0;
  },

  async addFood(
    db: SqlDatabase,
    foodDefinitionId: string,
    quantity: number,
    updatedAt: string,
  ): Promise<void> {
    await db.runAsync(
      `INSERT INTO user_food_inventory (food_definition_id, quantity, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(food_definition_id) DO UPDATE SET
       quantity = MAX(0, user_food_inventory.quantity + excluded.quantity), updated_at = excluded.updated_at`,
      [foodDefinitionId, quantity, updatedAt],
    );
  },

  async setFood(
    db: SqlDatabase,
    foodDefinitionId: string,
    quantity: number,
    updatedAt: string,
  ): Promise<void> {
    await db.runAsync(
      `INSERT INTO user_food_inventory (food_definition_id, quantity, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(food_definition_id) DO UPDATE SET
       quantity = MAX(0, excluded.quantity), updated_at = excluded.updated_at`,
      [foodDefinitionId, Math.max(0, Math.floor(quantity)), updatedAt],
    );
  },

  async consumeFood(db: SqlDatabase, foodDefinitionId: string, updatedAt: string): Promise<boolean> {
    const result = await db.runAsync(
      `UPDATE user_food_inventory SET quantity = quantity - 1, updated_at = ?
       WHERE food_definition_id = ? AND quantity > 0`,
      [updatedAt, foodDefinitionId],
    );
    return result.changes === 1;
  },

  async interactionByClientId(
    db: SqlDatabase,
    clientGeneratedId: string,
  ): Promise<AdariInteractionRecord | null> {
    const row = await db.getFirstAsync<Record<string, SqlValue>>(
      'SELECT * FROM adari_interactions WHERE client_generated_id = ?',
      [clientGeneratedId],
    );
    if (!row) return null;
    return {
      id: String(row.id),
      clientGeneratedId: String(row.client_generated_id),
      userAdariId: String(row.user_adari_id),
      interactionType: String(row.interaction_type) as AdariInteractionRecord['interactionType'],
      foodDefinitionId: row.food_definition_id ? String(row.food_definition_id) : null,
      bondGranted: Number(row.bond_granted),
      satietyGranted: Number(row.satiety_granted),
      occurredAt: String(row.occurred_at),
      localDate: String(row.local_date),
      timezone: String(row.timezone),
      calculationVersion: Number(row.calculation_version),
      createdAt: String(row.created_at),
      syncStatus: String(row.sync_status) as AdariInteractionRecord['syncStatus'],
    };
  },

  async dayAggregate(
    db: SqlDatabase,
    userAdariId: string,
    localDate: string,
    interactionType?: AdariInteractionRecord['interactionType'],
  ): Promise<{ count: number; bondGranted: number }> {
    const params: SqlValue[] = [userAdariId, localDate];
    const typeFilter = interactionType ? ' AND interaction_type = ?' : '';
    if (interactionType) params.push(interactionType);
    const row = await db.getFirstAsync<InteractionAggregateRow>(
      `SELECT COUNT(*) as count, COALESCE(SUM(bond_granted), 0) as bond_granted
       FROM adari_interactions WHERE user_adari_id = ? AND local_date = ?${typeFilter}`,
      params,
    );
    return { count: row?.count ?? 0, bondGranted: row?.bond_granted ?? 0 };
  },

  async insertInteraction(db: SqlDatabase, record: AdariInteractionRecord): Promise<boolean> {
    const result = await db.runAsync(
      `INSERT OR IGNORE INTO adari_interactions
       (id, client_generated_id, user_adari_id, interaction_type, food_definition_id,
        bond_granted, satiety_granted, occurred_at, local_date, timezone,
        calculation_version, created_at, sync_status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        record.id,
        record.clientGeneratedId,
        record.userAdariId,
        record.interactionType,
        record.foodDefinitionId,
        record.bondGranted,
        record.satietyGranted,
        record.occurredAt,
        record.localDate,
        record.timezone,
        record.calculationVersion,
        record.createdAt,
        record.syncStatus,
      ],
    );
    return result.changes === 1;
  },

  async state(db: SqlDatabase): Promise<ObservatoryStateRecord | null> {
    const row = await db.getFirstAsync<ObservatoryRow>('SELECT * FROM observatory_state LIMIT 1');
    if (!row) return null;
    return {
      id: row.id,
      selectedControlMode: row.selected_control_mode as ObservatoryStateRecord['selectedControlMode'],
      lastSafePlayerPosition: JSON.parse(row.last_safe_player_position) as { x: number; y: number },
      unlockedObjects: JSON.parse(row.unlocked_objects) as string[],
      seenDialogueKeys: JSON.parse(row.seen_dialogue_keys) as string[],
      tutorialCompleted: row.tutorial_completed === 1,
      reduceMotion: row.reduce_motion === 1,
      particlesEnabled: row.particles_enabled === 1,
      movementSpeed: row.movement_speed,
      qualityMode: row.quality_mode as ObservatoryStateRecord['qualityMode'],
      musicEnabled: row.music_enabled === 1,
      effectsEnabled: row.effects_enabled === 1,
      hapticsEnabled: row.haptics_enabled === 1,
      updatedAt: row.updated_at,
    };
  },

  async saveState(db: SqlDatabase, state: ObservatoryStateRecord): Promise<void> {
    await db.runAsync(
      `INSERT INTO observatory_state
       (id, selected_control_mode, last_safe_player_position, unlocked_objects,
        seen_dialogue_keys, tutorial_completed, reduce_motion, particles_enabled,
        movement_speed, quality_mode, music_enabled, effects_enabled, haptics_enabled,
        created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
        selected_control_mode=excluded.selected_control_mode,
        last_safe_player_position=excluded.last_safe_player_position,
        unlocked_objects=excluded.unlocked_objects,
        seen_dialogue_keys=excluded.seen_dialogue_keys,
        tutorial_completed=excluded.tutorial_completed,
        reduce_motion=excluded.reduce_motion,
        particles_enabled=excluded.particles_enabled,
        movement_speed=excluded.movement_speed,
        quality_mode=excluded.quality_mode,
        music_enabled=excluded.music_enabled,
        effects_enabled=excluded.effects_enabled,
        haptics_enabled=excluded.haptics_enabled,
        updated_at=excluded.updated_at`,
      [
        state.id,
        state.selectedControlMode,
        JSON.stringify(state.lastSafePlayerPosition),
        JSON.stringify(state.unlockedObjects),
        JSON.stringify(state.seenDialogueKeys),
        state.tutorialCompleted ? 1 : 0,
        state.reduceMotion ? 1 : 0,
        state.particlesEnabled ? 1 : 0,
        state.movementSpeed,
        state.qualityMode,
        state.musicEnabled ? 1 : 0,
        state.effectsEnabled ? 1 : 0,
        state.hapticsEnabled ? 1 : 0,
        state.updatedAt,
        state.updatedAt,
      ],
    );
  },
};
