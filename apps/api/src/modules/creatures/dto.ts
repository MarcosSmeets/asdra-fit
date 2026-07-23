import { selectCreatureSchema, updateCreatureSchema } from '@ad-sidera/shared';
import { createZodDto } from 'nestjs-zod';

export class SelectCreatureDto extends createZodDto(selectCreatureSchema) {}
export class UpdateCreatureDto extends createZodDto(updateCreatureSchema) {}
