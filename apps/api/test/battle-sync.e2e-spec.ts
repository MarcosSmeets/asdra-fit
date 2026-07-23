import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PVE_DAILY_WIN_LIMIT } from '@ad-sidera/shared';
import { cleanDatabase, createTestApp, registerUser, type RegisteredUser } from './e2e-utils';
import type { PrismaService } from '../src/prisma/prisma.service';

describe('Batalhas PvE — sync (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let user: RegisteredUser;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    user = await registerUser(app, 'battle@adsidera.dev', 'Battle');
  });

  const auth = () => ({ Authorization: `Bearer ${user.accessToken}` });
  const DAY = '2026-07-22';

  async function seedCreature(level = 5): Promise<void> {
    const now = new Date().toISOString();
    await request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .set(auth())
      .send({
        deviceId: randomUUID(),
        operations: [
          {
            operationId: randomUUID(),
            entityType: 'user_creature',
            entityId: randomUUID(),
            operationType: 'upsert',
            updatedAt: now,
            payload: {
              creatureKey: 'terravok',
              level,
              xp: 0,
              evolutionStage: 0,
              strength: 20,
              endurance: 14,
              agility: 8,
              discipline: 12,
              recovery: 8,
              spirit: 10,
              health: 110,
              energy: 100,
              defeatedMilestones: [],
            },
          },
        ],
      })
      .expect(200);
  }

  function battleOp(over: Record<string, unknown> = {}) {
    const now = new Date().toISOString();
    const clientGeneratedId = (over.clientGeneratedId as string) ?? randomUUID();
    return {
      operationId: randomUUID(),
      entityType: 'battle_session',
      entityId: randomUUID(),
      operationType: 'upsert',
      updatedAt: now,
      payload: {
        clientGeneratedId,
        battleType: 'pve',
        adversaryId: 'r1-1',
        dayKey: DAY,
        result: 'victory',
        rewarded: true,
        xpGranted: 2,
        vigorSpent: 12,
        battleCalculationVersion: 1,
        ...over,
      },
    };
  }

  it('materializa o progresso diário: 5 vitórias recompensadas', async () => {
    await seedCreature();
    const ops = Array.from({ length: PVE_DAILY_WIN_LIMIT }, () => battleOp());
    const res = await request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .set(auth())
      .send({ deviceId: randomUUID(), operations: ops })
      .expect(200);
    expect(res.body.processedOperationIds).toHaveLength(PVE_DAILY_WIN_LIMIT);

    const progress = await prisma.dailyBattleProgress.findUnique({
      where: { userId_dayKey: { userId: user.userId, dayKey: DAY } },
    });
    expect(progress?.rewardedWins).toBe(PVE_DAILY_WIN_LIMIT);
    expect(progress?.xpGranted).toBeGreaterThan(0);

    const sessions = await prisma.battleSession.count({ where: { userId: user.userId } });
    expect(sessions).toBe(PVE_DAILY_WIN_LIMIT);

    const creature = await prisma.userCreature.findUnique({ where: { userId: user.userId } });
    expect(creature?.energy).toBe(40);
  });

  it('a 6ª vitória não é recompensada e é sinalizada (servidor re-deriva o teto)', async () => {
    await seedCreature();
    const first = Array.from({ length: PVE_DAILY_WIN_LIMIT }, () => battleOp());
    await request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .set(auth())
      .send({ deviceId: randomUUID(), operations: first })
      .expect(200);

    // 6ª vitória: cliente ainda declara rewarded/xp, mas o servidor deve zerar e sinalizar.
    const sixthClientId = randomUUID();
    await request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .set(auth())
      .send({
        deviceId: randomUUID(),
        operations: [battleOp({ clientGeneratedId: sixthClientId, rewarded: true, xpGranted: 5 })],
      })
      .expect(200);

    const sixth = await prisma.battleSession.findUnique({
      where: {
        userId_clientGeneratedId: { userId: user.userId, clientGeneratedId: sixthClientId },
      },
    });
    expect(sixth?.rewarded).toBe(false);
    expect(sixth?.xpGranted).toBe(0);
    expect(sixth?.serverFlagged).toBe(true);

    const progress = await prisma.dailyBattleProgress.findUnique({
      where: { userId_dayKey: { userId: user.userId, dayKey: DAY } },
    });
    // O limite não foi ultrapassado no servidor.
    expect(progress?.rewardedWins).toBe(PVE_DAILY_WIN_LIMIT);
  });

  it('derrota não consome vitória e não concede XP', async () => {
    await seedCreature();
    const clientId = randomUUID();
    await request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .set(auth())
      .send({
        deviceId: randomUUID(),
        operations: [
          battleOp({
            clientGeneratedId: clientId,
            result: 'defeat',
            rewarded: true,
            xpGranted: 999,
            vigorSpent: 0,
          }),
        ],
      })
      .expect(200);

    const session = await prisma.battleSession.findUnique({
      where: { userId_clientGeneratedId: { userId: user.userId, clientGeneratedId: clientId } },
    });
    expect(session?.result).toBe('defeat');
    expect(session?.rewarded).toBe(false);
    expect(session?.xpGranted).toBe(0);
    expect(session?.vigorSpent).toBe(6);
    expect(session?.serverFlagged).toBe(true);

    const creature = await prisma.userCreature.findUnique({ where: { userId: user.userId } });
    expect(creature?.energy).toBe(94);

    const progress = await prisma.dailyBattleProgress.findUnique({
      where: { userId_dayKey: { userId: user.userId, dayKey: DAY } },
    });
    expect(progress).toBeNull();
  });

  it('é idempotente por clientGeneratedId: reenviar não duplica nem re-incrementa', async () => {
    await seedCreature();
    const clientId = randomUUID();
    const send = () =>
      request(app.getHttpServer())
        .post('/api/v1/sync/push')
        .set(auth())
        .send({
          deviceId: randomUUID(),
          operations: [battleOp({ clientGeneratedId: clientId })],
        })
        .expect(200);

    await send();
    await send(); // mesma sessão (clientGeneratedId), operationId diferente

    const sessions = await prisma.battleSession.count({
      where: { userId: user.userId, clientGeneratedId: clientId },
    });
    expect(sessions).toBe(1);

    const progress = await prisma.dailyBattleProgress.findUnique({
      where: { userId_dayKey: { userId: user.userId, dayKey: DAY } },
    });
    expect(progress?.rewardedWins).toBe(1);
  });
});
