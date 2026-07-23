import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../../common/decorators';
import { UpdateProfileDto } from './dto';
import { ProfilesService } from './profiles.service';

@ApiTags('profile')
@Controller('profile')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get()
  @ApiOperation({ summary: 'Retorna o perfil do usuário.' })
  get(@CurrentUserId() userId: string) {
    return this.profiles.get(userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Atualiza o perfil do usuário.' })
  update(@CurrentUserId() userId: string, @Body() dto: UpdateProfileDto) {
    return this.profiles.update(userId, dto);
  }

  @Get('export')
  @ApiOperation({ summary: 'Exporta todos os dados do usuário (LGPD). Sem fotos.' })
  exportData(@CurrentUserId() userId: string) {
    return this.profiles.exportData(userId);
  }

  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui a conta e apaga os dados em cascata (LGPD).' })
  async deleteAccount(@CurrentUserId() userId: string): Promise<void> {
    await this.profiles.deleteAccount(userId);
  }
}
