import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

export interface RegisteredUser {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
}

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
}

export async function createTestApp(
  customize?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<TestContext> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (customize) builder = customize(builder);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  await app.init();
  const prisma = app.get(PrismaService);
  return { app, prisma };
}

const TABLES = [
  'LeagueRankingEntry',
  'LeagueSeason',
  'LeagueInvite',
  'LeagueMember',
  'League',
  'UserAdariEvolutionHistory',
  'UserAdariAttributeState',
  'UserAdariLevelUpReward',
  'ActivityReward',
  'Activity',
  'BattleSession',
  'DailyBattleProgress',
  'DuelSession',
  'WeeklyProgress',
  'WeeklyGoal',
  'UserCreature',
  'NotificationPreference',
  'LocalProfileConversion',
  'PasswordResetToken',
  'RefreshToken',
  'SyncOperation',
  'Device',
  'Profile',
  'AuditLog',
  'User',
];

export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  const list = TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export async function registerUser(
  app: INestApplication,
  email: string,
  displayName = 'Usuário',
): Promise<RegisteredUser> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ displayName, email, password: 'SenhaForte123', timezone: 'America/Sao_Paulo' });
  return {
    accessToken: res.body.tokens.accessToken,
    refreshToken: res.body.tokens.refreshToken,
    userId: res.body.user.id,
    email,
  };
}
