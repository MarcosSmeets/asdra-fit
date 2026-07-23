import { Module } from '@nestjs/common';
import { ProgressModule } from '../progress/progress.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [ProgressModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
