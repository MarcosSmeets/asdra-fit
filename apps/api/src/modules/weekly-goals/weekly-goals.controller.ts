import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../../common/decorators';
import { CreateWeeklyGoalDto, UpdateWeeklyGoalDto } from './dto';
import { WeeklyGoalsService } from './weekly-goals.service';

@ApiTags('weekly-goals')
@Controller('weekly-goals')
export class WeeklyGoalsController {
  constructor(private readonly goals: WeeklyGoalsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Retorna a meta semanal ativa.' })
  current(@CurrentUserId() userId: string) {
    return this.goals.getCurrent(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Define uma nova meta semanal (desativa a anterior).' })
  create(@CurrentUserId() userId: string, @Body() dto: CreateWeeklyGoalDto) {
    return this.goals.create(userId, dto);
  }

  @Patch('current')
  @ApiOperation({ summary: 'Atualiza a meta semanal ativa.' })
  update(@CurrentUserId() userId: string, @Body() dto: UpdateWeeklyGoalDto) {
    return this.goals.updateCurrent(userId, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Histórico de metas semanais.' })
  history(@CurrentUserId() userId: string) {
    return this.goals.history(userId);
  }
}
