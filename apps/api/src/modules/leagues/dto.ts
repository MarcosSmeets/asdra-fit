import {
  createInviteSchema,
  createLeagueSchema,
  joinLeagueSchema,
  updateInviteSchema,
  updateLeagueSchema,
} from '@ad-sidera/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateLeagueDto extends createZodDto(createLeagueSchema) {}
export class UpdateLeagueDto extends createZodDto(updateLeagueSchema) {}
export class JoinLeagueDto extends createZodDto(joinLeagueSchema) {}
export class CreateInviteDto extends createZodDto(createInviteSchema) {}
export class UpdateInviteDto extends createZodDto(updateInviteSchema) {}
