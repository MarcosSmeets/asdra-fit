import { z } from 'zod';
import { ACTIVITY_TYPES } from '../enums';
import { isoDateTimeSchema } from './common';

export const weeklyGoalSchema = z.object({
  targetCount: z.number().int().min(1).max(14),
  preferredDays: z.array(z.number().int().min(1).max(7)).max(7).default([]),
  activityTypes: z.array(z.enum(ACTIVITY_TYPES)).min(1),
  startsAt: isoDateTimeSchema,
  allowExtraActivities: z.boolean().default(true),
});
export type WeeklyGoalInput = z.infer<typeof weeklyGoalSchema>;

export const updateWeeklyGoalSchema = weeklyGoalSchema.partial();
export type UpdateWeeklyGoalInput = z.infer<typeof updateWeeklyGoalSchema>;
