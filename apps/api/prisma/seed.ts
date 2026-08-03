import { CREATURES, FOOD_DEFINITIONS, getWeekBounds } from '@ad-sidera/shared';
import { PrismaClient } from '@prisma/client';
import { hash as argonHash } from '@node-rs/argon2';

const prisma = new PrismaClient();

async function seedCreatureDefinitions(): Promise<void> {
  for (const creature of CREATURES) {
    await prisma.creatureDefinition.upsert({
      where: { key: creature.key },
      create: {
        key: creature.key,
        name: creature.name,
        archetype: creature.archetype,
        affinity: creature.affinity,
        baseStats: creature.baseStats as unknown as object,
        abilities: {
          basic: creature.basicAbility,
          special: creature.specialAbility,
        } as unknown as object,
        evolutionDefinitionKey: creature.evolution.toKey,
        contentVersion: creature.contentVersion,
      },
      update: {
        name: creature.name,
        archetype: creature.archetype,
        affinity: creature.affinity,
        baseStats: creature.baseStats as unknown as object,
        abilities: {
          basic: creature.basicAbility,
          special: creature.specialAbility,
        } as unknown as object,
        evolutionDefinitionKey: creature.evolution.toKey,
        contentVersion: creature.contentVersion,
      },
    });
  }
  console.log(`✓ ${CREATURES.length} definições de criatura semeadas.`);
}

async function seedFoodDefinitions(): Promise<void> {
  for (const food of FOOD_DEFINITIONS) {
    await prisma.foodDefinition.upsert({
      where: { key: food.key },
      create: {
        id: food.id,
        key: food.key,
        name: food.name,
        description: food.description,
        satietyValue: food.satietyValue,
        bondValue: food.bondValue,
        preferredByAdariKeys: [...food.preferredByAdariKeys],
        assetKey: food.assetKey,
        contentVersion: food.contentVersion,
        active: food.active,
      },
      update: {
        name: food.name,
        description: food.description,
        satietyValue: food.satietyValue,
        bondValue: food.bondValue,
        preferredByAdariKeys: [...food.preferredByAdariKeys],
        assetKey: food.assetKey,
        contentVersion: food.contentVersion,
        active: food.active,
      },
    });
  }
}

async function upsertDevUser(params: {
  email: string;
  displayName: string;
  creatureKey: string;
  timezone: string;
}): Promise<string> {
  const passwordHash = await argonHash('DevPass123');
  const creature = CREATURES.find((c) => c.key === params.creatureKey);
  if (!creature) {
    throw new Error(`Criatura ${params.creatureKey} não encontrada`);
  }
  const base = creature.baseStats;

  const user = await prisma.user.upsert({
    where: { email: params.email },
    create: { email: params.email, passwordHash },
    update: { passwordHash },
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, displayName: params.displayName, timezone: params.timezone },
    update: { displayName: params.displayName, timezone: params.timezone },
  });

  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, timezone: params.timezone },
    update: {},
  });

  await prisma.userCreature.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      creatureKey: creature.key,
      level: 5,
      xp: 900,
      strength: base.strength + 10,
      endurance: base.endurance + 10,
      agility: base.agility + 5,
      discipline: base.discipline + 5,
      recovery: base.recovery + 5,
      spirit: base.spirit + 5,
      health: base.health + 20,
      energy: 60,
    },
    update: {},
  });

  const weekStartsAt = new Date(getWeekBounds(new Date().toISOString(), params.timezone).weekStart);
  const existingGoal = await prisma.weeklyGoal.findFirst({ where: { userId: user.id, active: true } });
  if (!existingGoal) {
    await prisma.weeklyGoal.create({
      data: {
        userId: user.id,
        targetCount: 4,
        preferredDays: [1, 3, 5, 6],
        activityTypes: ['musculacao', 'corrida', 'mobilidade'],
        startsAt: weekStartsAt,
        active: true,
      },
    });
  }

  return user.id;
}

