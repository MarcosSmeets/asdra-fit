import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { DUEL } from '@ad-sidera/shared';
import { cleanDatabase, createTestApp, registerUser, type RegisteredUser } from './e2e-utils';
import type { PrismaService } from '../src/prisma/prisma.service';

describe('Duelos amistosos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let challenger: RegisteredUser;
  let opponent: RegisteredUser;
  let stranger: RegisteredUser;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  const bearer = (u: RegisteredUser) => ({ Authorization: `Bearer ${u.accessToken}` });

  async function seedCreature(u: RegisteredUser, level = 5): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .set(bearer(u))
      .send({
        deviceId: randomUUID(),
        operations: [
          {
            operationId: randomUUID(),
            entityType: 'user_creature',
            entityId: randomUUID(),
            operationType: 'upsert',
            updatedAt: new Date().toISOString(),
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

  async function sameLeague(a: RegisteredUser, b: RegisteredUser): Promise<void> {
    const created = await request(app.getHttpServer())
      .post('/api/v1/leagues')
      .set(bearer(a))
      .send({ name: 'Liga do Duelo' })
      .expect(201);
    const code = created.body.inviteCode as string;
    await request(app.getHttpServer())
      .post('/api/v1/leagues/join')
      .set(bearer(b))
      .send({ code })
      .expect(201);
  }

  beforeEach(async () => {
    await cleanDatabase(prisma);
    challenger = await registerUser(app, 'challenger@adsidera.dev', 'Desafiante');
    opponent = await registerUser(app, 'opponent@adsidera.dev', 'Oponente');
    stranger = await registerUser(app, 'stranger@adsidera.dev', 'Estranho');
    await Promise.all([seedCreature(challenger), seedCreature(opponent, 6), seedCreature(stranger)]);
    await sameLeague(challenger, opponent);
  });

  it('lista membros da mesma liga como oponentes', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/duels/opponents')
      .set(bearer(challenger))
      .expect(200);
    const ids = (res.body as { userId: string }[]).map((o) => o.userId);
    expect(ids).toContain(opponent.userId);
    expect(ids).not.toContain(stranger.userId);
    expect(ids).not.toContain(challenger.userId);
  });

  it('resolve um duelo (server-authoritative) sem conceder XP', async () => {
    const before = await prisma.userCreature.findUnique({ where: { userId: challenger.userId } });

    const res = await request(app.getHttpServer())
      .post('/api/v1/duels')
      .set(bearer(challenger))
      .send({ opponentUserId: opponent.userId })
      .expect(201);

    expect(['challenger', 'opponent', 'draw']).toContain(res.body.winner);
    expect(res.body.rounds).toBeGreaterThan(0);
    expect(res.body.vigorSpent).toBeGreaterThan(0);

    const duels = await prisma.duelSession.count({ where: { challengerId: challenger.userId } });
    expect(duels).toBe(1);

    // Duelos NÃO alteram XP/atributos (server não toca no agregado do Adari).
    const after = await prisma.userCreature.findUnique({ where: { userId: challenger.userId } });
    expect(after?.xp).toBe(before?.xp);
    expect(after?.level).toBe(before?.level);
    expect(after?.strength).toBe(before?.strength);
  });

  it('bloqueia duelo contra quem não está na mesma liga', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/duels')
      .set(bearer(challenger))
      .send({ opponentUserId: stranger.userId })
      .expect(403);
  });

  it('bloqueia duelo consigo mesmo', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/duels')
      .set(bearer(challenger))
      .send({ opponentUserId: challenger.userId })
      .expect(400);
  });

  it('respeita o limite diário de desafios por oponente', async () => {
    for (let i = 0; i < DUEL.DAILY_CHALLENGES_PER_OPPONENT; i += 1) {
      await request(app.getHttpServer())
        .post('/api/v1/duels')
        .set(bearer(challenger))
        .send({ opponentUserId: opponent.userId })
        .expect(201);
    }
    // O próximo (além do limite) é bloqueado.
    await request(app.getHttpServer())
      .post('/api/v1/duels')
      .set(bearer(challenger))
      .send({ opponentUserId: opponent.userId })
      .expect(403);
  });

  it('o oponente vê o duelo no histórico', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/duels')
      .set(bearer(challenger))
      .send({ opponentUserId: opponent.userId })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/v1/duels')
      .set(bearer(opponent))
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].role).toBe('opponent');
    expect(res.body[0].opponentName).toBe('Desafiante');
  });
});
