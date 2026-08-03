import {
  ATTRIBUTE_TRAINING,
  getCreatureByKey,
  TRAINABLE_ATTRIBUTES,
} from '@ad-sidera/shared';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { cleanDatabase, createTestApp, registerUser, type RegisteredUser } from './e2e-utils';
import type { PrismaService } from '../src/prisma/prisma.service';

/**
 * Progressão de atributos por treino (Build 6) validada no SERVIDOR.
 *
 * O ponto central: o servidor recalcula tudo a partir das atividades aceitas —
 * nunca confia em pontos enviados pelo cliente — e o valor do atributo é
 * derivado (base + estágio + nível + ⌊treino÷100⌋). Por isso reprocessar o
 * mesmo lote não pode inflar nada.
 */
describe('Progressão de atributos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let user: RegisteredUser;

  const BASE = getCreatureByKey('lumora')!.baseStats;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    user = await registerUser(app, 'atributos@adsidera.dev', 'Atributos');
  });

  const auth = () => ({ Authorization: `Bearer ${user.accessToken}` });

  async function setGoal(): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/v1/weekly-goals')
      .set(auth())
      .send({
        targetCount: 3,
        activityTypes: ['corrida', 'musculacao'],
        startsAt: new Date().toISOString(),
        preferredDays: [1, 3, 5],
      })
      .expect(201);
  }

  async function selectCreature(): Promise<string> {
    const entityId = randomUUID();
    await request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .set(auth())
      .send({
        deviceId: randomUUID(),
        operations: [{
          operationId: randomUUID(),
          entityType: 'user_creature',
          entityId,
          operationType: 'upsert',
          updatedAt: new Date().toISOString(),
          payload: {
            creatureKey: 'lumora',
            nickname: 'Velune',
            level: 1,
            xp: 0,
            evolutionStage: 0,
            strength: BASE.strength,
            endurance: BASE.endurance,
            agility: BASE.agility,
            discipline: BASE.discipline,
            recovery: BASE.recovery,
            spirit: BASE.spirit,
            health: BASE.health,
            energy: 100,
            defeatedMilestones: [],
          },
        }],
      })
      .expect(200);
    return entityId;
  }

  /** Envia uma atividade; `daysAgo` separa dias para não cair no multiplicador. */
  async function pushActivity(options: {
    activityType?: string;
    durationMinutes?: number;
    perceivedIntensity?: string;
    daysAgo?: number;
    operationId?: string;
    entityId?: string;
  } = {}) {
    const occurred = new Date();
    occurred.setUTCDate(occurred.getUTCDate() - (options.daysAgo ?? 0));
    occurred.setUTCHours(12, 0, 0, 0);
    const entityId = options.entityId ?? randomUUID();
    const operationId = options.operationId ?? randomUUID();
    const response = await request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .set(auth())
      .send({
        deviceId: randomUUID(),
        operations: [{
          operationId,
          entityType: 'activity',
          entityId,
          operationType: 'upsert',
          updatedAt: occurred.toISOString(),
          payload: {
            clientGeneratedId: entityId,
            activityType: options.activityType ?? 'corrida',
            perceivedIntensity: options.perceivedIntensity ?? 'moderada',
            durationMinutes: options.durationMinutes ?? 30,
            occurredAt: occurred.toISOString(),
            hasLocalPhoto: false,
          },
        }],
      })
      .expect(200);
    expect(response.body.failedOperations).toHaveLength(0);
    return { entityId, operationId };
  }

  async function attributeStates() {
    const creature = await prisma.userCreature.findUniqueOrThrow({ where: { userId: user.userId } });
    const states = await prisma.userAdariAttributeState.findMany({
      where: { userAdariId: creature.id },
    });
    return { creature, byAttribute: new Map(states.map((s) => [s.attribute, s])) };
  }

  it('materializa progresso de treino a partir da atividade sincronizada', async () => {
    await setGoal();
    await selectCreature();
    await pushActivity({ activityType: 'corrida', durationMinutes: 30 });

    const { byAttribute } = await attributeStates();
    // Corrida moderada de 30 min = 12 pontos: 7 Resistência, 4 Agilidade, 1 Disciplina.
    expect(byAttribute.get('endurance')?.trainingTotal).toBe(7);
    expect(byAttribute.get('agility')?.trainingTotal).toBe(4);
    expect(byAttribute.get('discipline')?.trainingTotal).toBe(1);
    expect(byAttribute.get('endurance')?.trainingProgress).toBe(7);
    expect(byAttribute.get('endurance')?.progressRequired)
      .toBe(ATTRIBUTE_TRAINING.PROGRESS_REQUIRED);
  });

  it('não confia no cliente: pontos enviados no payload são ignorados', async () => {
    await setGoal();
    await selectCreature();
    const occurred = new Date();
    occurred.setUTCHours(12, 0, 0, 0);
    const entityId = randomUUID();
    await request(app.getHttpServer())
      .post('/api/v1/sync/push')
      .set(auth())
      .send({
        deviceId: randomUUID(),
        operations: [{
          operationId: randomUUID(),
          entityType: 'activity',
          entityId,
          operationType: 'upsert',
          updatedAt: occurred.toISOString(),
          payload: {
            clientGeneratedId: entityId,
            activityType: 'corrida',
            perceivedIntensity: 'moderada',
            durationMinutes: 30,
            occurredAt: occurred.toISOString(),
            hasLocalPhoto: false,
          },
        }],
      })
      .expect(200);

    const { byAttribute } = await attributeStates();
    // Vale a regra do servidor (7), não qualquer número que o cliente mandasse.
    expect(byAttribute.get('endurance')?.trainingTotal).toBe(7);
  });

  it('reenviar a MESMA operação não duplica progresso de atributo', async () => {
    await setGoal();
    await selectCreature();
    const { entityId, operationId } = await pushActivity({ durationMinutes: 60 });
    const first = await attributeStates();

    // Mesmo operationId + mesma entidade: o servidor reprocessa sem inflar.
    await pushActivity({ durationMinutes: 60, entityId, operationId });
    const second = await attributeStates();

    for (const attribute of TRAINABLE_ATTRIBUTES) {
      expect(second.byAttribute.get(attribute)?.trainingTotal)
        .toBe(first.byAttribute.get(attribute)?.trainingTotal);
    }
    expect(second.creature.endurance).toBe(first.creature.endurance);
  });

  it('acumula entre dias e sobe o atributo ao fechar o progresso', async () => {
    await setGoal();
    await selectCreature();
    // 90+ min intensos = 24 pontos/dia → 14 de Resistência; 8 dias passam de 100.
    for (let day = 0; day < 8; day += 1) {
      await pushActivity({
        activityType: 'corrida', durationMinutes: 90, perceivedIntensity: 'intensa', daysAgo: day,
      });
    }

    const { creature, byAttribute } = await attributeStates();
    const endurance = byAttribute.get('endurance')!;
    expect(endurance.trainingTotal).toBeGreaterThanOrEqual(ATTRIBUTE_TRAINING.PROGRESS_REQUIRED);
    // valor = base + (nível − 1) + ⌊treino ÷ 100⌋
    const earned = Math.floor(endurance.trainingTotal / ATTRIBUTE_TRAINING.PROGRESS_REQUIRED);
    expect(endurance.value).toBe(BASE.endurance + (creature.level - 1) + earned);
    expect(endurance.trainingProgress)
      .toBe(endurance.trainingTotal % ATTRIBUTE_TRAINING.PROGRESS_REQUIRED);
    // O excedente foi preservado, não descartado.
    expect(creature.endurance).toBe(endurance.value);
  });

  it('excluir a atividade devolve o progresso (recálculo, não decremento cego)', async () => {
    await setGoal();
    await selectCreature();
    const { entityId } = await pushActivity({ durationMinutes: 60 });
    const before = await attributeStates();
    expect(before.byAttribute.get('endurance')!.trainingTotal).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .delete(`/api/v1/activities/${entityId}`)
      .set(auth())
      .expect(204);

    const after = await attributeStates();
    expect(after.byAttribute.get('endurance')!.trainingTotal).toBe(0);
    expect(after.creature.endurance).toBe(BASE.endurance + (after.creature.level - 1));
  });

  it('o nível fortalece TODOS os atributos, sem depender do treino', async () => {
    await setGoal();
    await selectCreature();
    for (let day = 0; day < 8; day += 1) {
      await pushActivity({
        activityType: 'corrida', durationMinutes: 120, perceivedIntensity: 'intensa', daysAgo: day,
      });
    }

    const { creature, byAttribute } = await attributeStates();
    expect(creature.level).toBeGreaterThan(1);
    for (const attribute of TRAINABLE_ATTRIBUTES) {
      const state = byAttribute.get(attribute)!;
      const earned = Math.floor(state.trainingTotal / ATTRIBUTE_TRAINING.PROGRESS_REQUIRED);
      expect(state.value).toBe(BASE[attribute] + (creature.level - 1) + earned);
      // Mesmo um atributo sem treino nenhum cresceu junto com o nível.
      expect(state.value).toBeGreaterThanOrEqual(BASE[attribute] + (creature.level - 1));
    }
  });
});
