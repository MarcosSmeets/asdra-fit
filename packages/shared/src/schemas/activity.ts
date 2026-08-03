import { z } from 'zod';
import { ACTIVITY_TYPES, INTENSITIES, MOODS, MOVEMENT_SIGNALS } from '../enums';
import { isoDateTimeSchema, uuidSchema } from './common';

/** Campos informados pelo usuário ao registrar uma atividade. */
export const activityInputSchema = z.object({
  activityType: z.enum(ACTIVITY_TYPES),
  perceivedIntensity: z.enum(INTENSITIES),
  durationMinutes: z.number().int().min(1).max(1440),
  occurredAt: isoDateTimeSchema,
  notes: z.string().max(2000).optional(),
  /** Local apenas em texto (nunca coordenadas). */
  location: z.string().max(200).optional(),
  moodBefore: z.enum(MOODS).optional(),
  moodAfter: z.enum(MOODS).optional(),
  /** Sinal de movimento do aparelho — informativo, nunca altera recompensa. */
  movementSteps: z.number().int().min(0).max(500_000).nullish(),
  movementSignal: z.enum(MOVEMENT_SIGNALS).nullish(),
});
export type ActivityInputDto = z.infer<typeof activityInputSchema>;

/**
 * Payload de sincronização de uma atividade (metadados apenas).
 * NUNCA inclui a foto nem o caminho local — apenas o booleano hasLocalPhoto.
 */
export const activitySyncPayloadSchema = activityInputSchema.extend({
  clientGeneratedId: uuidSchema,
  hasLocalPhoto: z.boolean().default(false),
});
export type ActivitySyncPayload = z.infer<typeof activitySyncPayloadSchema>;

export const updateActivitySchema = activityInputSchema.partial();
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
