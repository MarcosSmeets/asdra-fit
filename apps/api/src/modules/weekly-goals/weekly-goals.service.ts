import { Injectable, NotFoundException } from '@nestjs/common';
import type { UpdateWeeklyGoalInput, WeeklyGoalInput } from '@ad-sidera/shared';
import type { WeeklyGoal } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WeeklyGoalsService {
  constructor(private readonly prisma: PrismaService) {}

  findActive(userId: string): Promise<WeeklyGoal | null> {
    return this.prisma.weeklyGoal.findFirst({
      where: { userId, active: true },
      orderBy: { startsAt: 'desc' },
    });
  }

  async getCurrent(userId: string): Promise<WeeklyGoal> {
    const goal = await this.findActive(userId);
    if (!goal) {
      throw new NotFoundException('Nenhuma meta semanal ativa.');
    }
    return goal;
  }

  async create(userId: string, input: WeeklyGoalInput): Promise<WeeklyGoal> {
    return this.prisma.$transaction(async (tx) => {
      await tx.weeklyGoal.updateMany({
        where: { userId, active: true },
        data: { active: false, endsAt: new Date() },
      });
      return tx.weeklyGoal.create({
        data: {
          userId,
          targetCount: input.targetCount,
          preferredDays: input.preferredDays,
          activityTypes: input.activityTypes,
          startsAt: new Date(input.startsAt),
          allowExtraActivities: input.allowExtraActivities,
          active: true,
        },
      });
    });
  }

  async updateCurrent(userId: string, input: UpdateWeeklyGoalInput): Promise<WeeklyGoal> {
    const goal = await this.getCurrent(userId);
    return this.prisma.weeklyGoal.update({
      where: { id: goal.id },
      data: {
        targetCount: input.targetCount,
        preferredDays: input.preferredDays,
        activityTypes: input.activityTypes,
        startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
        allowExtraActivities: input.allowExtraActivities,
      },
    });
  }

  history(userId: string): Promise<WeeklyGoal[]> {
    return this.prisma.weeklyGoal.findMany({ where: { userId }, orderBy: { startsAt: 'desc' } });
  }
}
