import { getDatabase } from '../db/database';
import type { ProfileRecord } from '../db/models';
import { appStateRepository, APP_STATE_KEYS } from '../db/repositories/appStateRepository';
import { profileRepository } from '../db/repositories/profileRepository';
import { getWeekBounds } from '@ad-sidera/shared';
import { nowIso } from '../utils/datetime';
import { uuidv4 } from '../utils/id';
import { createInitialCreatureState } from './creatureService';
import type { Goal } from '@ad-sidera/shared';
import {
  deriveUserProgressState,
  firstPendingOnboardingStep,
  ONBOARDING_STEP_KEYS,
  type OnboardingStepKey,
  type UserProgressState,
} from '../domain/userProgress';
import { weeklyGoalRepository } from '../db/repositories/weeklyGoalRepository';
import { creatureRepository } from '../db/repositories/creatureRepository';
import { enqueueOperation } from './outbox';
import { creatureSyncPayload, goalSyncPayload, profileSyncPayload } from './syncPayloads';
import type { WeeklyGoalRecord } from '../db/models';

export interface OnboardingData {
  displayName: string;
  goal: string;
  targetCount: number;
  preferredDays: number[];
  activityTypes: string[];
  creatureKey: string;
  nickname?: string;
  timezone: string;
}

export interface OnboardingDraft {
  step: number;
  displayName: string;
  goal: Goal | null;
  targetCount: number;
  preferredDays: number[];
  activityTypes: string[];
  remindersEnabled: boolean;
  reminderHour: number;
  creatureKey: string | null;
  completedSteps: OnboardingStepKey[];
}

export const DEFAULT_ONBOARDING_DRAFT: OnboardingDraft = {
  step: 0,
  displayName: '',
  goal: null,
  targetCount: 3,
  preferredDays: [],
  activityTypes: [],
  remindersEnabled: false,
  reminderHour: 18,
  creatureKey: null,
  completedSteps: [],
};

/** O passo do Explorador era o índice 5; tudo depois dele recuou uma posição. */
const REMOVED_AVATAR_STEP_INDEX = 5;

function legacyStep(parsed: Partial<OnboardingDraft>): number {
  const step = typeof parsed.step === 'number' ? parsed.step : 0;
  const hadAvatarStep = Array.isArray(parsed.completedSteps)
    && (parsed.completedSteps as readonly string[]).includes('avatar');
  const adjusted = hadAvatarStep && step > REMOVED_AVATAR_STEP_INDEX ? step - 1 : step;
  return Math.max(0, Math.min(ONBOARDING_STEP_KEYS.length - 1, adjusted));
}

function parseDraft(value: string | null): OnboardingDraft {
  if (!value) return { ...DEFAULT_ONBOARDING_DRAFT };
  try {
    const parsed = JSON.parse(value) as Partial<OnboardingDraft>;
    return {
      ...DEFAULT_ONBOARDING_DRAFT,
      ...parsed,
      preferredDays: Array.isArray(parsed.preferredDays) ? parsed.preferredDays : [],
      activityTypes: Array.isArray(parsed.activityTypes) ? parsed.activityTypes : [],
      // Rascunho gravado antes da remoção do passo do Explorador: a chave some da
      // lista e o índice do passo recua um, senão o usuário pularia os lembretes.
      completedSteps: Array.isArray(parsed.completedSteps)
        ? parsed.completedSteps.filter((key): key is OnboardingStepKey =>
            (ONBOARDING_STEP_KEYS as readonly string[]).includes(key))
        : [],
      step: legacyStep(parsed),
    };
  } catch {
    return { ...DEFAULT_ONBOARDING_DRAFT };
  }
}

export async function loadOnboardingDraft(): Promise<OnboardingDraft> {
  const db = await getDatabase();
  return parseDraft(await appStateRepository.get(db, APP_STATE_KEYS.ONBOARDING_DRAFT));
}

export async function saveOnboardingDraft(draft: OnboardingDraft): Promise<void> {
  const db = await getDatabase();
  await appStateRepository.set(db, APP_STATE_KEYS.ONBOARDING_DRAFT, JSON.stringify(draft));
  await appStateRepository.set(
    db,
    APP_STATE_KEYS.ONBOARDING_COMPLETED_STEPS,
    JSON.stringify(draft.completedSteps),
  );
}

function parseCompletedSteps(value: string | null): OnboardingStepKey[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as OnboardingStepKey[]) : [];
  } catch {
    return [];
  }
}

