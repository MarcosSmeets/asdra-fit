import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { cleanDatabase, createTestApp, registerUser, type RegisteredUser } from './e2e-utils';
import type { PrismaService } from '../src/prisma/prisma.service';
import { DateTime } from 'luxon';

describe('Sync (e2e)', () => {
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
    user = await registerUser(app, 'sync@adsidera.dev', 'Sync');
  });

  const auth = () => ({ Authorization: `Bearer ${user.accessToken}` });

  async function setGoal(target = 3): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/v1/weekly-goals')
      .set(auth())
      .send({
        targetCount: target,
        activityTypes: ['corrida', 'musculacao'],
        startsAt: new Date().toISOString(),
        preferredDays: [1, 3, 5],
      })
      .expect(201);
  }

  function activityOp(entityId: string, operationId: string) {
    const now = new Date().toISOString();
    return {
      operationId,
      entityType: 'activity',
      entityId,
      operationType: 'upsert',
      updatedAt: now,
      payload: {
        clientGeneratedId: entityId,
        activityType: 'corrida',
        perceivedIntensity: 'moderada',
        durationMinutes: 40,
        occurredAt: now,
        hasLocalPhoto: false,
      },
    };
  }

  it('processa uma operação de atividade e recalcula o progresso', async () => {
    await setGoal(3);
    const entityId = randomUUID();
    const res = await request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .set(auth())
      .send({ deviceId: randomUUID(), operations: [activityOp(entityId, randomUUID())] })
      .expect(200);

    expect(res.body.processedOperationIds).toHaveLength(1);
    expect(res.body.failedOperations).toHaveLength(0);

    const progress = await request(app.getHttpServer())
      .get('/api/v1/progress/current-week')
      .set(auth())
      .expect(200);
    expect(progress.body.validActivityCount).toBe(1);
  });

  it('é idempotente: reenviar a mesma operationId não duplica', async () => {
    await setGoal(3);
    const entityId = randomUUID();
    const operationId = randomUUID();
    const deviceId = randomUUID();
    const op = activityOp(entityId, operationId);

    await request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .set(auth())
      .send({ deviceId, operations: [op] })
      .expect(200);

    const second = await request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .set(auth())
      .send({ deviceId, operations: [op] })
      .expect(200);
    expect(second.body.processedOperationIds).toContain(operationId);

    const activities = await request(app.getHttpServer())
      .get('/api/v1/activities')
      .set(auth())
      .expect(200);
    expect(activities.body.items).toHaveLength(1);
  });

  it('conta apenas 1 dia válido por dia — mesmo com categorias diferentes (economia v2)', async () => {
    await setGoal(3);
    const day = new Date();
    const mk = (hour: number, activityType: string, durationMinutes = 30) => {
      const d = new Date(day);
      d.setUTCHours(hour, 0, 0, 0);
      const id = randomUUID();
      return {
        operationId: randomUUID(),
        entityType: 'activity',
        entityId: id,
        operationType: 'upsert',
        updatedAt: d.toISOString(),
        payload: {
          clientGeneratedId: id,
          activityType,
          perceivedIntensity: 'leve',
          durationMinutes,
          occurredAt: d.toISOString(),
          hasLocalPhoto: false,
        },
      };
    };
    // Duas categorias distintas + uma curta (não elegível) no MESMO dia.
    await request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .set(auth())
      .send({
        deviceId: randomUUID(),
        operations: [mk(9, 'corrida'), mk(14, 'musculacao'), mk(18, 'mobilidade', 5)],
      })
      .expect(200);

    const progress = await request(app.getHttpServer())
      .get('/api/v1/progress/current-week')
      .set(auth())
      .expect(200);
    // Três atividades no mesmo dia (uma curta) → conta 1 DIA válido.
    expect(progress.body.validActivityCount).toBe(1);
  });

  it('atividade abaixo do mínimo de duração não conta como dia válido', async () => {
    await setGoal(3);
    const d = new Date();
    d.setUTCHours(10, 0, 0, 0);
    const id = randomUUID();
    await request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .set(auth())
      .send({
        deviceId: randomUUID(),
        operations: [
          {
            operationId: randomUUID(),
            entityType: 'activity',
            entityId: id,
            operationType: 'upsert',
            updatedAt: d.toISOString(),
            payload: {
              clientGeneratedId: id,
              activityType: 'corrida',
              perceivedIntensity: 'leve',
              durationMinutes: 5,
              occurredAt: d.toISOString(),
              hasLocalPhoto: false,
            },
          },
        ],
      })
      .expect(200);

    const progress = await request(app.getHttpServer())
      .get('/api/v1/progress/current-week')
      .set(auth())
      .expect(200);
    expect(progress.body.validActivityCount).toBe(0);
  });

  it('não confia em XP/atributos agregados do cliente e recalcula 100%/25%/0%', async () => {
    const now = new Date();
    now.setUTCHours(12, 0, 0, 0);
    const creatureId = randomUUID();
    const creatureOp = {
      operationId: randomUUID(), entityType: 'user_creature', entityId: creatureId,
      operationType: 'upsert', updatedAt: now.toISOString(),
      payload: {
        creatureKey: 'terravok', level: 99, xp: 999999, evolutionStage: 2,
        strength: 999, endurance: 999, agility: 999, discipline: 999,
        recovery: 999, spirit: 999, health: 999, energy: 0, defeatedMilestones: ['fake-boss'],
      },
    };
    const activityIds = [randomUUID(), randomUUID(), randomUUID()];
    const activities = activityIds.map((id, index) => {
      const occurredAt = new Date(now.getTime() + index * 60_000).toISOString();
      return {
        ...activityOp(id, randomUUID()),
        updatedAt: occurredAt,
        payload: {
          clientGeneratedId: id, activityType: 'corrida', perceivedIntensity: 'moderada',
          durationMinutes: 40, occurredAt, hasLocalPhoto: false,
        },
      };
    });
    await request(app.getHttpServer())
      .post('/api/v1/sync/push').set(auth())
      .send({ deviceId: randomUUID(), operations: [creatureOp, ...activities] })
      .expect(200);

    const creature = await prisma.userCreature.findUniqueOrThrow({ where: { userId: user.userId } });
    const rewards = await prisma.activityReward.findMany({
      where: { activityId: { in: activityIds } }, orderBy: { activity: { occurredAt: 'asc' } },
    });
    expect(creature.level).toBeLessThan(99);
    expect(creature.strength).toBeLessThan(999);
    expect(creature.defeatedMilestones).toEqual([]);
    expect(rewards).toHaveLength(3);
    expect(rewards[1]!.xpGranted).toBe(Math.round(rewards[0]!.xpGranted * 0.25));
    expect(rewards[2]!.xpGranted).toBe(0);
    expect(creature.xp).toBe(rewards.reduce((sum, reward) => sum + reward.xpGranted, 0));
  });

  it('ao excluir a primeira atividade, promove e recalcula as seguintes', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/creatures/select').set(auth()).send({ creatureKey: 'terravok' }).expect(201);
    const base = new Date();
    base.setUTCHours(9, 0, 0, 0);
    const ids = [randomUUID(), randomUUID(), randomUUID()];
    const operations = ids.map((id, index) => {
      const occurredAt = new Date(base.getTime() + index * 60_000).toISOString();
      return {
        ...activityOp(id, randomUUID()), updatedAt: occurredAt,
        payload: {
          clientGeneratedId: id, activityType: 'corrida', perceivedIntensity: 'leve',
          durationMinutes: 30, occurredAt, hasLocalPhoto: false,
        },
      };
    });
    await request(app.getHttpServer()).post('/api/v1/sync/push').set(auth())
      .send({ deviceId: randomUUID(), operations }).expect(200);
    const before = await prisma.activityReward.findUniqueOrThrow({ where: { activityId: ids[1] } });

    await request(app.getHttpServer()).post('/api/v1/sync/push').set(auth())
      .send({ deviceId: randomUUID(), operations: [{
        operationId: randomUUID(), entityType: 'activity', entityId: ids[0],
        operationType: 'delete', updatedAt: new Date(Date.now() + 1000).toISOString(), payload: {},
      }] }).expect(200);
    const promoted = await prisma.activityReward.findUniqueOrThrow({ where: { activityId: ids[1] } });
    const third = await prisma.activityReward.findUniqueOrThrow({ where: { activityId: ids[2] } });
    expect(promoted.xpGranted).toBeGreaterThan(before.xpGranted);
    expect(third.xpGranted).toBe(before.xpGranted);
    expect(await prisma.activityReward.findUnique({ where: { activityId: ids[0] } })).toBeNull();
  });

  it('sincroniza e recupera a aparência modular do Explorador', async () => {
    const profile = await prisma.profile.findUniqueOrThrow({ where: { userId: user.userId } });
    const avatarAppearance = {
      bodyModel: 'feminine', skinToneKey: 'deep', hairStyleKey: 'curly',
      hairColorKey: 'silver', outfitKey: 'constellation',
    };
    const pushed = await request(app.getHttpServer())
      .post('/api/v1/sync/push').set(auth())
      .send({
        deviceId: randomUUID(),
        operations: [{
          operationId: randomUUID(), entityType: 'profile', entityId: profile.id,
          operationType: 'upsert', updatedAt: new Date().toISOString(),
          payload: { avatarAppearance },
        }],
      }).expect(200);
    expect(pushed.body.failedOperations).toHaveLength(0);
    expect((await prisma.profile.findUniqueOrThrow({ where: { userId: user.userId } })).avatarAppearance)
      .toEqual(avatarAppearance);

    const full = await request(app.getHttpServer())
      .post('/api/v1/sync/full').set(auth()).send({ deviceId: randomUUID() }).expect(200);
    const profileChange = full.body.serverChanges.find((change: { entityType: string }) => change.entityType === 'profile');
    expect(profileChange.payload.avatarAppearance).toEqual(avatarAppearance);
  });

  it('revalida carinhos, aplica 3 + 1 + 0 de Vínculo e não duplica reenvio', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/creatures/select')
      .set(auth())
      .send({ creatureKey: 'terravok' })
      .expect(201);
    const creature = await prisma.userCreature.findUniqueOrThrow({ where: { userId: user.userId } });
    const occurredAt = new Date().toISOString();
    const timezone = 'America/Sao_Paulo';
    const localDate = DateTime.fromISO(occurredAt, { zone: 'utc' }).setZone(timezone).toISODate();
    const operations = [0, 1, 2].map((index) => ({
      operationId: randomUUID(),
      entityType: 'adari_interaction',
      entityId: randomUUID(),
      operationType: 'upsert',
      updatedAt: occurredAt,
      payload: {
        clientGeneratedId: `pet-e2e-${index}`,
        userAdariId: creature.id,
        interactionType: 'pet',
        bondGranted: 20,
        satietyGranted: 0,
        occurredAt,
        localDate,
        timezone,
        calculationVersion: 1,
      },
    }));
    const deviceId = randomUUID();
    const first = await request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .set(auth())
      .send({ deviceId, operations })
      .expect(200);
    expect(first.body.failedOperations).toHaveLength(0);
    expect((await prisma.userCreature.findUniqueOrThrow({ where: { userId: user.userId } })).bond).toBe(4);
    expect(await prisma.adariInteraction.count({ where: { userId: user.userId } })).toBe(3);

    await request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .set(auth())
      .send({ deviceId, operations })
      .expect(200);
    expect(await prisma.adariInteraction.count({ where: { userId: user.userId } })).toBe(3);
  });

  it('revalida alimento favorito, inventário, Saciedade e prêmio enviado', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/creatures/select')
      .set(auth())
      .send({ creatureKey: 'lumora' })
      .expect(201);
    const creature = await prisma.userCreature.findUniqueOrThrow({ where: { userId: user.userId } });
    const occurredAt = new Date().toISOString();
    const timezone = 'America/Sao_Paulo';
    const localDate = DateTime.fromISO(occurredAt, { zone: 'utc' }).setZone(timezone).toISODate();
    await request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .set(auth())
      .send({
        deviceId: randomUUID(),
        operations: [{
          operationId: randomUUID(),
          entityType: 'adari_interaction',
          entityId: randomUUID(),
          operationType: 'upsert',
          updatedAt: occurredAt,
          payload: {
            clientGeneratedId: 'feed-e2e-favorite',
            userAdariId: creature.id,
            interactionType: 'feed',
            foodDefinitionId: 'food-astral-fruit',
            bondGranted: 20,
            satietyGranted: 99,
            occurredAt,
            localDate,
            timezone,
            calculationVersion: 1,
          },
        }],
      })
      .expect(200);

    const updated = await prisma.userCreature.findUniqueOrThrow({ where: { userId: user.userId } });
    const interaction = await prisma.adariInteraction.findFirstOrThrow({ where: { userId: user.userId } });
    const inventory = await prisma.userFoodInventory.findUniqueOrThrow({
      where: { userId_foodDefinitionId: { userId: user.userId, foodDefinitionId: 'food-astral-fruit' } },
    });
    expect(updated.bond).toBe(2);
    expect(updated.satiety).toBe(87);
    expect(interaction).toMatchObject({ bondGranted: 2, satietyGranted: 27, serverFlagged: true });
    expect(inventory.quantity).toBe(0);
  });
});
