import { paginationQuerySchema } from '@ad-sidera/shared';
import { createZodDto } from 'nestjs-zod';

export class PaginationDto extends createZodDto(paginationQuerySchema) {}
