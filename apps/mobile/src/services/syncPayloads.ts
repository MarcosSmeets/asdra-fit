import type {
  ActivityRecord,
  AdariEvolutionHistoryRecord,
  AdariInteractionRecord,
  BattleSessionRecord,
  CreatureState,
  ObservatoryStateRecord,
} from '../db/models';

/** Payload de sync da atividade — SOMENTE metadados (nunca a foto/caminho). */
export function activitySyncPayload(activity: ActivityRecord): Record<string, unknown> {
  return {
    clientGeneratedId: activity.clientGeneratedId,
    activityType: activity.activityType,
    perceivedIntensity: activity.perceivedIntensity,
    durationMinutes: activity.durationMinutes,
    occurredAt: activity.occurredAt,
    notes: activity.notes ?? undefined,
    location: activity.location ?? undefined,
    moodBefore: activity.moodBefore ?? undefined,
    moodAfter: activity.moodAfter ?? undefined,
    hasLocalPhoto: activity.hasLocalPhoto,
    movementSteps: activity.movementSteps ?? undefined,
    movementSignal: activity.movementSignal ?? undefined,
  };
}

export function creatureSyncPayload(creature: CreatureState): Record<string, unknown> {
  const a = creature.attributes;
  return {
    creatureKey: creature.creatureKey,
    nickname: creature.nickname,
    level: creature.level,
    xp: creature.xp,
    // O servidor NUNCA aplica o estágio a partir deste payload (anti-fraude);
    // o estágio só muda pela operação validada `adari_evolution`.
    evolutionStage: creature.evolutionStage,
    evolvedAt: creature.evolvedAt ?? undefined,
    strength: a.strength,
    endurance: a.endurance,
    agility: a.agility,
    discipline: a.discipline,
    recovery: a.recovery,
    spirit: a.spirit,
    health: a.health,
    energy: a.energy,
    // Vigor (recurso de descanso). O servidor recalcula a recuperação por conta própria.
    maxVigor: creature.maxVigor,
    vigorRecoveryRate: creature.vigorRecoveryRate,
    lastVigorCalculationAt: creature.lastVigorCalculationAt,
    bond: creature.bond,
    satiety: creature.satiety,
    lastSatietyCalculationAt: creature.lastSatietyCalculationAt,
    activeBehaviorState: creature.activeBehaviorState,
    lastInteractionAt: creature.lastInteractionAt,
    equippedAbilities: creature.equippedAbilities,
    defeatedMilestones: creature.defeatedMilestones,
  };
}

/** Payload da operação idempotente de evolução (validada no servidor). */
export function adariEvolutionSyncPayload(
  history: AdariEvolutionHistoryRecord,
): Record<string, unknown> {
  return {
    clientGeneratedId: history.id,
    userAdariId: history.userAdariId,
    fromStage: history.fromStage,
    toStage: history.toStage,
    unlockedAt: history.unlockedAt,
    triggeringReason: history.triggeringReason,
    calculationVersion: history.calculationVersion,
  };
}

export function adariInteractionSyncPayload(
  interaction: AdariInteractionRecord,
): Record<string, unknown> {
  return {
    clientGeneratedId: interaction.clientGeneratedId,
    userAdariId: interaction.userAdariId,
    interactionType: interaction.interactionType,
    foodDefinitionId: interaction.foodDefinitionId,
    bondGranted: interaction.bondGranted,
    satietyGranted: interaction.satietyGranted,
    occurredAt: interaction.occurredAt,
    localDate: interaction.localDate,
    timezone: interaction.timezone,
    calculationVersion: interaction.calculationVersion,
  };
}

export function observatoryStateSyncPayload(
  state: ObservatoryStateRecord,
): Record<string, unknown> {
  return {
    selectedControlMode: state.selectedControlMode,
    unlockedObjects: state.unlockedObjects,
    seenDialogueKeys: state.seenDialogueKeys,
    reduceMotion: state.reduceMotion,
    particlesEnabled: state.particlesEnabled,
    movementSpeed: state.movementSpeed,
    qualityMode: state.qualityMode,
    musicEnabled: state.musicEnabled,
    effectsEnabled: state.effectsEnabled,
    hapticsEnabled: state.hapticsEnabled,
  };
}

/** Payload de sync de uma sessão de batalha PvE (idempotente por clientGeneratedId). */
export function battleSessionSyncPayload(session: BattleSessionRecord): Record<string, unknown> {
  return {
    clientGeneratedId: session.clientGeneratedId,
    battleType: session.battleType,
    adversaryId: session.adversaryId ?? undefined,
    dayKey: session.dayKey,
    result: session.result,
    rewarded: session.rewarded,
    xpGranted: session.xpGranted,
    vigorSpent: session.vigorSpent,
    seed: session.seed ?? undefined,
    turns: session.turns ?? undefined,
    battleCalculationVersion: session.battleCalculationVersion,
  };
}

export function profileSyncPayload(p: {
  displayName: string;
  timezone: string;
  locale: string;
  avatarType: string;
  shareCreatureLevel: boolean;
  goal?: string | null;
}): Record<string, unknown> {
  return {
    displayName: p.displayName,
    timezone: p.timezone,
    locale: p.locale,
    avatarType: p.avatarType,
    shareCreatureLevel: p.shareCreatureLevel,
    goal: p.goal ?? undefined,
  };
}

export function goalSyncPayload(goal: {
  targetCount: number;
  preferredDays: number[];
  activityTypes: string[];
  startsAt: string;
  allowExtraActivities: boolean;
}): Record<string, unknown> {
  return {
    targetCount: goal.targetCount,
    preferredDays: goal.preferredDays,
    activityTypes: goal.activityTypes,
    startsAt: goal.startsAt,
    allowExtraActivities: goal.allowExtraActivities,
  };
}
