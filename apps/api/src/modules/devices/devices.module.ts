import { Body, Controller, Delete, HttpCode, HttpStatus, Injectable, Module, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { registerDeviceSchema, type RegisterDeviceInput } from '@ad-sidera/shared';
import { createZodDto } from 'nestjs-zod';
import { CurrentUserId } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';

class RegisterDeviceDto extends createZodDto(registerDeviceSchema) {}

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  register(userId: string, input: RegisterDeviceInput) {
    return this.prisma.device.upsert({
      where: { userId_installationId: { userId, installationId: input.installationId } },
      create: {
        userId,
        installationId: input.installationId,
        platform: input.platform,
        pushToken: input.pushToken ?? null,
      },
      update: {
        platform: input.platform,
        pushToken: input.pushToken ?? null,
        lastSeenAt: new Date(),
      },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.prisma.device.deleteMany({ where: { id, userId } });
  }
}

@ApiTags('devices')
@Controller('devices')
class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post()
  @ApiOperation({ summary: 'Registra/atualiza um dispositivo (prepara push futuro).' })
  register(@CurrentUserId() userId: string, @Body() dto: RegisterDeviceDto) {
    return this.devices.register(userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um dispositivo.' })
  async remove(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.devices.remove(userId, id);
  }
}

@Module({
  controllers: [DevicesController],
  providers: [DevicesService],
})
export class DevicesModule {}
