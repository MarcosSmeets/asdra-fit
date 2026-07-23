import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthTokens } from '@ad-sidera/shared';
import { durationToSeconds } from '../../common/duration';
import { randomToken, sha256 } from '../../common/hashing';
import type { Env } from '../../config/env.validation';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {}

  private get accessSeconds(): number {
    return durationToSeconds(this.config.get('JWT_ACCESS_EXPIRES_IN', { infer: true }));
  }

  private get refreshSeconds(): number {
    return durationToSeconds(this.config.get('JWT_REFRESH_EXPIRES_IN', { infer: true }));
  }

  async issueAccessToken(userId: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, type: 'access' },
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: this.accessSeconds,
      },
    );
  }

  private async createRefreshToken(
    userId: string,
    deviceId?: string | null,
  ): Promise<{ token: string; id: string }> {
    const token = randomToken();
    const expiresAt = new Date(Date.now() + this.refreshSeconds * 1000);
    const record = await this.prisma.refreshToken.create({
      data: { userId, tokenHash: sha256(token), deviceId: deviceId ?? null, expiresAt },
    });
    return { token, id: record.id };
  }

  async issueTokens(userId: string, deviceId?: string | null): Promise<AuthTokens> {
    const [accessToken, refresh] = await Promise.all([
      this.issueAccessToken(userId),
      this.createRefreshToken(userId, deviceId),
    ]);
    return { accessToken, refreshToken: refresh.token, expiresIn: this.accessSeconds };
  }

  /** Rotaciona o refresh token: revoga o antigo e emite um novo par. */
  async rotate(rawRefreshToken: string): Promise<AuthTokens> {
    const tokenHash = sha256(rawRefreshToken);
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!existing || existing.revokedAt || existing.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    const accessToken = await this.issueAccessToken(existing.userId);
    const next = await this.createRefreshToken(existing.userId, existing.deviceId);
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedByTokenId: next.id },
    });

    return { accessToken, refreshToken: next.token, expiresIn: this.accessSeconds };
  }

  async revokeByToken(rawRefreshToken: string): Promise<void> {
    const tokenHash = sha256(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
