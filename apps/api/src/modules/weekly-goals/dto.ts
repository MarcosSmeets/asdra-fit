import { updateWeeklyGoalSchema, weeklyGoalSchema } from '@ad-sidera/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateWeeklyGoalDto extends createZodDto(weeklyGoalSchema) {}
export class UpdateWeeklyGoalDto extends createZodDto(updateWeeklyGoalSchema) {}
