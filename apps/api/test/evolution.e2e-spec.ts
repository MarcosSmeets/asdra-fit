import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { getCreatureByKey, totalXpForLevel } from '@ad-sidera/shared';
import { cleanDatabase, createTestApp, registerUser, type RegisteredUser } from './e2e-utils';
import type { PrismaService } from '../src/prisma/prisma.service';

/**
 * E2E do sistema de evolução em 4 estágios (Build 5).
 * O servidor NUNCA confia no estágio enviado: valida requisitos, ordem e
 * duplicação antes de aplicar, e rematerializa atributos com o reforço
 * cumulativo do estágio.
 */
describe('Evolução (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let user: RegisteredUser;
  let creatureId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    user = await registerUser(app, 'evolution@adsidera.dev', 'Evo');
    const base = getCreatureByKey('terravok')!.baseStats;
    const creature = await prisma.userCreature.create({
      data: {
        userId: user.userId,
        creatureKey: 'terravok',
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
        energy: 100,
      },
    });
    creatureId = creature.id;
  });

  const auth = () => ({ Authorization: `Bearer ${user.accessToken}` });

  /** Satisfaz os requisitos de EV 1 com FATOS do servidor (nunca payload). */
  async function seedEv1Requirements(): Promise<void> {
    const requirements = getCreatureByKey('terravok')!.stages[1]!.requirements!;
    const xp = totalXpForLevel(requirements.minLevel);
    await prisma.userCreature.update({
      where: { id: creatureId },
      data: { level: requirements.minLevel, xp, bond: requirements.minBond },
    });
    const day = new Date('2026-07-01T10:00:00.000Z');
    for (let i = 0; i < requirements.minActivities; i += 1) {
      const at = new Date(day.getTime() + i * 86_400_000);
      await prisma.activity.create({
        data: {
          userId: user.userId,
          clientGeneratedId: randomUUID(),
          activityType: 'corrida',
          occurredAt: at,
          durationMinutes: 40,
          perceivedIntensity: 'moderada',
        },
      });
    }
    await prisma.weeklyProgress.create({
      data: {
        userId: user.userId,
        weekKey: '2026-W27',
        weekStart: new Date('2026-06-29T00:00:00.000Z'),
        weekEnd: new Date('2026-07-05T23:59:59.999Z'),
        targetCount: 3,
        validActivityCount: 3,
        percentage: 100,
        completed: true,
        completedAt: new Date('2026-07-03T10:00:00.000Z'),
      },
    });
  }

  function evolutionOp(overrides: Partial<{ fromStage: number; toStage: number; operationId: string; entityId: string }> = {}) {
    const entityId = overrides.entityId ?? randomUUID();
    return {
      operationId: overrides.operationId ?? randomUUID(),
      entityType: 'adari_evolution',
      entityId,
      operationType: 'upsert',
      updatedAt: new Date().toISOString(),
      payload: {
        clientGeneratedId: entityId,
        userAdariId: creatureId,
        fromStage: overrides.fromStage ?? 0,
        toStage: overrides.toStage ?? 1,
        unlockedAt: new Date().toISOString(),
        triggeringReason: 'requirements_met',
        calculationVersion: 2,
      },
    };
  }

  function push(operations: unknown[]) {
    return request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .set(auth())
      .send({ deviceId: randomUUID(), operations })
      .expect(200);
  }

  it('evolui BASE → EV 1 quando os requisitos são atendidos no servidor', async () => {
    await seedEv1Requirements();
    const op = evolutionOp();
    const res = await push([op]);
    expect(res.body.failedOperations).toHaveLength(0);
    expect(res.body.processedOperationIds).toContain(op.operationId);

    const creature = await prisma.userCreature.findUniqueOrThrow({ where: { id: creatureId } });
    expect(creature.evolutionStage).toBe(1);
    expect(creature.evolvedAt).not.toBeNull();
    // Materialização inclui o reforço do estágio (health base 110 + 15).
    expect(creature.health).toBe(getCreatureByKey('terravok')!.baseStats.health + 15);

    const history = await prisma.userAdariEvolutionHistory.findMany({ where: { userAdariId: creatureId } });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ fromStage: 0, toStage: 1 });

    // O pull devolve a evolução para outros aparelhos.
    const pull = await request(app.getHttpServer())
      .post('/api/v1/sync/pull')
      .set(auth())
      .send({ deviceId: randomUUID(), lastSyncAt: null })
      .expect(200);
    const evolutionChanges = pull.body.serverChanges.filter(
      (c: { entityType: string }) => c.entityType === 'adari_evolution',
    );
    expect(evolutionChanges).toHaveLength(1);
  });

  it('rejeita evolução sem requisitos atendidos (nunca confia no cliente)', async () => {
    const op = evolutionOp();
    const res = await push([op]);
    expect(res.body.processedOperationIds).not.toContain(op.operationId);
    expect(res.body.failedOperations).toHaveLength(1);
    expect(res.body.failedOperations[0].reason).toBe('validation_error');

    const creature = await prisma.userCreature.findUniqueOrThrow({ where: { id: creatureId } });
    expect(creature.evolutionStage).toBe(0);
  });

  it('não permite pular estágio (BASE → EV 2)', async () => {
    await seedEv1Requirements();
    const res = await push([evolutionOp({ fromStage: 0, toStage: 2 })]);
    expect(res.body.failedOperations).toHaveLength(1);
    const creature = await prisma.userCreature.findUniqueOrThrow({ where: { id: creatureId } });
    expect(creature.evolutionStage).toBe(0);
  });

  it('não permite regredir (EV 1 → BASE é payload inválido; EV 2 → EV 1 é transição inválida)', async () => {
    await seedEv1Requirements();
    await push([evolutionOp()]);
    const res = await push([evolutionOp({ fromStage: 2, toStage: 1 })]);
    expect(res.body.failedOperations).toHaveLength(1);
    const creature = await prisma.userCreature.findUniqueOrThrow({ where: { id: creatureId } });
    expect(creature.evolutionStage).toBe(1);
  });

  it('é idempotente: reenviar a mesma operationId ou a mesma transição não duplica', async () => {
    await seedEv1Requirements();
    const op = evolutionOp();
    await push([op]);
    // Mesma operationId.
    const again = await push([op]);
    expect(again.body.processedOperationIds).toContain(op.operationId);
    // Mesma transição com operationId nova.
    const replay = await push([evolutionOp({ fromStage: 0, toStage: 1 })]);
    expect(replay.body.failedOperations).toHaveLength(0);

    const history = await prisma.userAdariEvolutionHistory.findMany({ where: { userAdariId: creatureId } });
    expect(history).toHaveLength(1);
    const creature = await prisma.userCreature.findUniqueOrThrow({ where: { id: creatureId } });
    expect(creature.evolutionStage).toBe(1);
    // Reforço aplicado uma única vez.
    expect(creature.health).toBe(getCreatureByKey('terravok')!.baseStats.health + 15);
  });

  it('upsert de user_creature com estágio alto NÃO altera o estágio (anti-fraude)', async () => {
    const now = new Date().toISOString();
    const res = await push([
      {
        operationId: randomUUID(),
        entityType: 'user_creature',
        entityId: creatureId,
        operationType: 'upsert',
        updatedAt: now,
        payload: {
          creatureKey: 'terravok',
          level: 99,
          xp: 999999,
          evolutionStage: 3,
          strength: 999,
          endurance: 999,
          agility: 999,
          discipline: 999,
          recovery: 999,
          spirit: 999,
          health: 999,
          energy: 100,
          defeatedMilestones: ['r1-boss', 'r2-boss', 'r3-boss'],
        },
      },
    ]);
    expect(res.body.failedOperations).toHaveLength(0);
    const creature = await prisma.userCreature.findUniqueOrThrow({ where: { id: creatureId } });
    expect(creature.evolutionStage).toBe(0);
  });
});
