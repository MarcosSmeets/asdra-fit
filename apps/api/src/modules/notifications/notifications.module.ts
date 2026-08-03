import { Body, Controller, Get, Injectable, Module, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  updateNotificationPreferenceSchema,
  type UpdateNotificationPreferenceInput,
} from '@ad-sidera/shared';
import { createZodDto } from 'nestjs-zod';
import { CurrentUserId } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from './push.service';

class UpdateNotificationPreferenceDto extends createZodDto(updateNotificationPreferenceSchema) {}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const existing = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    if (existing) {
      return existing;
    }
    return this.prisma.notificationPreference.create({ data: { userId } });
  }

  async update(userId: string, input: UpdateNotificationPreferenceInput) {
    await this.get(userId);
    return this.prisma.notificationPreference.update({ where: { userId }, data: input });
  }
}

@ApiTags('notification-preferences')
@Controller('notification-preferences')
class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Preferências de notificação do usuário.' })
  get(@CurrentUserId() userId: string) {
    return this.notifications.get(userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Atualiza preferências de notificação.' })
  update(@CurrentUserId() userId: string, @Body() dto: UpdateNotificationPreferenceDto) {
    return this.notifications.update(userId, dto);
  }
}

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, PushService],
  exports: [PushService],
})
export class NotificationsModule {}
