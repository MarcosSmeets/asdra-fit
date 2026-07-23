import type { SqlDatabase } from './types';

/**
 * Migrations locais (SQLite). Cada entrada é aplicada uma vez, controlada por
 * PRAGMA user_version. Toda linha sincronizável carrega updatedAt e syncStatus.
 */
const MIGRATIONS: string[] = [
  // v1 — esquema inicial
  `
  CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS profile (
    id TEXT PRIMARY KEY NOT NULL,
    display_name TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    locale TEXT NOT NULL DEFAULT 'pt-BR',
    avatar_type TEXT NOT NULL DEFAULT 'star',
    share_creature_level INTEGER NOT NULL DEFAULT 1,
    goal TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'local_only'
  );

  CREATE TABLE IF NOT EXISTS user_creature (
    id TEXT PRIMARY KEY NOT NULL,
    creature_key TEXT NOT NULL,
    nickname TEXT,
    level INTEGER NOT NULL DEFAULT 1,
    xp INTEGER NOT NULL DEFAULT 0,
    evolution_stage INTEGER NOT NULL DEFAULT 0,
    strength INTEGER NOT NULL DEFAULT 0,
    endurance INTEGER NOT NULL DEFAULT 0,
    agility INTEGER NOT NULL DEFAULT 0,
    discipline INTEGER NOT NULL DEFAULT 0,
    recovery INTEGER NOT NULL DEFAULT 0,
    spirit INTEGER NOT NULL DEFAULT 0,
    health INTEGER NOT NULL DEFAULT 100,
    energy INTEGER NOT NULL DEFAULT 0,
    defeated_milestones TEXT NOT NULL DEFAULT '[]',
    total_activities INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'local_only'
  );

  CREATE TABLE IF NOT EXISTS weekly_goals (
    id TEXT PRIMARY KEY NOT NULL,
    target_count INTEGER NOT NULL,
    preferred_days TEXT NOT NULL DEFAULT '[]',
    activity_types TEXT NOT NULL DEFAULT '[]',
    starts_at TEXT NOT NULL,
    ends_at TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    allow_extra_activities INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'local_only'
  );

  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY NOT NULL,
    client_generated_id TEXT NOT NULL UNIQUE,
    activity_type TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    perceived_intensity TEXT NOT NULL,
    notes TEXT,
    location TEXT,
    mood_before TEXT,
    mood_after TEXT,
    has_local_photo INTEGER NOT NULL DEFAULT 0,
    local_photo_uri TEXT,
    is_scored INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    sync_status TEXT NOT NULL DEFAULT 'local_only'
  );
  CREATE INDEX IF NOT EXISTS idx_activities_occurred ON activities (occurred_at);
  CREATE INDEX IF NOT EXISTS idx_activities_deleted ON activities (deleted_at);

  CREATE TABLE IF NOT EXISTS activity_rewards (
    id TEXT PRIMARY KEY NOT NULL,
    activity_id TEXT NOT NULL UNIQUE,
    reward_key TEXT NOT NULL UNIQUE,
    xp_granted INTEGER NOT NULL,
    energy_granted INTEGER NOT NULL,
    attribute_changes TEXT NOT NULL DEFAULT '{}',
    calculated_at TEXT NOT NULL,
    calculation_version INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS weekly_progress (
    week_key TEXT PRIMARY KEY NOT NULL,
    week_start TEXT NOT NULL,
    week_end TEXT NOT NULL,
    target_count INTEGER NOT NULL,
    valid_activity_count INTEGER NOT NULL DEFAULT 0,
    percentage REAL NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS campaign_progress (
    adversary_id TEXT PRIMARY KEY NOT NULL,
    defeated INTEGER NOT NULL DEFAULT 0,
    defeated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS sync_outbox (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL UNIQUE,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    payload TEXT,
    updated_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending'
  );
  CREATE INDEX IF NOT EXISTS idx_outbox_status ON sync_outbox (status);
  `,
  // v2 — economia por posição diária (1.0/0.25/0.0): novas colunas de recompensa.
  `
  ALTER TABLE activity_rewards ADD COLUMN base_xp INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE activity_rewards ADD COLUMN final_xp INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE activity_rewards ADD COLUMN base_energy INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE activity_rewards ADD COLUMN final_energy INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE activity_rewards ADD COLUMN base_attribute_changes TEXT NOT NULL DEFAULT '{}';
  ALTER TABLE activity_rewards ADD COLUMN final_attribute_changes TEXT NOT NULL DEFAULT '{}';
  ALTER TABLE activity_rewards ADD COLUMN daily_reward_position INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE activity_rewards ADD COLUMN daily_reward_multiplier REAL NOT NULL DEFAULT 0;

  UPDATE activity_rewards SET
    base_xp = xp_granted, final_xp = xp_granted,
    base_energy = energy_granted, final_energy = energy_granted,
    base_attribute_changes = attribute_changes, final_attribute_changes = attribute_changes;
  UPDATE activity_rewards SET daily_reward_position = 1, daily_reward_multiplier = 1 WHERE xp_granted > 0;
  `,
  // v3 — Vigor (recurso de descanso): metadados de recuperação na criatura.
  // A coluna `energy` existente passa a representar o Vigor ATUAL (currentVigor).
  `
  ALTER TABLE user_creature ADD COLUMN max_vigor INTEGER NOT NULL DEFAULT 100;
  ALTER TABLE user_creature ADD COLUMN vigor_recovery_rate REAL NOT NULL DEFAULT 5;
  ALTER TABLE user_creature ADD COLUMN last_vigor_calculation_at TEXT;

  UPDATE user_creature SET last_vigor_calculation_at = updated_at
    WHERE last_vigor_calculation_at IS NULL;
  `,
  // v4 — Batalhas PvE: sessões idempotentes + progresso diário (limite de vitórias/XP).
  `
  CREATE TABLE IF NOT EXISTS battle_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    client_generated_id TEXT NOT NULL UNIQUE,
    battle_type TEXT NOT NULL DEFAULT 'pve',
    adversary_id TEXT,
    day_key TEXT NOT NULL,
    result TEXT NOT NULL,
    rewarded INTEGER NOT NULL DEFAULT 0,
    xp_granted INTEGER NOT NULL DEFAULT 0,
    vigor_spent INTEGER NOT NULL DEFAULT 0,
    seed INTEGER,
    turns INTEGER,
    battle_calculation_version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'local_only'
  );
  CREATE INDEX IF NOT EXISTS idx_battle_sessions_day ON battle_sessions (day_key);
  CREATE INDEX IF NOT EXISTS idx_battle_sessions_sync ON battle_sessions (sync_status);

  CREATE TABLE IF NOT EXISTS daily_battle_progress (
    day_key TEXT PRIMARY KEY NOT NULL,
    rewarded_wins INTEGER NOT NULL DEFAULT 0,
    xp_granted INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );
  `,
  // v5 — Habilidades equipadas (máx 4). Vazio = conjunto padrão do nível.
  `
  ALTER TABLE user_creature ADD COLUMN equipped_abilities TEXT NOT NULL DEFAULT '[]';
  `,
  // v6 — Observatório: cuidado local-first, inventário e estado durável da sala.
  `
  ALTER TABLE user_creature ADD COLUMN bond INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE user_creature ADD COLUMN satiety INTEGER NOT NULL DEFAULT 60;
  ALTER TABLE user_creature ADD COLUMN last_satiety_calculation_at TEXT;
  ALTER TABLE user_creature ADD COLUMN active_behavior_state TEXT NOT NULL DEFAULT 'idle';
  ALTER TABLE user_creature ADD COLUMN last_interaction_at TEXT;

  UPDATE user_creature SET last_satiety_calculation_at = updated_at
    WHERE last_satiety_calculation_at IS NULL;

  CREATE TABLE IF NOT EXISTS user_food_inventory (
    food_definition_id TEXT PRIMARY KEY NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS adari_interactions (
    id TEXT PRIMARY KEY NOT NULL,
    client_generated_id TEXT NOT NULL UNIQUE,
    user_adari_id TEXT NOT NULL,
    interaction_type TEXT NOT NULL,
    food_definition_id TEXT,
    bond_granted INTEGER NOT NULL DEFAULT 0,
    satiety_granted INTEGER NOT NULL DEFAULT 0,
    occurred_at TEXT NOT NULL,
    local_date TEXT NOT NULL,
    timezone TEXT NOT NULL,
    calculation_version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'local_only'
  );
  CREATE INDEX IF NOT EXISTS idx_adari_interactions_day
    ON adari_interactions (user_adari_id, local_date, interaction_type);

  CREATE TABLE IF NOT EXISTS observatory_state (
    id TEXT PRIMARY KEY NOT NULL,
    selected_control_mode TEXT NOT NULL DEFAULT 'tap',
    last_safe_player_position TEXT NOT NULL DEFAULT '{"x":360,"y":890}',
    unlocked_objects TEXT NOT NULL DEFAULT '[]',
    seen_dialogue_keys TEXT NOT NULL DEFAULT '[]',
    tutorial_completed INTEGER NOT NULL DEFAULT 0,
    reduce_motion INTEGER NOT NULL DEFAULT 0,
    particles_enabled INTEGER NOT NULL DEFAULT 1,
    movement_speed REAL NOT NULL DEFAULT 1,
    quality_mode TEXT NOT NULL DEFAULT 'automatic',
    music_enabled INTEGER NOT NULL DEFAULT 0,
    effects_enabled INTEGER NOT NULL DEFAULT 1,
    haptics_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  `,
  // v7 — aparência modular do Explorador (não reutiliza o emblema legado avatar_type).
  `
  ALTER TABLE profile ADD COLUMN avatar_appearance_json TEXT NOT NULL
    DEFAULT '{"bodyModel":"masculine","skinToneKey":"warm","hairStyleKey":"short","hairColorKey":"midnight","outfitKey":"astral"}';
  `,
];

export async function runMigrations(db: SqlDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let version = current; version < MIGRATIONS.length; version += 1) {
    const sql = MIGRATIONS[version];
    if (!sql) {
      continue;
    }
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
    });
    // PRAGMA não aceita parâmetros; a versão é um inteiro controlado internamente.
    await db.execAsync(`PRAGMA user_version = ${version + 1}`);
  }
}

export const MIGRATION_COUNT = MIGRATIONS.length;
