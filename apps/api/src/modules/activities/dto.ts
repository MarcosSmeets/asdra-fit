import { ACTIVITY_TYPES, activityInputSchema, updateActivitySchema } from '@ad-sidera/shared';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class CreateActivityDto extends createZodDto(activityInputSchema) {}
export class UpdateActivityDto extends createZodDto(updateActivitySchema) {}

export const listActivitiesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
  activityType: z.enum(ACTIVITY_TYPES).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export class ListActivitiesQueryDto extends createZodDto(listActivitiesQuerySchema) {}
