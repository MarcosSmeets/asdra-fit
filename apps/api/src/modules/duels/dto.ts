import { createDuelSchema } from '@ad-sidera/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateDuelDto extends createZodDto(createDuelSchema) {}
