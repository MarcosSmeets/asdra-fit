import {
  deriveUserProgressState,
  entryRouteForProgress,
  firstPendingOnboardingStep,
  type UserProgressEvidence,
} from './userProgress';

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
    // A seleção do Adari passou a ser a etapa 7 após a aparência do Explorador.
    expect(firstPendingOnboardingStep(progress)).toBe(7);
    expect(entryRouteForProgress(true, 'account', progress)).toBe('/onboarding');
  });

  it('retoma na primeira etapa realmente pendente', () => {
    const progress = deriveUserProgressState({
      ...completeEvidence,
      hasGoal: false,
      completedSteps: ['profile', 'objective', 'activities'],
      completionMarker: false,
    });
    expect(firstPendingOnboardingStep(progress)).toBe(3);
  });

  it('só libera as abas quando todas as evidências e o marcador existem', () => {
    const progress = deriveUserProgressState(completeEvidence);
    expect(progress.hasCompletedOnboarding).toBe(true);
    expect(entryRouteForProgress(true, 'account', progress)).toBe('/(tabs)');
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
