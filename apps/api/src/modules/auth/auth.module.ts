import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DevLogMailerService, MailerService } from './mailer.service';
import { TokenService } from './token.service';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    // Em produção, troque por um provedor real (Resend/SES/SMTP).
    { provide: MailerService, useClass: DevLogMailerService },
  ],
  exports: [TokenService],
})
export class AuthModule {}