export async function getUserProgressState(options: {
  mode: 'local' | 'account' | null;
  hasAuthenticatedUser: boolean;
  remoteHasCreature?: boolean;
}): Promise<UserProgressState> {
  const db = await getDatabase();
  const [profile, goal, creature, marker, stepsValue, bound] = await Promise.all([
    profileRepository.get(db),
    weeklyGoalRepository.getActive(db),
    creatureRepository.get(db),
    appStateRepository.getBool(db, APP_STATE_KEYS.ONBOARDING_COMPLETE),
    appStateRepository.get(db, APP_STATE_KEYS.ONBOARDING_COMPLETED_STEPS),
    appStateRepository.getBool(db, APP_STATE_KEYS.LOCAL_PROFILE_BOUND),
  ]);
  let completedSteps = parseCompletedSteps(stepsValue);
  // Compatibilidade com perfis criados antes da máquina explícita.
  const remoteComplete =
    options.mode === 'account' &&
    options.remoteHasCreature === true &&
    Boolean(profile && goal && creature && profile.goal && goal.activityTypes.length > 0);
  if (completedSteps.length === 0 && (marker || remoteComplete) && profile && goal && creature) {
    completedSteps = [...ONBOARDING_STEP_KEYS];
  }
  return deriveUserProgressState({
    mode: options.mode,
    hasAuthenticatedUser: options.hasAuthenticatedUser,
    hasProfile: Boolean(profile),
    hasObjective: Boolean(profile?.goal),
    hasGoal: Boolean(goal),
    activityTypeCount: goal?.activityTypes.length ?? 0,
    hasCreature: Boolean(creature) && options.remoteHasCreature !== false,
    completedSteps,
    completionMarker: marker || remoteComplete,
    boundLocalProfile: bound,
  });
}

export async function resumeOnboardingStep(options: {
  mode: 'local' | 'account' | null;
  hasAuthenticatedUser: boolean;
  remoteHasCreature?: boolean;
}): Promise<number> {
  return firstPendingOnboardingStep(await getUserProgressState(options));
}

/** Conclui o onboarding local: cria perfil, meta, criatura e marca o modo local. */
export async function completeOnboarding(data: OnboardingData): Promise<void> {
  const db = await getDatabase();
  const now = nowIso();
  const [existingProfile, existingGoal, existingCreature] = await Promise.all([
    profileRepository.get(db),
    weeklyGoalRepository.getActive(db),
    creatureRepository.get(db),
  ]);
  const profile: ProfileRecord = {
    id: existingProfile?.id ?? uuidv4(),
    displayName: data.displayName,
    timezone: data.timezone,
    locale: 'pt-BR',
    avatarType: 'star',
    shareCreatureLevel: true,
    goal: data.goal,
    createdAt: existingProfile?.createdAt ?? now,
    updatedAt: now,
    syncStatus: 'local_only',
  };
  const weekStart = getWeekBounds(now, data.timezone).weekStart;
  const goal: WeeklyGoalRecord = {
    id: existingGoal?.id ?? uuidv4(),
    targetCount: data.targetCount,
    preferredDays: data.preferredDays,
    activityTypes: data.activityTypes as WeeklyGoalRecord['activityTypes'],
    startsAt: weekStart,
    endsAt: null,
    active: true,
    allowExtraActivities: true,
    createdAt: existingGoal?.createdAt ?? now,
    updatedAt: now,
    syncStatus: 'pending',
  };
  const creature = existingCreature ?? createInitialCreatureState(data.creatureKey, data.nickname);
  const steps = [...ONBOARDING_STEP_KEYS] satisfies OnboardingStepKey[];

  await db.withTransactionAsync(async () => {
    await profileRepository.upsert(db, profile);
    await enqueueOperation(db, {
      entityType: 'profile', entityId: profile.id, operationType: 'upsert', updatedAt: now,
      payload: profileSyncPayload(profile),
    });
    await weeklyGoalRepository.upsertActive(db, goal, true);
    await enqueueOperation(db, {
      entityType: 'weekly_goal', entityId: goal.id, operationType: 'upsert', updatedAt: now,
      payload: goalSyncPayload(goal),
    });
    if (!existingCreature) {
      await creatureRepository.create(db, creature, now);
      await enqueueOperation(db, {
        entityType: 'user_creature', entityId: creature.id, operationType: 'upsert', updatedAt: now,
        payload: creatureSyncPayload(creature),
      });
    }
    await appStateRepository.setBool(db, APP_STATE_KEYS.ONBOARDING_COMPLETE, true);
    await appStateRepository.set(db, APP_STATE_KEYS.ONBOARDING_COMPLETED_STEPS, JSON.stringify(steps));
    if ((await appStateRepository.get(db, APP_STATE_KEYS.MODE)) === null) {
      await appStateRepository.set(db, APP_STATE_KEYS.MODE, 'local');
    }
  });
}

export async function isOnboardingComplete(): Promise<boolean> {
  const db = await getDatabase();
  return appStateRepository.getBool(db, APP_STATE_KEYS.ONBOARDING_COMPLETE);
}
