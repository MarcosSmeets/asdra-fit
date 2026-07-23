import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness — o processo está de pé.' })
  live() {
    return { status: 'ok', service: 'ad-sidera-api', time: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness — dependências (banco) estão acessíveis.' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', database: 'up', time: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException({ status: 'not_ready', database: 'down' });
    }
  }
}
