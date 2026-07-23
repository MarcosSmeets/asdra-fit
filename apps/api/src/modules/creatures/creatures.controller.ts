import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUserId, Public } from '../../common/decorators';
import { CreaturesService } from './creatures.service';
import { SelectCreatureDto, UpdateCreatureDto } from './dto';

@ApiTags('creatures')
@Controller('creatures')
export class CreaturesController {
  constructor(private readonly creatures: CreaturesService) {}

  @Public()
  @Get('definitions')
  @ApiOperation({ summary: 'Conteúdo estático: criaturas, regiões e adversários.' })
  definitions() {
    return this.creatures.getDefinitions();
  }

  @Get('me')
  @ApiOperation({ summary: 'Retorna a criatura do usuário.' })
  me(@CurrentUserId() userId: string) {
    return this.creatures.getMine(userId);
  }

  @Post('select')
  @ApiOperation({ summary: 'Seleciona a criatura inicial (uma instância por usuário).' })
  select(@CurrentUserId() userId: string, @Body() dto: SelectCreatureDto) {
    return this.creatures.select(userId, dto);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualiza o apelido da criatura.' })
  update(@CurrentUserId() userId: string, @Body() dto: UpdateCreatureDto) {
    return this.creatures.update(userId, dto);
  }
}
