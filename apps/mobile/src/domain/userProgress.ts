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

export type OnboardingStepKey =
  | 'profile'
  | 'objective'
  | 'goal'
  | 'activities'
  | 'preferredDays'
  | 'avatar'
  | 'notifications'
  | 'adari'
  | 'summary';

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
  if (!state.hasCreatedProfile) return 0;
  if (!state.hasAnsweredInitialQuestions) return 1;
  if (!state.hasSelectedActivities) return 2;
  if (!state.hasConfiguredGoal) return 3;
  if (!state.hasSelectedPreferredDays) return 4;
  if (!state.hasConfiguredNotifications) return 6;
  if (!state.hasSelectedAdari) return 7;
  return 8;
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
