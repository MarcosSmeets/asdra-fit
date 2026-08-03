/**
 * Enums de domínio como arrays `const` (fonte única) + tipos derivados.
 * Reutilizados por schemas Zod, mobile e backend.
 */

export const ACTIVITY_TYPES = [
  'musculacao',
  'corrida',
  'caminhada',
  'ciclismo',
  'natacao',
  'esporte_coletivo',
  'funcional',
  'mobilidade',
  'outro',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const INTENSITIES = ['leve', 'moderada', 'intensa'] as const;
export type Intensity = (typeof INTENSITIES)[number];

/**
 * Sinal de movimento medido pelo aparelho na janela do treino. INFORMATIVO:
 * nunca altera recompensa nem ranking (filosofia de nunca punir).
 * - confirmed: houve movimento compatível com o treino declarado
 * - unconfirmed: o sensor não registrou movimento compatível
 * - unavailable: sem permissão/sensor no momento do registro
 * - not_applicable: o tipo de atividade não é mensurável por passos
 */
export const MOVEMENT_SIGNALS = [
  'confirmed',
  'unconfirmed',
  'unavailable',
  'not_applicable',
] as const;
export type MovementSignal = (typeof MOVEMENT_SIGNALS)[number];

export const MOODS = ['pessimo', 'ruim', 'neutro', 'bom', 'otimo'] as const;
export type Mood = (typeof MOODS)[number];

export const GOALS = [
  'constancia',
  'forca',
  'resistencia',
  'energia',
  'retomar',
  'esporte',
  'outro',
] as const;
export type Goal = (typeof GOALS)[number];

export const ARCHETYPES = ['forca', 'resistencia', 'equilibrio'] as const;
export type Archetype = (typeof ARCHETYPES)[number];

export const SYNC_STATUSES = ['local_only', 'pending', 'syncing', 'synced', 'failed'] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export const LEAGUE_STATUSES = ['active', 'archived'] as const;
export type LeagueStatus = (typeof LEAGUE_STATUSES)[number];

export const SEASON_STATUSES = ['active', 'finalized'] as const;
export type SeasonStatus = (typeof SEASON_STATUSES)[number];

export const LEAGUE_ROLES = ['admin', 'member'] as const;
export type LeagueRole = (typeof LEAGUE_ROLES)[number];

export const PLATFORMS = ['ios', 'android', 'web'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const BATTLE_ACTIONS = ['attack', 'defend', 'ability', 'recover'] as const;
export type BattleAction = (typeof BATTLE_ACTIONS)[number];

/** Dias da semana em ISO (segunda = 1 ... domingo = 7). */
export const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type IsoWeekday = (typeof ISO_WEEKDAYS)[number];

export const AVATAR_TYPES = ['star', 'moon', 'comet', 'nebula'] as const;
export type AvatarType = (typeof AVATAR_TYPES)[number];
