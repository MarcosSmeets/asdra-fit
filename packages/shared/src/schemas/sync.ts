import { z } from 'zod';
import { SYNC } from '@ad-sidera/config';
import { isoDateTimeSchema, uuidSchema } from './common';
import { CREATURE_KEYS } from './creature';

/** Payload de sincronização da criatura do usuário (last-write-wins). */
export const userCreatureSyncPayloadSchema = z.object({
  creatureKey: z.enum(CREATURE_KEYS),
  nickname: z.string().max(30).nullable().optional(),
  level: z.number().int().min(1),
  xp: z.number().int().min(0),
  /** Informativo: o servidor só altera estágio via operação `adari_evolution`. */
  evolutionStage: z.number().int().min(0),
  evolvedAt: isoDateTimeSchema.optional(),
  strength: z.number().int().min(0),
  endurance: z.number().int().min(0),
  agility: z.number().int().min(0),
  discipline: z.number().int().min(0),
  recovery: z.number().int().min(0),
  spirit: z.number().int().min(0),
  health: z.number().int().min(1),
  /** `energy` = Vigor atual (recurso de descanso). */
  energy: z.number().int().min(0),
  // Metadados de Vigor (opcionais para compatibilidade com clientes antigos).
  maxVigor: z.number().int().min(1).max(1000).optional(),
  vigorRecoveryRate: z.number().min(0).max(100).optional(),
  lastVigorCalculationAt: isoDateTimeSchema.optional(),
  bond: z.number().int().min(0).max(100).optional(),
  satiety: z.number().int().min(0).max(100).optional(),
  lastSatietyCalculationAt: isoDateTimeSchema.optional(),
  activeBehaviorState: z
    .enum([
      'idle',
      'following',
      'running',
      'resting',
      'eating',
      'receivingAffection',
      'curious',
      'excited',
      'sleeping',
      'battleReady',
    ])
    .optional(),
  lastInteractionAt: isoDateTimeSchema.nullable().optional(),
  /** Habilidades equipadas (máx 4). Opcional para clientes antigos. */
  equippedAbilities: z.array(z.string().max(60)).max(8).optional(),
  defeatedMilestones: z.array(z.string().max(40)).max(50).default([]),
});
export type UserCreatureSyncPayload = z.infer<typeof userCreatureSyncPayloadSchema>;

/**
 * Payload de sync de uma sessão de batalha PvE (idempotente por clientGeneratedId).
 * O servidor materializa o progresso diário e re-deriva o teto (nunca confia no XP/
 * vitórias enviados; sinaliza excesso sem duplicar recompensa).
 */
export const battleSessionSyncPayloadSchema = z.object({
  clientGeneratedId: z.string().min(1).max(64),
  battleType: z.enum(['pve', 'duel']).default('pve'),
  adversaryId: z.string().max(40).nullable().optional(),
  dayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  result: z.enum(['victory', 'defeat']),
  rewarded: z.boolean().default(false),
  xpGranted: z.number().int().min(0).default(0),
  vigorSpent: z.number().int().min(0).default(0),
  seed: z.number().int().nullable().optional(),
  turns: z.number().int().min(0).nullable().optional(),
  battleCalculationVersion: z.number().int().min(1).default(1),
});
export type BattleSessionSyncPayload = z.infer<typeof battleSessionSyncPayloadSchema>;

export const adariInteractionSyncPayloadSchema = z.object({
  clientGeneratedId: z.string().min(1).max(96),
  userAdariId: uuidSchema,
  interactionType: z.enum([
    'pet',
    'feed',
    'activity',
    'weekly_goal',
    'boss',
    'return',
    'evolution',
    'milestone',
  ]),
  foodDefinitionId: z.string().max(64).nullable().optional(),
  bondGranted: z.number().int().min(0).max(20),
  satietyGranted: z.number().int().min(0).max(100),
  occurredAt: isoDateTimeSchema,
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1).max(64),
  calculationVersion: z.number().int().min(1),
});
export type AdariInteractionSyncPayload = z.infer<typeof adariInteractionSyncPayloadSchema>;

