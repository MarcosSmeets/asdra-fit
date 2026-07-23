import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { randomUUID } from 'node:crypto';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { CorrelationIdMiddleware } from './common/correlation-id.middleware';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { validateEnv, type Env } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CreaturesModule } from './modules/creatures/creatures.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { WeeklyGoalsModule } from './modules/weekly-goals/weekly-goals.module';
import { ProgressModule } from './modules/progress/progress.module';
import { SyncModule } from './modules/sync/sync.module';
import { LeaguesModule } from './modules/leagues/leagues.module';
import { DuelsModule } from './modules/duels/duels.module';
import { DevicesModule } from './modules/devices/devices.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    JwtModule.register({ global: true }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level:
            config.get('NODE_ENV', { infer: true }) === 'test'
              ? 'silent'
              : config.get('LOG_LEVEL', { infer: true }),
          genReqId: (req) => {
            const header = req.headers['x-correlation-id'];
            return typeof header === 'string' && header ? header : randomUUID();
          },
          // Nunca logar segredos, tokens, observações privadas nem caminhos de foto.
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.refreshToken',
              'req.body.notes',
              'req.body.operations',
            ],
            remove: true,
          },
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get('RATE_LIMIT_TTL', { infer: true }) * 1000,
            limit: config.get('RATE_LIMIT_MAX', { infer: true }),
          },
        ],
      }),
    }),
    PrismaModule,
    AuditModule,
    UsersModule,
    AuthModule,
    ProfilesModule,
    CreaturesModule,
    ActivitiesModule,
    WeeklyGoalsModule,
    ProgressModule,
    SyncModule,
    LeaguesModule,
    DuelsModule,
    DevicesModule,
    NotificationsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
