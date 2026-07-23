import { Module } from '@nestjs/common';
import { ProgressModule } from '../progress/progress.module';
import { LeaguesController } from './leagues.controller';
import { LeaguesService } from './leagues.service';
import { SeasonsService } from './seasons.service';

@Module({
  imports: [ProgressModule],
  controllers: [LeaguesController],
  providers: [LeaguesService, SeasonsService],
})
export class LeaguesModule {}
