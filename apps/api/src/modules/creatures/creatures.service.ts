import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CREATURES,
  REGIONS,
  ADVERSARIES,
  getCreatureByKey,
  type SelectCreatureInput,
  type UpdateCreatureInput,
} from '@ad-sidera/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CreaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Conteúdo estático versionado (fonte única em @ad-sidera/shared). */
  getDefinitions() {
    return { creatures: CREATURES, regions: REGIONS, adversaries: ADVERSARIES };
  }

  async getMine(userId: string) {
    const creature = await this.prisma.userCreature.findUnique({ where: { userId } });
    if (!creature) {
      throw new NotFoundException('Nenhuma criatura selecionada.');
    }
    return creature;
  }

  async select(userId: string, input: SelectCreatureInput) {
    const existing = await this.prisma.userCreature.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException('Você já possui uma criatura.');
    }
    const definition = getCreatureByKey(input.creatureKey);
    if (!definition) {
      throw new NotFoundException('Criatura desconhecida.');
    }

    const base = definition.baseStats;
    await this.audit.log({ userId, action: 'creature.select', metadata: { key: input.creatureKey } });
    return this.prisma.userCreature.create({
      data: {
        userId,
        creatureKey: definition.key,
        nickname: input.nickname ?? null,
        level: 1,
        xp: 0,
        evolutionStage: 0,
        strength: base.strength,
        endurance: base.endurance,
        agility: base.agility,
        discipline: base.discipline,
        recovery: base.recovery,
        spirit: base.spirit,
        health: base.health,
        energy: base.energy,
      },
    });
  }

  async update(userId: string, input: UpdateCreatureInput) {
    await this.getMine(userId);
    return this.prisma.userCreature.update({ where: { userId }, data: { nickname: input.nickname } });
  }
}
