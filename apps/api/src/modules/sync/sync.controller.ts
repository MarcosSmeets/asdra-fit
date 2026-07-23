import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../../common/decorators';
import { SyncPullDto, SyncPushDto } from './dto';
import { SyncService } from './sync.service';

@ApiTags('sync')
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post('push')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envia operações locais (idempotente por operationId).' })
  push(@CurrentUserId() userId: string, @Body() dto: SyncPushDto) {
    return this.sync.push(userId, dto);
  }

  @Post('pull')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Baixa mudanças do servidor desde lastSyncAt.' })
  pull(@CurrentUserId() userId: string, @Body() dto: SyncPullDto) {
    return this.sync.pull(userId, dto.lastSyncAt ? new Date(dto.lastSyncAt) : null);
  }

  @Post('full')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sincronização completa (todas as entidades do usuário).' })
  full(@CurrentUserId() userId: string, @Body() _dto: SyncPullDto) {
    return this.sync.full(userId);
  }
}
