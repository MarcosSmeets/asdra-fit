import { Injectable, NotFoundException } from '@nestjs/common';
import type { ActivityInputDto, Paginated, UpdateActivityInput } from '@ad-sidera/shared';
import type { Activity, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ProgressionService } from '../progress/progression.service';
import type { ListActivitiesQueryDto } from './dto';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progression: ProgressionService,
  ) {}

  async list(userId: string, query: ListActivitiesQueryDto): Promise<Paginated<Activity>> {
    const where: Prisma.ActivityWhereInput = {
      userId,
      deletedAt: null,
      ...(query.activityType ? { activityType: query.activityType } : {}),
      ...(query.from || query.to
        ? {
            occurredAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const items = await this.prisma.activity.findMany({
      where,
      include: { reward: true },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > query.limit;
    const page = hasMore ? items.slice(0, query.limit) : items;
    return { items: page, nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null };
  }

  async get(userId: string, id: string): Promise<Activity> {
    const activity = await this.prisma.activity.findFirst({
      where: { id, userId, deletedAt: null },
      include: { reward: true },
    });
    if (!activity) {
      throw new NotFoundException('Atividade não encontrada.');
    }
    return activity;
  }

  async create(userId: string, input: ActivityInputDto): Promise<Activity> {
    const activity = await this.prisma.activity.create({
      data: {
        userId,
        clientGeneratedId: randomUUID(),
        activityType: input.activityType,
        occurredAt: new Date(input.occurredAt),
        durationMinutes: input.durationMinutes,
        perceivedIntensity: input.perceivedIntensity,
        notes: input.notes ?? null,
        location: input.location ?? null,
        moodBefore: input.moodBefore ?? null,
        moodAfter: input.moodAfter ?? null,
        // hasLocalPhoto/remotePhotoKey só via app (fotos nunca chegam ao backend).
        // A validade para a meta é recalculada autoritativamente pelo servidor.
        isScored: true,
      },
    });
    await this.progression.recomputeWeek(userId, activity.occurredAt);
    return activity;
  }

  async update(userId: string, id: string, input: UpdateActivityInput): Promise<Activity> {
    const current = await this.get(userId, id);
    const updated = await this.prisma.activity.update({
      where: { id },
      data: {
        activityType: input.activityType,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : undefined,
        durationMinutes: input.durationMinutes,
        perceivedIntensity: input.perceivedIntensity,
        notes: input.notes,
        location: input.location,
        moodBefore: input.moodBefore,
        moodAfter: input.moodAfter,
      },
    });
    await this.progression.recomputeWeeksFor(userId, [current.occurredAt, updated.occurredAt]);
    return updated;
  }

  async remove(userId: string, id: string): Promise<void> {
    const current = await this.get(userId, id);
    await this.prisma.activity.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.progression.recomputeWeek(userId, current.occurredAt);
  }
}
