import { updateProfileSchema } from '@ad-sidera/shared';
import { createZodDto } from 'nestjs-zod';

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
