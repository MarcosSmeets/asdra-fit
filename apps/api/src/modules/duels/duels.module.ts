import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { DuelsController } from './duels.controller';
import { DuelsService } from './duels.service';

@Module({
  imports: [NotificationsModule],
  controllers: [DuelsController],
  providers: [DuelsService],
})
export class DuelsModule {}
