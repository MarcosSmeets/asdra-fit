import { z } from 'zod';

/** HH:mm 24h. */
export const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário deve estar no formato HH:mm');

export const updateNotificationPreferenceSchema = z
  .object({
    enabled: z.boolean().optional(),
    activityReminderEnabled: z.boolean().optional(),
    weeklyGoalEnabled: z.boolean().optional(),
    evolutionEnabled: z.boolean().optional(),
    leagueEnabled: z.boolean().optional(),
    quietHoursStart: timeOfDaySchema.nullable().optional(),
    quietHoursEnd: timeOfDaySchema.nullable().optional(),
    reminderTime: timeOfDaySchema.optional(),
    preferredDays: z.array(z.number().int().min(1).max(7)).max(7).optional(),
    timezone: z.string().min(1).optional(),
  })
  .strict();
export type UpdateNotificationPreferenceInput = z.infer<
  typeof updateNotificationPreferenceSchema
>;
