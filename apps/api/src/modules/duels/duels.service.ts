import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  BATTLE_VIGOR_COST,
  creatureToCombatant,
  DUEL,
  getDayKey,
  resolveEquippedAbilities,
  simulateDuel,
  type AttributeSet,
  type Combatant,
} from '@ad-sidera/shared';
import type { Prisma, UserCreature } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';

interface OpponentDisplay {
  userId: string;
  displayName: string;
  avatarType: string;
  creatureKey: string;
  creatureLevel: number | null;
}

@Injectable()
export class DuelsService {
  constructor(private readonly prisma: PrismaService) {}

  private attributesOf(creature: UserCreature): AttributeSet {
    return {
      strength: creature.strength,
      endurance: creature.endurance,
      agility: creature.agility,
      discipline: creature.discipline,
      recovery: creature.recovery,
      spirit: creature.spirit,
      health: creature.health,
      energy: creature.energy,
    };
  }

  private toCombatant(
    creature: UserCreature,
    displayName: string,
    profile: Combatant['behaviorProfile'],
  ): Combatant {
    const abilities = resolveEquippedAbilities(
      creature.creatureKey,
      creature.level,
      creature.equippedAbilities,
    );
    const base = creatureToCombatant(creature.userId, displayName, this.attributesOf(creature), abilities);
    return { ...base, behaviorProfile: profile };
  }

