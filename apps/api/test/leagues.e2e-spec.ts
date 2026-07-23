import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanDatabase, createTestApp, registerUser, type RegisteredUser } from './e2e-utils';
import type { PrismaService } from '../src/prisma/prisma.service';

describe('Leagues (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let owner: RegisteredUser;
  let friend: RegisteredUser;
  let outsider: RegisteredUser;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    owner = await registerUser(app, 'owner@adsidera.dev', 'Dona');
    friend = await registerUser(app, 'friend@adsidera.dev', 'Amigo');
    outsider = await registerUser(app, 'outsider@adsidera.dev', 'Estranho');
  });

  const auth = (u: RegisteredUser) => ({ Authorization: `Bearer ${u.accessToken}` });

  it('cria liga, gera código, amigo entra e aparece no ranking', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/leagues')
      .set(auth(owner))
      .send({ name: 'Liga dos Amigos' })
      .expect(201);
    const code = created.body.inviteCode as string;
    expect(code).toBeTruthy();
    expect(created.body.isOwner).toBe(true);

    await request(app.getHttpServer())
      .post('/api/v1/leagues/join')
      .set(auth(friend))
      .send({ code })
      .expect(201);

    const leagueId = created.body.id as string;
    const members = await request(app.getHttpServer())
      .get(`/api/v1/leagues/${leagueId}/members`)
      .set(auth(friend))
      .expect(200);
    expect(members.body).toHaveLength(2);
    // Sem fotos nos participantes.
    expect(JSON.stringify(members.body)).not.toContain('photo');

    const ranking = await request(app.getHttpServer())
      .get(`/api/v1/leagues/${leagueId}/ranking`)
      .set(auth(friend))
      .expect(200);
    expect(ranking.body.ranking).toHaveLength(2);
    expect(ranking.body.ranking[0]).toHaveProperty('finalScore');
    expect(JSON.stringify(ranking.body)).not.toContain('photo');
  });

  it('não membro não acessa a liga (403)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/leagues')
      .set(auth(owner))
      .send({ name: 'Privada' })
      .expect(201);
    await request(app.getHttpServer())
      .get(`/api/v1/leagues/${created.body.id}/ranking`)
      .set(auth(outsider))
      .expect(403);
  });

  it('apenas o administrador exclui a liga (403 para membro)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/leagues')
      .set(auth(owner))
      .send({ name: 'Liga' })
      .expect(201);
    const code = created.body.inviteCode as string;
    await request(app.getHttpServer())
      .post('/api/v1/leagues/join')
      .set(auth(friend))
      .send({ code })
      .expect(201);
    await request(app.getHttpServer())
      .delete(`/api/v1/leagues/${created.body.id}`)
      .set(auth(friend))
      .expect(403);
  });

  it('rejeita código de convite inválido (404)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/leagues/join')
      .set(auth(friend))
      .send({ code: 'ZZZZ9999' })
      .expect(404);
  });
});
