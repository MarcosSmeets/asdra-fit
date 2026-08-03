import { Injectable, Logger } from '@nestjs/common';
import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { PrismaService } from '../../prisma/prisma.service';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Envio de push via Expo Push Service para os dispositivos registrados
 * (Device.pushToken). Best-effort por princípio: respeita as preferências do
 * usuário e nunca propaga falhas para o fluxo de negócio que disparou o aviso.
 */
@Injectable()
export class PushService {
  private readonly expo = new Expo();
  private readonly logger = new Logger(PushService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Avisos de liga/duelo — controlados pelas preferências `enabled` e `leagueEnabled`. */
  async sendLeagueNotice(userId: string, message: PushMessage): Promise<void> {
    try {
      const preference = await this.prisma.notificationPreference.findUnique({
        where: { userId },
      });
      if (preference && (!preference.enabled || !preference.leagueEnabled)) {
        return;
      }
      const devices = await this.prisma.device.findMany({
        where: { userId, pushToken: { not: null } },
        select: { pushToken: true },
      });
      const messages: ExpoPushMessage[] = devices
        .map((device) => device.pushToken)
        .filter((token): token is string => Boolean(token) && Expo.isExpoPushToken(token))
        .map((to) => ({
          to,
          sound: 'default',
          title: message.title,
          body: message.body,
          data: message.data,
        }));
      if (messages.length === 0) {
        return;
      }
      for (const chunk of this.expo.chunkPushNotifications(messages)) {
        await this.expo.sendPushNotificationsAsync(chunk);
      }
    } catch (cause) {
      this.logger.warn(
        `Falha ao enviar push para ${userId}: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }
  }
}