  /** IDs de liga ativos do usuário. */
  private async activeLeagueIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.leagueMember.findMany({
      where: { userId, leftAt: null },
      select: { leagueId: true },
    });
    return memberships.map((m) => m.leagueId);
  }

  /** Membros das ligas do usuário (possíveis oponentes) — só quem já tem Adari. */
  async opponents(userId: string): Promise<OpponentDisplay[]> {
    const leagueIds = await this.activeLeagueIds(userId);
    if (leagueIds.length === 0) {
      return [];
    }
    const members = await this.prisma.leagueMember.findMany({
      where: { leagueId: { in: leagueIds }, leftAt: null, userId: { not: userId } },
      select: { userId: true },
    });
    const opponentIds = [...new Set(members.map((m) => m.userId))];
    if (opponentIds.length === 0) {
      return [];
    }
    const [profiles, creatures] = await Promise.all([
      this.prisma.profile.findMany({ where: { userId: { in: opponentIds } } }),
      this.prisma.userCreature.findMany({ where: { userId: { in: opponentIds } } }),
    ]);
    const creatureByUser = new Map(creatures.map((c) => [c.userId, c]));
    const displays: OpponentDisplay[] = [];
    for (const profile of profiles) {
      const creature = creatureByUser.get(profile.userId);
      if (!creature) {
        continue; // sem Adari → não pode duelar
      }
      displays.push({
        userId: profile.userId,
        displayName: profile.displayName,
        avatarType: profile.avatarType,
        creatureKey: creature.creatureKey,
        creatureLevel: profile.shareCreatureLevel ? creature.level : null,
      });
    }
    return displays;
  }

  /** Cria e RESOLVE um duelo (server-authoritative, determinístico). Sem XP/atributos. */
  async create(userId: string, opponentUserId: string) {
    if (userId === opponentUserId) {
      throw new BadRequestException('Não é possível duelar consigo mesmo.');
    }

    // Precisa haver uma liga em comum (amigos = membros da mesma liga).
    const [mine, theirs] = await Promise.all([
      this.activeLeagueIds(userId),
      this.activeLeagueIds(opponentUserId),
    ]);
    const mySet = new Set(mine);
    const sharedLeagueId = theirs.find((id) => mySet.has(id));
    if (!sharedLeagueId) {
      throw new ForbiddenException('Vocês não estão na mesma liga.');
    }

    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    const timezone = profile?.timezone ?? 'UTC';
    const dayKey = getDayKey(new Date(), timezone);

    const todayCount = await this.prisma.duelSession.count({
      where: { challengerId: userId, opponentId: opponentUserId, dayKey },
    });
    if (todayCount >= DUEL.DAILY_CHALLENGES_PER_OPPONENT) {
      throw new ForbiddenException(
        `Limite de ${DUEL.DAILY_CHALLENGES_PER_OPPONENT} duelos com este amigo hoje atingido.`,
      );
    }

    const [challengerCreature, opponentCreature] = await Promise.all([
      this.prisma.userCreature.findUnique({ where: { userId } }),
      this.prisma.userCreature.findUnique({ where: { userId: opponentUserId } }),
    ]);
    if (!challengerCreature) {
      throw new BadRequestException('Seu Adari ainda não está pronto.');
    }
    if (!opponentCreature) {
      throw new BadRequestException('Este amigo ainda não tem um Adari.');
    }

    // Verificação leve de Vigor (o débito de Vigor é feito no cliente — client-authoritative).
    const cost = BATTLE_VIGOR_COST.friendlyDuel;
    if (challengerCreature.energy < cost) {
      throw new ForbiddenException('Vigor insuficiente para um duelo. Descanse um pouco.');
    }

    const [challengerProfile, opponentProfile] = await Promise.all([
      this.prisma.profile.findUnique({ where: { userId } }),
      this.prisma.profile.findUnique({ where: { userId: opponentUserId } }),
    ]);
    const challengerCombatant = this.toCombatant(
      challengerCreature,
      challengerProfile?.displayName ?? 'Você',
      'adaptive',
    );
    const opponentCombatant = this.toCombatant(
      opponentCreature,
      opponentProfile?.displayName ?? 'Oponente',
      'defensive',
    );

    const seed = randomInt(1, 2_147_483_647);
    const outcome = simulateDuel(challengerCombatant, opponentCombatant, seed);

    const duel = await this.prisma.duelSession.create({
      data: {
        challengerId: userId,
        opponentId: opponentUserId,
        leagueId: sharedLeagueId,
        dayKey,
        seed,
        winner: outcome.winner,
        rounds: outcome.rounds,
        challengerSnapshot: challengerCombatant as unknown as Prisma.InputJsonValue,
        opponentSnapshot: opponentCombatant as unknown as Prisma.InputJsonValue,
        vigorSpent: cost,
      },
    });

    return {
      id: duel.id,
      seed,
      winner: outcome.winner,
      rounds: outcome.rounds,
      challengerHealth: outcome.challengerHealth,
      opponentHealth: outcome.opponentHealth,
      vigorSpent: cost,
      challenger: challengerCombatant,
      opponent: opponentCombatant,
      opponentName: opponentProfile?.displayName ?? 'Oponente',
    };
  }

  /** Histórico de duelos do usuário (como desafiante ou oponente). */
  async list(userId: string) {
    const duels = await this.prisma.duelSession.findMany({
      where: { OR: [{ challengerId: userId }, { opponentId: userId }] },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const otherIds = [
      ...new Set(duels.map((d) => (d.challengerId === userId ? d.opponentId : d.challengerId))),
    ];
    const profiles = await this.prisma.profile.findMany({ where: { userId: { in: otherIds } } });
    const nameByUser = new Map(profiles.map((p) => [p.userId, p.displayName]));

    return duels.map((d) => {
      const asChallenger = d.challengerId === userId;
      const otherId = asChallenger ? d.opponentId : d.challengerId;
      const youWon =
        (asChallenger && d.winner === 'challenger') || (!asChallenger && d.winner === 'opponent');
      return {
        id: d.id,
        role: asChallenger ? 'challenger' : 'opponent',
        opponentUserId: otherId,
        opponentName: nameByUser.get(otherId) ?? 'Explorador',
        result: d.winner === 'draw' ? 'draw' : youWon ? 'win' : 'loss',
        rounds: d.rounds,
        seed: d.seed,
        createdAt: d.createdAt.toISOString(),
      };
    });
  }
}
