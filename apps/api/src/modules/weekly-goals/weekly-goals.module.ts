import { Module } from '@nestjs/common';
import { WeeklyGoalsController } from './weekly-goals.controller';
import { WeeklyGoalsService } from './weekly-goals.service';

@Module({
  controllers: [WeeklyGoalsController],
  providers: [WeeklyGoalsService],
  exports: [WeeklyGoalsService],
})
export class WeeklyGoalsModule {}
