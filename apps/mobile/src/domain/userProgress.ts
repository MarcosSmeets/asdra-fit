export interface UserProgressState {
  hasAccount: boolean;
  isLocalProfile: boolean;
  hasCreatedProfile: boolean;
  hasAnsweredInitialQuestions: boolean;
  hasConfiguredGoal: boolean;
  hasSelectedActivities: boolean;
  hasSelectedPreferredDays: boolean;
  hasConfiguredNotifications: boolean;
  hasSelectedAdari: boolean;
  hasCompletedOnboarding: boolean;
  hasBoundLocalProfileToAccount: boolean;
}

/**
 * Ordem canônica dos passos do onboarding — fonte única de verdade.
 *
 * A tela comparava `step === N` contra literais em oito lugares, e a ordem dos
 * blocos no JSX nem batia com a ordem numérica. Derivar daqui evita que inserir
 * ou remover um passo exija renumerar tudo à mão, que é onde nasce bug silencioso.
 */
export const ONBOARDING_STEP_KEYS = [
  'profile',
  'objective',
  'activities',
  'goal',
  'preferredDays',
  'notifications',
  'adari',
  'summary',
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEP_KEYS)[number];

export interface UserProgressEvidence {
  mode: 'local' | 'account' | null;
  hasAuthenticatedUser: boolean;
  hasProfile: boolean;
  hasObjective: boolean;
  hasGoal: boolean;
  activityTypeCount: number;
  hasCreature: boolean;
  completedSteps: readonly OnboardingStepKey[];
  completionMarker: boolean;
  boundLocalProfile: boolean;
}

export const EMPTY_USER_PROGRESS: UserProgressState = {
  hasAccount: false,
  isLocalProfile: false,
  hasCreatedProfile: false,
  hasAnsweredInitialQuestions: false,
  hasConfiguredGoal: false,
  hasSelectedActivities: false,
  hasSelectedPreferredDays: false,
  hasConfiguredNotifications: false,
  hasSelectedAdari: false,
  hasCompletedOnboarding: false,
  hasBoundLocalProfileToAccount: false,
};

export function deriveUserProgressState(evidence: UserProgressEvidence): UserProgressState {
  const completed = new Set(evidence.completedSteps);
  const hasCreatedProfile = evidence.hasProfile || completed.has('profile');
  const hasAnsweredInitialQuestions =
    hasCreatedProfile && (evidence.hasObjective || completed.has('objective'));
  const hasConfiguredGoal = evidence.hasGoal && completed.has('goal');
  const hasSelectedActivities =
    evidence.activityTypeCount > 0 && completed.has('activities');
  const hasSelectedPreferredDays = completed.has('preferredDays');
  const hasConfiguredNotifications = completed.has('notifications');
  const hasSelectedAdari = evidence.hasCreature && completed.has('adari');
  const allRequired =
    hasCreatedProfile &&
    hasAnsweredInitialQuestions &&
    hasConfiguredGoal &&
    hasSelectedActivities &&
    hasSelectedPreferredDays &&
    hasConfiguredNotifications &&
    hasSelectedAdari &&
    completed.has('summary');

  return {
    hasAccount: evidence.mode === 'account' && evidence.hasAuthenticatedUser,
    isLocalProfile: evidence.mode === 'local' && evidence.hasProfile,
    hasCreatedProfile,
    hasAnsweredInitialQuestions,
    hasConfiguredGoal,
    hasSelectedActivities,
    hasSelectedPreferredDays,
    hasConfiguredNotifications,
    hasSelectedAdari,
    hasCompletedOnboarding: evidence.completionMarker && allRequired,
    hasBoundLocalProfileToAccount: evidence.boundLocalProfile,
  };
}

export function firstPendingOnboardingStep(state: UserProgressState): number {
  const pending: OnboardingStepKey =
    !state.hasCreatedProfile ? 'profile'
      : !state.hasAnsweredInitialQuestions ? 'objective'
        : !state.hasSelectedActivities ? 'activities'
          : !state.hasConfiguredGoal ? 'goal'
            : !state.hasSelectedPreferredDays ? 'preferredDays'
              : !state.hasConfiguredNotifications ? 'notifications'
                : !state.hasSelectedAdari ? 'adari'
                  : 'summary';
  return ONBOARDING_STEP_KEYS.indexOf(pending);
}

export function entryRouteForProgress(
  ready: boolean,
  mode: UserProgressEvidence['mode'],
  progress: UserProgressState,
  tutorialCompleted: boolean,
): '/intro' | '/onboarding' | '/getting-started' | '/(tabs)' {
  if (!ready || mode === null) return '/intro';
  if (!progress.hasCompletedOnboarding) return '/onboarding';
  return tutorialCompleted ? '/(tabs)' : '/getting-started';
}
