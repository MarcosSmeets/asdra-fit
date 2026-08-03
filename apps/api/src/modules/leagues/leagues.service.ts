import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  generateInviteCode,
  type CreateInviteInput,
  type CreateLeagueInput,
  type JoinLeagueInput,
  type UpdateInviteInput,
  type UpdateLeagueInput,
} from '@ad-sidera/shared';
import type { League } from '@prisma/client';
import { secureRandomInt } from '../../common/hashing';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SeasonsService } from './seasons.service';

interface MemberDisplay {
  userId: string;
  displayName: string;
  avatarType: string;
  creatureKey: string | null;
  creatureLevel: number | null;
}

@Injectable()
export class LeaguesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasons: SeasonsService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------- helpers
  private async assertMember(userId: string, leagueId: string): Promise<League> {
    const league = await this.prisma.league.findUnique({ where: { id: leagueId } });
    if (!league) {
      throw new NotFoundException('Liga não encontrada.');
    }
    const membership = await this.prisma.leagueMember.findFirst({
      where: { leagueId, userId, leftAt: null },
    });
    if (!membership) {
      throw new ForbiddenException('Você não participa desta liga.');
    }
    return league;
  }

  private async assertOwner(userId: string, leagueId: string): Promise<League> {
    const league = await this.prisma.league.findUnique({ where: { id: leagueId } });
    if (!league) {
      throw new NotFoundException('Liga não encontrada.');
    }
    if (league.ownerId !== userId) {
      throw new ForbiddenException('Apenas o administrador pode fazer isso.');
    }
    return league;
  }

  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = generateInviteCode(secureRandomInt);
      const exists = await this.prisma.leagueInvite.findUnique({ where: { code } });
      if (!exists) {
        return code;
      }
    }
    throw new ConflictException('Não foi possível gerar um código único. Tente novamente.');
  }

  private async memberDisplays(userIds: string[]): Promise<Map<string, MemberDisplay>> {
    const [profiles, creatures] = await Promise.all([
      this.prisma.profile.findMany({ where: { userId: { in: userIds } } }),
      this.prisma.userCreature.findMany({ where: { userId: { in: userIds } } }),
    ]);
    const creatureByUser = new Map(creatures.map((c) => [c.userId, c]));
    const map = new Map<string, MemberDisplay>();
    for (const profile of profiles) {
      const creature = creatureByUser.get(profile.userId);
      map.set(profile.userId, {
        userId: profile.userId,
        displayName: profile.displayName,
        avatarType: profile.avatarType,
        // Nível da criatura só aparece se o usuário permitir (privacidade).
        creatureKey: creature?.creatureKey ?? null,
        creatureLevel: creature && profile.shareCreatureLevel ? creature.level : null,
      });
    }
    return map;
  }

  // ---------------------------------------------------------------- leagues
  async create(userId: string, input: CreateLeagueInput) {
    const code = await this.generateUniqueCode();
    const league = await this.prisma.$transaction(async (tx) => {
      const created = await tx.league.create({
        data: {
          ownerId: userId,
          name: input.name,
          description: input.description ?? null,
          maxMembers: input.maxMembers,
        },
      });
      await tx.leagueMember.create({
        data: { leagueId: created.id, userId, role: 'admin' },
      });
      await tx.leagueInvite.create({ data: { leagueId: created.id, code, active: true } });
      return created;
    });
    await this.seasons.ensureCurrentSeason(league.id);
    await this.audit.log({ userId, action: 'league.create', entityId: league.id });
    return this.get(userId, league.id);
  }

  /**
   * A lista traz o código de convite das ligas que o usuário administra.
   *
   * Sem isso, o código só existia na resposta de `POST /leagues` e em
   * `GET /leagues/:id` — o app perdia o código no instante em que recarregava a
   * lista e não tinha como recuperá-lo, deixando o dono sem como convidar
   * ninguém. A regra de privacidade é a mesma do `get`: só o dono vê.
   */
  async listMine(userId: string) {
    const leagues = await this.prisma.league.findMany({
      where: { members: { some: { userId, leftAt: null } } },
      include: {
        _count: { select: { members: { where: { leftAt: null } } } },
        invites: {
          where: { active: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { code: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return leagues.map(({ invites, ...league }) => ({
      ...league,
      isOwner: league.ownerId === userId,
      inviteCode: league.ownerId === userId ? (invites[0]?.code ?? null) : null,
    }));
  }

  async get(userId: string, leagueId: string) {
    const league = await this.assertMember(userId, leagueId);
    const [memberCount, activeInvite, currentSeason] = await Promise.all([
      this.prisma.leagueMember.count({ where: { leagueId, leftAt: null } }),
      league.ownerId === userId
        ? this.prisma.leagueInvite.findFirst({
            where: { leagueId, active: true },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve(null),
      this.seasons.ensureCurrentSeason(leagueId),
    ]);
    return {
      ...league,
      isOwner: league.ownerId === userId,
      memberCount,
      // O código só é revelado ao administrador.
      inviteCode: activeInvite?.code ?? null,
      currentSeason,
    };
  }

  async update(userId: string, leagueId: string, input: UpdateLeagueInput) {
    await this.assertOwner(userId, leagueId);
    await this.prisma.league.update({ where: { id: leagueId }, data: input });
    return this.get(userId, leagueId);
  }

  async remove(userId: string, leagueId: string): Promise<void> {
    await this.assertOwner(userId, leagueId);
    await this.audit.log({ userId, action: 'league.delete', entityId: leagueId });
    await this.prisma.league.delete({ where: { id: leagueId } });
  }

  // ---------------------------------------------------------------- invites
  async createInvite(userId: string, leagueId: string, input: CreateInviteInput) {
    await this.assertOwner(userId, leagueId);
    const code = await this.generateUniqueCode();
    return this.prisma.leagueInvite.create({
      data: {
        leagueId,
        code,
        active: true,
        expiresAt: input.expiresInDays
          ? new Date(Date.now() + input.expiresInDays * 86_400_000)
          : null,
        usageLimit: input.usageLimit ?? null,
      },
    });
  }

  async updateInvite(
    userId: string,
    leagueId: string,
    inviteId: string,
    input: UpdateInviteInput,
  ) {
    await this.assertOwner(userId, leagueId);
    const invite = await this.prisma.leagueInvite.findFirst({ where: { id: inviteId, leagueId } });
    if (!invite) {
      throw new NotFoundException('Convite não encontrado.');
    }
    const data: { active?: boolean; code?: string } = {};
    if (typeof input.active === 'boolean') {
      data.active = input.active;
    }
    if (input.regenerate) {
      data.code = await this.generateUniqueCode();
    }
    return this.prisma.leagueInvite.update({ where: { id: inviteId }, data });
  }

  // ---------------------------------------------------------------- membership
  async join(userId: string, input: JoinLeagueInput) {
    const invite = await this.prisma.leagueInvite.findUnique({ where: { code: input.code } });
    if (!invite || !invite.active) {
      throw new NotFoundException('Convite inválido.');
    }
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Convite expirado.');
    }
    if (invite.usageLimit !== null && invite.usageCount >= invite.usageLimit) {
      throw new BadRequestException('Convite atingiu o limite de usos.');
    }

    const league = await this.prisma.league.findUnique({ where: { id: invite.leagueId } });
    if (!league || league.status !== 'active') {
      throw new NotFoundException('Liga não encontrada.');
    }

    const existing = await this.prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId: league.id, userId } },
    });
    if (existing && existing.leftAt === null) {
      throw new ConflictException('Você já participa desta liga.');
    }

    const activeCount = await this.prisma.leagueMember.count({
      where: { leagueId: league.id, leftAt: null },
    });
    if (activeCount >= league.maxMembers) {
      throw new BadRequestException('A liga está cheia.');
    }

    await this.prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.leagueMember.update({
          where: { id: existing.id },
          data: { leftAt: null, joinedAt: new Date(), role: 'member' },
        });
      } else {
        await tx.leagueMember.create({
          data: { leagueId: league.id, userId, role: 'member' },
        });
      }
      await tx.leagueInvite.update({
        where: { id: invite.id },
        data: { usageCount: { increment: 1 } },
      });
    });

    await this.seasons.ensureCurrentSeason(league.id);
    await this.audit.log({ userId, action: 'league.join', entityId: league.id });
    return this.get(userId, league.id);
  }

  async leave(userId: string, leagueId: string): Promise<void> {
    const league = await this.assertMember(userId, leagueId);
    if (league.ownerId === userId) {
      throw new BadRequestException(
        'O administrador não pode sair. Exclua a liga ou transfira a administração.',
      );
    }
    await this.prisma.leagueMember.updateMany({
      where: { leagueId, userId, leftAt: null },
      data: { leftAt: new Date() },
    });
  }

  async members(userId: string, leagueId: string) {
    await this.assertMember(userId, leagueId);
    const members = await this.prisma.leagueMember.findMany({
      where: { leagueId, leftAt: null },
      orderBy: { joinedAt: 'asc' },
    });
    const displays = await this.memberDisplays(members.map((m) => m.userId));
    return members.map((m) => ({
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      ...displays.get(m.userId),
    }));
  }

  // ---------------------------------------------------------------- ranking / seasons
  async ranking(userId: string, leagueId: string) {
    await this.assertMember(userId, leagueId);
    const season = await this.seasons.ensureCurrentSeason(leagueId);
    const ranking = await this.seasons.liveRanking(leagueId, season.weekKey);
    const displays = await this.memberDisplays(ranking.map((r) => r.userId));
    return {
      season,
      ranking: ranking.map((entry) => ({
        ...entry,
        displayName: displays.get(entry.userId)?.displayName ?? '—',
        creatureKey: displays.get(entry.userId)?.creatureKey ?? null,
        creatureLevel: displays.get(entry.userId)?.creatureLevel ?? null,
      })),
    };
  }

  async listSeasons(userId: string, leagueId: string) {
    await this.assertMember(userId, leagueId);
    await this.seasons.ensureCurrentSeason(leagueId);
    return this.seasons.listSeasons(leagueId);
  }

  async getSeason(userId: string, leagueId: string, seasonId: string) {
    await this.assertMember(userId, leagueId);
    const season = await this.seasons.getSeasonWithEntries(leagueId, seasonId);
    if (!season) {
      throw new NotFoundException('Temporada não encontrada.');
    }
    const displays = await this.memberDisplays(season.entries.map((e) => e.userId));
    return {
      ...season,
      entries: season.entries.map((entry) => ({
        ...entry,
        displayName: displays.get(entry.userId)?.displayName ?? '—',
        creatureKey: displays.get(entry.userId)?.creatureKey ?? null,
        creatureLevel: displays.get(entry.userId)?.creatureLevel ?? null,
      })),
    };
  }
}
