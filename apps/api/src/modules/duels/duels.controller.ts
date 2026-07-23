import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../../common/decorators';
import { CreateDuelDto } from './dto';
import { DuelsService } from './duels.service';

@ApiTags('duels')
@Controller('duels')
export class DuelsController {
  constructor(private readonly duels: DuelsService) {}

  @Get('opponents')
  @ApiOperation({ summary: 'Lista membros da mesma liga disponíveis para duelo.' })
  opponents(@CurrentUserId() userId: string) {
    return this.duels.opponents(userId);
  }

  @Get()
  @ApiOperation({ summary: 'Histórico de duelos do usuário.' })
  list(@CurrentUserId() userId: string) {
    return this.duels.list(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Desafia um membro da liga (resolve o duelo no servidor).' })
  create(@CurrentUserId() userId: string, @Body() dto: CreateDuelDto) {
    return this.duels.create(userId, dto.opponentUserId);
  }
}
