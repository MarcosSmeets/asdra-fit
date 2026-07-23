import { Module } from '@nestjs/common';
import { ProgressController } from './progress.controller';
import { ProgressionService } from './progression.service';

@Module({
  controllers: [ProgressController],
  providers: [ProgressionService],
  exports: [ProgressionService],
})
export class ProgressModule {}
