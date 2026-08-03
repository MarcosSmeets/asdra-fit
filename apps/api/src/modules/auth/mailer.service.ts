import { Injectable, Logger } from '@nestjs/common';

export interface PasswordResetMail {
  to: string;
  code: string;
  expiresMinutes: number;
}

/**
 * Porta de envio de e-mail. Em produção, troque a implementação registrada no
 * AuthModule por um provedor real (Resend/SES/SMTP) — nenhum outro código muda.
 */
export abstract class MailerService {
  abstract sendPasswordResetCode(mail: PasswordResetMail): Promise<void>;
}

/** Implementação de desenvolvimento: entrega o código no log do servidor. */
@Injectable()
export class DevLogMailerService extends MailerService {
  private readonly logger = new Logger('Mailer');

  async sendPasswordResetCode(mail: PasswordResetMail): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      // Nunca vazar códigos em log de produção; sinaliza a ausência de provedor.
      this.logger.error(
        `Nenhum provedor de e-mail configurado; código de redefinição para ${mail.to} NÃO foi enviado.`,
      );
      return;
    }
    this.logger.log(
      `[DEV] Código de redefinição de senha para ${mail.to}: ${mail.code} (expira em ${mail.expiresMinutes} min)`,
    );
  }
}
