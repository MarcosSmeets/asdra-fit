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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../../common/decorators';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto, ListActivitiesQueryDto, UpdateActivityDto } from './dto';

@ApiTags('activities')
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista atividades (paginação por cursor, filtros).' })
  list(@CurrentUserId() userId: string, @Query() query: ListActivitiesQueryDto) {
    return this.activities.list(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma atividade.' })
  get(@CurrentUserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.activities.get(userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Registra uma atividade (metadados; foto nunca é enviada).' })
  create(@CurrentUserId() userId: string, @Body() dto: CreateActivityDto) {
    return this.activities.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita uma atividade.' })
  update(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.activities.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui (soft delete) uma atividade e recalcula o progresso.' })
  async remove(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.activities.remove(userId, id);
  }
}
