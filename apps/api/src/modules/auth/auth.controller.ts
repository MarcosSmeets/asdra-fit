import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedRequest } from '../../common/authenticated-request';
import { CurrentUserId, Public } from '../../common/decorators';
import { AuthService } from './auth.service';
import { ConvertLocalProfileDto, LoginDto, RefreshDto, RegisterDto } from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Cria uma conta (nome, e-mail e senha).' })
  register(@Body() dto: RegisterDto, @Req() req: AuthenticatedRequest) {
    return this.auth.register(dto, req.correlationId);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  // Proteção de brute-force: limite estrito por IP no login (sobrepõe o global).
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @ApiOperation({ summary: 'Autentica e retorna tokens (access + refresh).' })
  login(@Body() dto: LoginDto, @Req() req: AuthenticatedRequest) {
    return this.auth.login(dto, req.correlationId);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotaciona o refresh token e emite novos tokens.' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoga o refresh token informado.' })
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }

  @Public()
  @Post('local-profile/convert')
  @ApiOperation({
    summary: 'Converte um perfil local em conta. Dados locais migram depois via /sync/push.',
  })
  convert(@Body() dto: ConvertLocalProfileDto, @Req() req: AuthenticatedRequest) {
    return this.auth.convertLocalProfile(dto, req.correlationId);
  }

  @Post('local-profile/convert/complete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Confirma a conversão após a sincronização inicial.' })
  async completeConversion(
    @CurrentUserId() userId: string,
    @Body() body: { operationId: string },
  ): Promise<void> {
    await this.auth.completeLocalProfileConversion(userId, body.operationId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Retorna o usuário autenticado.' })
  me(@CurrentUserId() userId: string) {
    return this.auth.me(userId);
  }
}
