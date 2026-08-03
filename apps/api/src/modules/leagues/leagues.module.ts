import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProgressModule } from '../progress/progress.module';
import { LeaguesController } from './leagues.controller';
import { LeaguesService } from './leagues.service';
import { SeasonsService } from './seasons.service';

@Module({
  imports: [ProgressModule, NotificationsModule],
  controllers: [LeaguesController],
  providers: [LeaguesService, SeasonsService],
})
export class LeaguesModule {}
