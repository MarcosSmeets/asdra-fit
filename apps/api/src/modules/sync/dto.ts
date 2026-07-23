import { syncPullSchema, syncPushSchema } from '@ad-sidera/shared';
import { createZodDto } from 'nestjs-zod';

export class SyncPushDto extends createZodDto(syncPushSchema) {}
export class SyncPullDto extends createZodDto(syncPullSchema) {}