/**
 * Payload de sync de UMA evolução de estágio (Build 5). Idempotente por
 * clientGeneratedId (id do registro de histórico). O servidor NUNCA confia no
 * estágio enviado: revalida requisitos, ordem (sem pulos), não-regressão e
 * duplicação antes de aplicar.
 */
export const adariEvolutionSyncPayloadSchema = z.object({
  clientGeneratedId: z.string().min(1).max(96),
  userAdariId: uuidSchema,
  /** Estágio de origem/destino como inteiro persistido (0..3). */
  fromStage: z.number().int().min(0).max(3),
  toStage: z.number().int().min(1).max(3),
  unlockedAt: isoDateTimeSchema,
  triggeringReason: z.string().min(1).max(120),
  calculationVersion: z.number().int().min(1),
});
export type AdariEvolutionSyncPayload = z.infer<typeof adariEvolutionSyncPayloadSchema>;

export const observatoryStateSyncPayloadSchema = z.object({
  selectedControlMode: z.enum(['tap', 'directional']),
  unlockedObjects: z.array(z.string().max(64)).max(50),
  seenDialogueKeys: z.array(z.string().max(96)).max(500),
  reduceMotion: z.boolean(),
  particlesEnabled: z.boolean(),
  movementSpeed: z.number().min(0.5).max(2),
  qualityMode: z.enum(['automatic', 'high', 'economy']),
  musicEnabled: z.boolean(),
  effectsEnabled: z.boolean(),
  hapticsEnabled: z.boolean(),
});
export type ObservatoryStateSyncPayload = z.infer<typeof observatoryStateSyncPayloadSchema>;

/** Entidades sincronizáveis. Fotos NUNCA são sincronizadas. */
export const SYNC_ENTITY_TYPES = [
  'activity',
  'weekly_goal',
  'user_creature',
  'weekly_progress',
  'profile',
  'battle_session',
  'adari_interaction',
  'observatory_state',
  'food_inventory',
  'adari_evolution',
] as const;
export type SyncEntityType = (typeof SYNC_ENTITY_TYPES)[number];

export const syncOperationTypeSchema = z.enum(['upsert', 'delete']);
export type SyncOperationType = z.infer<typeof syncOperationTypeSchema>;

export const syncOperationSchema = z.object({
  operationId: uuidSchema,
  entityType: z.enum(SYNC_ENTITY_TYPES),
  entityId: uuidSchema,
  operationType: syncOperationTypeSchema,
  updatedAt: isoDateTimeSchema,
  /** Metadados da entidade. Validado por tipo no backend. */
  payload: z.record(z.unknown()).optional(),
});
export type SyncOperation = z.infer<typeof syncOperationSchema>;

export const syncPushSchema = z.object({
  deviceId: uuidSchema,
  lastSyncAt: isoDateTimeSchema.nullable().optional(),
  operations: z.array(syncOperationSchema).max(SYNC.MAX_OPERATIONS_PER_REQUEST),
});
export type SyncPushInput = z.infer<typeof syncPushSchema>;

export const syncPullSchema = z.object({
  deviceId: uuidSchema,
  lastSyncAt: isoDateTimeSchema.nullable().optional(),
});
export type SyncPullInput = z.infer<typeof syncPullSchema>;

export interface SyncConflict {
  operationId: string;
  entityType: SyncEntityType;
  entityId: string;
  reason: 'stale_update' | 'validation_error';
  /** updatedAt do dado do servidor que "venceu" (mais recente). */
  serverUpdatedAt?: string;
  message: string;
}

export interface SyncServerChange {
  entityType: SyncEntityType;
  entityId: string;
  operationType: SyncOperationType;
  updatedAt: string;
  payload: Record<string, unknown> | null;
}

export interface SyncPushResponse {
  processedOperationIds: string[];
  failedOperations: SyncConflict[];
  serverChanges: SyncServerChange[];
  nextSyncToken: string;
  serverTime: string;
}
