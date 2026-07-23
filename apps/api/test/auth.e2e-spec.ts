import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanDatabase, createTestApp } from './e2e-utils';
import type { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  const validUser = {
    displayName: 'Teste',
    email: 'teste@adsidera.dev',
    password: 'SenhaForte123',
    timezone: 'America/Sao_Paulo',
  };

  it('registra, autentica e retorna o usuário logado', async () => {
    const register = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(validUser)
      .expect(201);
    expect(register.body.tokens.accessToken).toBeDefined();
    expect(register.body.user.email).toBe('teste@adsidera.dev');

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password })
      .expect(200);
    const accessToken = login.body.tokens.accessToken as string;

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(me.body.email).toBe('teste@adsidera.dev');
  });

  it('rejeita e-mail duplicado com 409', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(validUser).expect(201);
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(validUser).expect(409);
  });

  it('rejeita senha incorreta com 401 (mesma mensagem, sem enumeração)', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(validUser).expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: 'errada' })
      .expect(401);
  });

  it('rejeita senha fraca na validação (Zod)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...validUser, password: '123' })
      .expect(400);
  });

  it('rotaciona o refresh token e revoga o antigo', async () => {
    const register = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(validUser)
      .expect(201);
    const oldRefresh = register.body.tokens.refreshToken as string;

    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(200);
    expect(refreshed.body.refreshToken).toBeDefined();
    expect(refreshed.body.refreshToken).not.toBe(oldRefresh);

    // O refresh antigo foi revogado (rotação): não pode ser reutilizado.
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(401);
  });

  it('bloqueia rota protegida sem token (401)', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('converte perfil local de forma idempotente pelo operationId', async () => {
    const input = {
      ...validUser,
      operationId: '11111111-1111-4111-8111-111111111111',
      localProfileId: '22222222-2222-4222-8222-222222222222',
    };
    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/local-profile/convert')
      .send(input)
      .expect(201);
    const retry = await request(app.getHttpServer())
      .post('/api/v1/auth/local-profile/convert')
      .send(input)
      .expect(201);

    expect(retry.body.user.id).toBe(first.body.user.id);
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.localProfileConversion.count()).toBe(1);
  });

  it('não permite reutilizar a operação de conversão com outras credenciais', async () => {
    const input = {
      ...validUser,
      operationId: '33333333-3333-4333-8333-333333333333',
      localProfileId: '44444444-4444-4444-8444-444444444444',
    };
    await request(app.getHttpServer()).post('/api/v1/auth/local-profile/convert').send(input).expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/auth/local-profile/convert')
      .send({ ...input, password: 'OutraSenha123' })
      .expect(409);
  });
});
