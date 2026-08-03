import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  AuthTokens,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  ConvertLocalProfileInput,
} from '@ad-sidera/shared';
import { hashPassword, secureRandomInt, sha256, verifyPassword } from '../../common/hashing';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { MailerService } from './mailer.service';
import { TokenService } from './token.service';

const RESET_CODE_TTL_MINUTES = 30;
const RESET_CODE_MAX_ATTEMPTS = 5;

export interface AuthUserSummary {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  hasCreature: boolean;
}

export interface AuthResult {
  user: AuthUserSummary;
  tokens: AuthTokens;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
    private readonly mailer: MailerService,
  ) {}

  async register(input: RegisterInput, correlationId?: string): Promise<AuthResult> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('E-mail já cadastrado.');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email: input.email.toLowerCase(), passwordHash },
      });
      await tx.profile.create({
        data: {
          userId: created.id,
          displayName: input.displayName,
          timezone: input.timezone,
        },
      });
      await tx.notificationPreference.create({
        data: { userId: created.id, timezone: input.timezone },
      });
      return created;
    });

    await this.audit.log({ userId: user.id, action: 'auth.register', correlationId });
    const tokens = await this.tokens.issueTokens(user.id);
    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: input.displayName,
        timezone: input.timezone,
        hasCreature: false,
      },
      tokens,
    };
  }

  async convertLocalProfile(
    input: ConvertLocalProfileInput,
    correlationId?: string,
  ): Promise<AuthResult> {
    const previous = await this.prisma.localProfileConversion.findUnique({
      where: { operationId: input.operationId },
      include: { user: true },
    });
    if (previous) {
      const valid = await verifyPassword(previous.user.passwordHash, input.password);
      if (!valid || previous.user.email !== input.email.toLowerCase()) {
        throw new ConflictException('Esta conversão já pertence a outra conta.');
      }
      const tokens = await this.tokens.issueTokens(previous.userId);
      return { user: await this.summary(previous.userId), tokens };
    }

    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('E-mail já cadastrado. Entre na conta existente.');
    }
    const passwordHash = await hashPassword(input.password);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email: input.email.toLowerCase(), passwordHash },
      });
      await tx.profile.create({
        data: { userId: created.id, displayName: input.displayName, timezone: input.timezone },
      });
      await tx.notificationPreference.create({
        data: { userId: created.id, timezone: input.timezone },
      });
      await tx.localProfileConversion.create({
        data: {
          operationId: input.operationId,
          localProfileId: input.localProfileId,
          userId: created.id,
          status: 'linkingProfile',
        },
      });
      return created;
    });
    await this.audit.log({
      userId: user.id,
      action: 'auth.local_profile_conversion_started',
      entityId: input.operationId,
      correlationId,
    });
    const tokens = await this.tokens.issueTokens(user.id);
    return { user: await this.summary(user.id), tokens };
  }

  async completeLocalProfileConversion(userId: string, operationId: string): Promise<void> {
    const conversion = await this.prisma.localProfileConversion.findFirst({
      where: { userId, operationId },
    });
    if (!conversion) {
      throw new UnauthorizedException('Conversão não encontrada para esta conta.');
    }
    await this.prisma.localProfileConversion.update({
      where: { id: conversion.id },
      data: { status: 'completed' },
    });
  }

  async login(input: LoginInput, correlationId?: string): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email);
    // Mesma mensagem para inexistente/senha errada (evita enumeração de usuários).
    if (!user || user.status !== 'active' || user.deletedAt) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }
    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) {
      await this.audit.log({ userId: user.id, action: 'auth.login_failed', correlationId });
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    await this.audit.log({ userId: user.id, action: 'auth.login', correlationId });
    const tokens = await this.tokens.issueTokens(user.id);
    return { user: await this.summary(user.id), tokens };
  }

  /**
   * Solicita um código de redefinição. A resposta é idêntica com ou sem conta
   * cadastrada (anti-enumeração); o código só existe no e-mail (ou no log em dev).
   */
  async forgotPassword(
    input: ForgotPasswordInput,
    correlationId?: string,
  ): Promise<{ message: string }> {
    const user = await this.users.findByEmail(input.email);
    if (user && user.status === 'active' && !user.deletedAt) {
      const code = String(secureRandomInt(1_000_000)).padStart(6, '0');
      const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000);
      await this.prisma.$transaction(async (tx) => {
        // Um único código válido por conta: solicitar de novo invalida o anterior.
        await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
        await tx.passwordResetToken.create({
          data: { userId: user.id, codeHash: this.resetCodeHash(user.id, code), expiresAt },
        });
      });
      await this.audit.log({ userId: user.id, action: 'auth.password_reset_requested', correlationId });
      await this.mailer.sendPasswordResetCode({
        to: user.email,
        code,
        expiresMinutes: RESET_CODE_TTL_MINUTES,
      });
    }
    return { message: 'Se o e-mail estiver cadastrado, enviaremos um código de redefinição.' };
  }

  /** Redefine a senha com o código recebido e revoga todas as sessões ativas. */
  async resetPassword(input: ResetPasswordInput, correlationId?: string): Promise<void> {
    const invalid = (): UnauthorizedException =>
      new UnauthorizedException('Código inválido ou expirado.');
    const user = await this.users.findByEmail(input.email);
    if (!user || user.status !== 'active' || user.deletedAt) throw invalid();

    const token = await this.prisma.passwordResetToken.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (
      !token ||
      token.expiresAt.getTime() < Date.now() ||
      token.attempts >= RESET_CODE_MAX_ATTEMPTS
    ) {
      throw invalid();
    }
    if (token.codeHash !== this.resetCodeHash(user.id, input.code)) {
      await this.prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { attempts: { increment: 1 } },
      });
      await this.audit.log({ userId: user.id, action: 'auth.password_reset_failed', correlationId });
      throw invalid();
    }

    const passwordHash = await hashPassword(input.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await tx.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      });
    });
    // Sessões antigas caem: quem redefiniu é o único dono das novas credenciais.
    await this.tokens.revokeAllForUser(user.id);
    await this.audit.log({ userId: user.id, action: 'auth.password_reset_completed', correlationId });
  }

  private resetCodeHash(userId: string, code: string): string {
    return sha256(`pwreset:${userId}:${code}`);
  }

  refresh(refreshToken: string): Promise<AuthTokens> {
    return this.tokens.rotate(refreshToken);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revokeByToken(refreshToken);
  }

  async me(userId: string): Promise<AuthUserSummary> {
    return this.summary(userId);
  }

  private async summary(userId: string): Promise<AuthUserSummary> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, status: 'active', deletedAt: null },
      include: { profile: true, userCreature: { select: { id: true } } },
    });
    if (!user || !user.profile) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }
    return {
      id: user.id,
      email: user.email,
      displayName: user.profile.displayName,
      timezone: user.profile.timezone,
      hasCreature: user.userCreature !== null,
    };
  }
}
