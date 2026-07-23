import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../../common/decorators';
import {
  CreateInviteDto,
  CreateLeagueDto,
  JoinLeagueDto,
  UpdateInviteDto,
  UpdateLeagueDto,
} from './dto';
import { LeaguesService } from './leagues.service';

@ApiTags('leagues')
@Controller('leagues')
export class LeaguesController {
  constructor(private readonly leagues: LeaguesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista as ligas do usuário.' })
  list(@CurrentUserId() userId: string) {
    return this.leagues.listMine(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Cria uma liga (o criador vira administrador).' })
  create(@CurrentUserId() userId: string, @Body() dto: CreateLeagueDto) {
    return this.leagues.create(userId, dto);
  }

  @Post('join')
  @ApiOperation({ summary: 'Entra em uma liga usando um código de convite.' })
  join(@CurrentUserId() userId: string, @Body() dto: JoinLeagueDto) {
    return this.leagues.join(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma liga (somente membros).' })
  get(@CurrentUserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.leagues.get(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza a liga (somente administrador).' })
  update(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeagueDto,
  ) {
    return this.leagues.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui a liga (somente administrador).' })
  async remove(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.leagues.remove(userId, id);
  }

  @Post(':id/invites')
  @ApiOperation({ summary: 'Cria um novo convite (somente administrador).' })
  createInvite(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateInviteDto,
  ) {
    return this.leagues.createInvite(userId, id, dto);
  }

  @Patch(':id/invites/:inviteId')
  @ApiOperation({ summary: 'Regenera/desativa um convite (somente administrador).' })
  updateInvite(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
    @Body() dto: UpdateInviteDto,
  ) {
    return this.leagues.updateInvite(userId, id, inviteId, dto);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Sai da liga.' })
  async leave(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.leagues.leave(userId, id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Lista participantes (sem fotos).' })
  members(@CurrentUserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.leagues.members(userId, id);
  }

  @Get(':id/ranking')
  @ApiOperation({ summary: 'Ranking da temporada atual (percentual da meta pessoal).' })
  ranking(@CurrentUserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.leagues.ranking(userId, id);
  }

  @Get(':id/seasons')
  @ApiOperation({ summary: 'Histórico de temporadas.' })
  seasons(@CurrentUserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.leagues.listSeasons(userId, id);
  }

  @Get(':id/seasons/:seasonId')
  @ApiOperation({ summary: 'Detalha uma temporada e seu ranking congelado.' })
  season(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('seasonId', ParseUUIDPipe) seasonId: string,
  ) {
    return this.leagues.getSeason(userId, id, seasonId);
  }
}
