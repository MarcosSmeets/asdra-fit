import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MailerService, type PasswordResetMail } from '../src/modules/auth/mailer.service';
import type { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase, createTestApp } from './e2e-utils';

class CapturingMailer extends MailerService {
  sent: PasswordResetMail[] = [];

  async sendPasswordResetCode(mail: PasswordResetMail): Promise<void> {
    this.sent.push(mail);
  }

  get lastCode(): string {
    return this.sent[this.sent.length - 1]?.code ?? '';
  }
}

// Atenção: forgot/reset têm throttle de 5 req / 15 min por IP compartilhado por
// instância do app. Mantenha o total de chamadas de cada endpoint ≤ 5 neste spec.
describe('Password reset (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const mailer = new CapturingMailer();

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp((builder) =>
      builder.overrideProvider(MailerService).useValue(mailer),
    ));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    mailer.sent = [];
  });

  const validUser = {
    displayName: 'Teste',
    email: 'reset@adsidera.dev',
    password: 'SenhaForte123',
    timezone: 'America/Sao_Paulo',
  };

  async function registerAndRequestCode(): Promise<string> {
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(validUser).expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: validUser.email })
      .expect(200);
    expect(mailer.lastCode).toMatch(/^\d{6}$/);
    return mailer.lastCode;
  }

  it('redefine a senha, revoga sessões antigas e o código é de uso único', async () => {
    const code = await registerAndRequestCode();

    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ email: validUser.email, code, newPassword: 'NovaSenha456' })
      .expect(204);

    // Senha antiga não entra; a nova entra.
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: 'NovaSenha456' })
      .expect(200);

    // Todas as sessões anteriores foram revogadas.
    const activeTokens = await prisma.refreshToken.count({
      where: { revokedAt: null, user: { email: validUser.email } },
    });
    expect(activeTokens).toBe(1); // apenas o do login novo

    // Código é de uso único.
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ email: validUser.email, code, newPassword: 'OutraSenha789' })
      .expect(401);
  });

  it('código errado é rejeitado e conta tentativas', async () => {
    const code = await registerAndRequestCode();
    const wrong = code === '000000' ? '000001' : '000000';

    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ email: validUser.email, code: wrong, newPassword: 'NovaSenha456' })
      .expect(401);

    const token = await prisma.passwordResetToken.findFirstOrThrow({
      where: { user: { email: validUser.email } },
    });
    expect(token.attempts).toBe(1);
    expect(token.usedAt).toBeNull();
  });

  it('responde de forma neutra para e-mail não cadastrado (anti-enumeração)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'inexistente@adsidera.dev' })
      .expect(200);
    expect(res.body.message).toContain('Se o e-mail estiver cadastrado');
    expect(mailer.sent).toHaveLength(0);
  });

  it('código expirado é rejeitado', async () => {
    const code = await registerAndRequestCode();
    await prisma.passwordResetToken.updateMany({
      where: { user: { email: validUser.email } },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ email: validUser.email, code, newPassword: 'NovaSenha456' })
      .expect(401);
  });
});
