import { Injectable, NotFoundException } from '@nestjs/common';
import type { UpdateProfileInput } from '@ad-sidera/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TokenService } from '../auth/token.service';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  async get(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Perfil não encontrado.');
    }
    return profile;
  }

  async update(userId: string, input: UpdateProfileInput) {
    await this.get(userId);
    // `avatarAppearance` (Explorador) segue aceito por compatibilidade com
    // clientes antigos, mas nunca é escrito. Ver updateProfileSchema.
    const { avatarAppearance: _removedExplorer, ...data } = input;
    return this.prisma.profile.update({ where: { userId }, data });
  }

  /** Exportação de dados (LGPD). Nunca inclui fotos nem caminhos de fotos. */
  async exportData(userId: string) {
    const [profile, creature, activities, goals, progress, memberships, notifications] =
      await Promise.all([
        this.prisma.profile.findUnique({ where: { userId } }),
        this.prisma.userCreature.findUnique({ where: { userId } }),
        this.prisma.activity.findMany({
          where: { userId, deletedAt: null },
          include: { reward: true },
          orderBy: { occurredAt: 'desc' },
        }),
        this.prisma.weeklyGoal.findMany({ where: { userId } }),
        this.prisma.weeklyProgress.findMany({ where: { userId } }),
        this.prisma.leagueMember.findMany({
          where: { userId },
          include: { league: { select: { id: true, name: true } } },
        }),
        this.prisma.notificationPreference.findUnique({ where: { userId } }),
      ]);

    await this.audit.log({ userId, action: 'profile.export' });

    return {
      exportedAt: new Date().toISOString(),
      profile,
      creature,
      activities: activities.map((a) => ({
        ...a,
        // Garantia extra: nunca expor caminho/foto na exportação.
        hasLocalPhoto: a.hasLocalPhoto,
        remotePhotoKey: undefined,
      })),
      weeklyGoals: goals,
      weeklyProgress: progress,
      leagues: memberships,
      notificationPreferences: notifications,
    };
  }

  /** Exclusão de conta (LGPD): apaga o usuário e, em cascata, seus dados. */
  async deleteAccount(userId: string): Promise<void> {
    await this.audit.log({ userId, action: 'profile.delete_account' });
    await this.tokens.revokeAllForUser(userId);
    await this.prisma.user.delete({ where: { id: userId } });
  }
}
