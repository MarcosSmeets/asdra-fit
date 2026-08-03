import {
  deriveUserProgressState,
  entryRouteForProgress,
  firstPendingOnboardingStep,
  ONBOARDING_STEP_KEYS,
  type OnboardingStepKey,
  type UserProgressEvidence,
} from './userProgress';

/** Ancora nas chaves: o índice muda toda vez que um passo entra ou sai. */
const stepIndex = (key: OnboardingStepKey): number => ONBOARDING_STEP_KEYS.indexOf(key);

const completeEvidence: UserProgressEvidence = {
  mode: 'account',
  hasAuthenticatedUser: true,
  hasProfile: true,
  hasObjective: true,
  hasGoal: true,
  activityTypeCount: 2,
  hasCreature: true,
  completedSteps: [
    'profile', 'objective', 'activities', 'goal', 'preferredDays', 'notifications', 'adari', 'summary',
  ],
  completionMarker: true,
  boundLocalProfile: false,
};

describe('máquina de progresso do usuário', () => {
  it('nunca libera o Observatório para uma conta sem Adari', () => {
    const progress = deriveUserProgressState({ ...completeEvidence, hasCreature: false });
    expect(progress.hasCompletedOnboarding).toBe(false);
    expect(firstPendingOnboardingStep(progress)).toBe(stepIndex('adari'));
    expect(entryRouteForProgress(true, 'account', progress, false)).toBe('/onboarding');
  });

  it('retoma na primeira etapa realmente pendente', () => {
    const progress = deriveUserProgressState({
      ...completeEvidence,
      hasGoal: false,
      completedSteps: ['profile', 'objective', 'activities'],
      completionMarker: false,
    });
    expect(firstPendingOnboardingStep(progress)).toBe(stepIndex('goal'));
  });

  it('só libera as abas quando todas as evidências e o marcador existem', () => {
    const progress = deriveUserProgressState(completeEvidence);
    expect(progress.hasCompletedOnboarding).toBe(true);
    expect(entryRouteForProgress(true, 'account', progress, true)).toBe('/(tabs)');
  });

  it('passa pelo tutorial antes de liberar as abas', () => {
    const progress = deriveUserProgressState(completeEvidence);
    expect(entryRouteForProgress(true, 'account', progress, false)).toBe('/getting-started');
  });

  it('distingue perfil local de conta vinculada', () => {
    const local = deriveUserProgressState({
      ...completeEvidence,
      mode: 'local',
      hasAuthenticatedUser: false,
      boundLocalProfile: false,
    });
    expect(local.isLocalProfile).toBe(true);
    expect(local.hasAccount).toBe(false);
    expect(local.hasBoundLocalProfileToAccount).toBe(false);
  });
});
