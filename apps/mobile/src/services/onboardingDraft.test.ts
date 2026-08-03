import { ONBOARDING_STEP_KEYS } from '../domain/userProgress';

/**
 * `parseDraft` é interno, então o teste exercita o comportamento pela porta da
 * frente: `loadOnboardingDraft` lendo o valor cru do appState.
 *
 * O que está sendo protegido: um usuário no meio do onboarding no momento em que
 * o passo do Explorador saiu. Sem o remapeamento, o índice gravado apontaria para
 * o passo seguinte e ele pularia a tela de lembretes.
 */
jest.mock('../db/database', () => ({ getDatabase: jest.fn().mockResolvedValue({}) }));

const get = jest.fn();
jest.mock('../db/repositories/appStateRepository', () => ({
  appStateRepository: { get: (...args: unknown[]) => get(...args), set: jest.fn(), getBool: jest.fn() },
  APP_STATE_KEYS: { ONBOARDING_DRAFT: 'draft', ONBOARDING_COMPLETED_STEPS: 'steps' },
}));
jest.mock('../db/repositories/profileRepository', () => ({ profileRepository: {} }));
jest.mock('../db/repositories/weeklyGoalRepository', () => ({ weeklyGoalRepository: {} }));
jest.mock('../db/repositories/creatureRepository', () => ({ creatureRepository: {} }));
jest.mock('./creatureService', () => ({ createInitialCreatureState: jest.fn() }));
jest.mock('./outbox', () => ({ enqueueOperation: jest.fn() }));
jest.mock('./syncPayloads', () => ({
  creatureSyncPayload: jest.fn(), goalSyncPayload: jest.fn(), profileSyncPayload: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { loadOnboardingDraft } = require('./onboardingService') as typeof import('./onboardingService');

beforeEach(() => get.mockReset());

describe('rascunho de onboarding — migração do passo do Explorador', () => {
  it('recua o passo e descarta a chave em rascunho legado', async () => {
    get.mockResolvedValue(JSON.stringify({
      // No espaço antigo, 7 era 'adari' (o Explorador ocupava o índice 5).
      step: 7,
      completedSteps: ['profile', 'objective', 'activities', 'goal', 'preferredDays', 'avatar'],
    }));

    const draft = await loadOnboardingDraft();

    expect(draft.step).toBe(ONBOARDING_STEP_KEYS.indexOf('adari'));
    expect(draft.completedSteps).not.toContain('avatar');
    expect(draft.completedSteps).toContain('preferredDays');
  });

  it('não mexe em passo anterior ao removido', async () => {
    get.mockResolvedValue(JSON.stringify({
      step: 2,
      completedSteps: ['profile', 'objective'],
    }));

    expect((await loadOnboardingDraft()).step).toBe(2);
  });

  it('não mexe em rascunho já no espaço novo', async () => {
    get.mockResolvedValue(JSON.stringify({
      step: 6,
      completedSteps: ['profile', 'objective', 'activities', 'goal', 'preferredDays', 'notifications'],
    }));

    expect((await loadOnboardingDraft()).step).toBe(6);
  });

  it('nunca devolve passo fora da faixa', async () => {
    get.mockResolvedValue(JSON.stringify({ step: 99, completedSteps: [] }));
    expect((await loadOnboardingDraft()).step).toBe(ONBOARDING_STEP_KEYS.length - 1);
  });
});
