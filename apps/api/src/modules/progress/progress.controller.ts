import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../../common/decorators';
import { ProgressionService } from './progression.service';

@ApiTags('progress')
@Controller('progress')
export class ProgressController {
  constructor(private readonly progression: ProgressionService) {}

  @Get('current-week')
  @ApiOperation({ summary: 'Progresso da semana atual (recalculado no servidor).' })
  currentWeek(@CurrentUserId() userId: string) {
    return this.progression.getCurrentWeek(userId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Histórico semanal.' })
  history(@CurrentUserId() userId: string) {
    return this.progression.getHistory(userId);
  }

  @Get('streak')
  @ApiOperation({ summary: 'Sequência semanal (atual e melhor).' })
  streak(@CurrentUserId() userId: string) {
    return this.progression.getStreak(userId);
  }
}
