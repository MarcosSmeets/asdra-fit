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
import {
  ConvertLocalProfileDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto';

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
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  // Mesmo limite estrito do login: evita abuso do envio de códigos.
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @ApiOperation({ summary: 'Solicita um código de redefinição de senha por e-mail.' })
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: AuthenticatedRequest) {
    return this.auth.forgotPassword(dto, req.correlationId);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  // Limite estrito por IP: um código de 6 dígitos não sobrevive a força bruta lenta.
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @ApiOperation({ summary: 'Redefine a senha com o código recebido e revoga as sessões.' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.auth.resetPassword(dto, req.correlationId);
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