async function seedDemoActivitiesAndProgress(userId: string, timezone: string): Promise<void> {
  const bounds = getWeekBounds(new Date().toISOString(), timezone);
  const weekStart = new Date(bounds.weekStart);

  // Cria 3 atividades ao longo da semana atual (idempotente por clientGeneratedId determinístico).
  const samples = [
    { type: 'musculacao', offsetDays: 0, intensity: 'moderada', duration: 50 },
    { type: 'corrida', offsetDays: 2, intensity: 'intensa', duration: 35 },
    { type: 'mobilidade', offsetDays: 4, intensity: 'leve', duration: 20 },
  ] as const;

  for (const [index, sample] of samples.entries()) {
    const clientGeneratedId = `seed-${userId}-${index}`;
    const occurredAt = new Date(weekStart.getTime() + sample.offsetDays * 86_400_000 + 12 * 3_600_000);
    const existing = await prisma.activity.findUnique({
      where: { userId_clientGeneratedId: { userId, clientGeneratedId } },
    });
    if (!existing) {
      await prisma.activity.create({
        data: {
          userId,
          clientGeneratedId,
          activityType: sample.type,
          occurredAt,
          durationMinutes: sample.duration,
          perceivedIntensity: sample.intensity,
          isScored: true,
        },
      });
    }
  }

  await prisma.weeklyProgress.upsert({
    where: { userId_weekKey: { userId, weekKey: bounds.weekKey } },
    create: {
      userId,
      weekKey: bounds.weekKey,
      weekStart,
      weekEnd: new Date(bounds.weekEnd),
      targetCount: 4,
      validActivityCount: 3,
      percentage: 0.75,
      completed: false,
    },
    update: { validActivityCount: 3, percentage: 0.75, completed: false },
  });
}

async function seedDemoLeague(ownerId: string, memberId: string): Promise<void> {
  const existing = await prisma.league.findFirst({ where: { name: 'Liga Demo Asdra Fit' } });
  const league =
    existing ??
    (await prisma.league.create({
      data: { ownerId, name: 'Liga Demo Asdra Fit', description: 'Liga de demonstração.', maxMembers: 20 },
    }));

  await prisma.leagueMember.upsert({
    where: { leagueId_userId: { leagueId: league.id, userId: ownerId } },
    create: { leagueId: league.id, userId: ownerId, role: 'admin' },
    update: {},
  });
  await prisma.leagueMember.upsert({
    where: { leagueId_userId: { leagueId: league.id, userId: memberId } },
    create: { leagueId: league.id, userId: memberId, role: 'member' },
    update: {},
  });

  await prisma.leagueInvite.upsert({
    where: { code: 'DEMO2026' },
    create: { leagueId: league.id, code: 'DEMO2026', active: true },
    update: { active: true },
  });

  const bounds = getWeekBounds(new Date().toISOString(), 'America/Sao_Paulo');
  await prisma.leagueSeason.upsert({
    where: { leagueId_weekKey: { leagueId: league.id, weekKey: bounds.weekKey } },
    create: {
      leagueId: league.id,
      weekKey: bounds.weekKey,
      startsAt: new Date(bounds.weekStart),
      endsAt: new Date(bounds.weekEnd),
      status: 'active',
    },
    update: {},
  });

  console.log(`✓ Liga demo criada (código de convite: DEMO2026).`);
}

async function main(): Promise<void> {
  await seedCreatureDefinitions();
  await seedFoodDefinitions();

  if (process.env.NODE_ENV === 'production') {
    console.log('Ambiente de produção: dados de demonstração NÃO são criados.');
    return;
  }

  const demo1 = await upsertDevUser({
    email: 'demo1@adsidera.dev',
    displayName: 'Ana (demo)',
    creatureKey: 'terravok',
    timezone: 'America/Sao_Paulo',
  });
  const demo2 = await upsertDevUser({
    email: 'demo2@adsidera.dev',
    displayName: 'Bruno (demo)',
    creatureKey: 'lumora',
    timezone: 'America/Sao_Paulo',
  });

  await seedDemoActivitiesAndProgress(demo1, 'America/Sao_Paulo');
  await seedDemoActivitiesAndProgress(demo2, 'America/Sao_Paulo');
  await seedDemoLeague(demo1, demo2);

  console.log('✓ Seed concluído. Usuários demo: demo1@adsidera.dev / demo2@adsidera.dev (senha DevPass123).');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
