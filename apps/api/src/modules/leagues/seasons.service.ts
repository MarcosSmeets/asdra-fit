import { Injectable } from '@nestjs/common';
import { getWeekBounds, rankLeague, type RankingInput } from '@ad-sidera/shared';
import type { LeagueSeason } from '@prisma/client';
import { PushService } from '../notifications/push.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProgressionService } from '../progress/progression.service';

@Injectable()
export class SeasonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progression: ProgressionService,
    private readonly push: PushService,
  ) {}

  private async ownerTimezone(leagueId: string): Promise<string> {
    const league = await this.prisma.league.findUnique({
      where: { id: leagueId },
      select: { owner: { select: { profile: { select: { timezone: true } } } } },
    });
    return league?.owner.profile?.timezone ?? 'UTC';
  }

  /**
   * Garante a temporada atual e finaliza (idempotentemente) temporadas passadas
   * ainda ativas. Seguro para execução concorrente/repetida.
   */
  async ensureCurrentSeason(leagueId: string): Promise<LeagueSeason> {
    const timezone = await this.ownerTimezone(leagueId);
    const bounds = getWeekBounds(new Date().toISOString(), timezone);

    // Finaliza temporadas ativas de semanas anteriores.
    const staleActive = await this.prisma.leagueSeason.findMany({
      where: { leagueId, status: 'active', weekKey: { not: bounds.weekKey } },
    });
    for (const season of staleActive) {
      await this.finalizeSeason(season.id);
    }

    const existing = await this.prisma.leagueSeason.findUnique({
      where: { leagueId_weekKey: { leagueId, weekKey: bounds.weekKey } },
    });
    if (existing) {
      return existing;
    }
    // upsert evita corrida entre requisições concorrentes.
    return this.prisma.leagueSeason.upsert({
      where: { leagueId_weekKey: { leagueId, weekKey: bounds.weekKey } },
      create: {
        leagueId,
        weekKey: bounds.weekKey,
        startsAt: new Date(bounds.weekStart),
        endsAt: new Date(bounds.weekEnd),
        status: 'active',
      },
      update: {},
    });
  }

  /** Monta os RankingInput dos membros ativos para um weekKey. */
  private async buildRankingInputs(leagueId: string, weekKey: string): Promise<RankingInput[]> {
    const members = await this.prisma.leagueMember.findMany({
      where: { leagueId, leftAt: null },
      select: { userId: true },
    });

    const inputs: RankingInput[] = [];
    for (const member of members) {
      const [progress, goal, streak] = await Promise.all([
        this.prisma.weeklyProgress.findUnique({
          where: { userId_weekKey: { userId: member.userId, weekKey } },
        }),
        this.prisma.weeklyGoal.findFirst({
          where: { userId: member.userId, active: true },
          orderBy: { startsAt: 'desc' },
        }),
        this.progression.getStreak(member.userId),
      ]);

      const targetCount = progress?.targetCount ?? goal?.targetCount ?? 1;
      inputs.push({
        userId: member.userId,
        validActivityCount: progress?.validActivityCount ?? 0,
        targetCount,
        currentStreakWeeks: streak.currentStreak,
        completed: progress?.completed ?? false,
        completedWeeksInSeason: streak.completedWeeks,
        goalCompletedAt: progress?.completedAt?.toISOString() ?? null,
      });
    }
    return inputs;
  }

  /** Ranking ao vivo (temporada ativa) — calculado, não persistido. */
  async liveRanking(leagueId: string, weekKey: string) {
    const inputs = await this.buildRankingInputs(leagueId, weekKey);
    return rankLeague(inputs);
  }

  /** Finaliza a temporada: congela o ranking, persiste posições. Idempotente. */
  async finalizeSeason(seasonId: string): Promise<void> {
    const season = await this.prisma.leagueSeason.findUnique({ where: { id: seasonId } });
    if (!season || season.status === 'finalized') {
      return;
    }
    const ranking = await this.liveRanking(season.leagueId, season.weekKey);

    const didFinalize = await this.prisma.$transaction(async (tx) => {
      // Recarrega dentro da transação para garantir idempotência sob concorrência.
      const fresh = await tx.leagueSeason.findUnique({ where: { id: seasonId } });
      if (!fresh || fresh.status === 'finalized') {
        return false;
      }
      await tx.leagueRankingEntry.deleteMany({ where: { seasonId } });
      for (const entry of ranking) {
        await tx.leagueRankingEntry.create({
          data: {
            seasonId,
            userId: entry.userId,
            goalPercentage: entry.goalPercentage,
            streakBonus: entry.streakBonus,
            completionBonus: entry.completionBonus,
            finalScore: entry.finalScore,
            position: entry.position,
          },
        });
      }
      await tx.leagueSeason.update({
        where: { id: seasonId },
        data: { status: 'finalized', finalizedAt: new Date() },
      });
      return true;
    });

    if (didFinalize) {
      // Best-effort: avisa cada membro do resultado congelado, sem tom competitivo agressivo.
      for (const entry of ranking) {
        void this.push.sendLeagueNotice(entry.userId, {
          title: 'Temporada encerrada',
          body: `O ranking da semana foi fechado — você terminou em ${entry.position}º. Uma nova semana começou!`,
          data: { type: 'season_finalized', seasonId, leagueId: season.leagueId },
        });
      }
    }
  }

  listSeasons(leagueId: string) {
    return this.prisma.leagueSeason.findMany({
      where: { leagueId },
      orderBy: { startsAt: 'desc' },
    });
  }

  getSeasonWithEntries(leagueId: string, seasonId: string) {
    return this.prisma.leagueSeason.findFirst({
      where: { id: seasonId, leagueId },
      include: { entries: { orderBy: { position: 'asc' } } },
    });
  }
}
