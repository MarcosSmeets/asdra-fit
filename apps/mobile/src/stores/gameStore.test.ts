import type { CreatureState } from '../db/models';
import { useGameStore } from './gameStore';
import { registerActivity } from '../services/activityService';
import { evolveCreature, getCreature } from '../services/creatureService';
import { getCurrentWeek, getStreak } from '../services/progressService';

jest.mock('../services/activityService', () => ({ registerActivity: jest.fn() }));
jest.mock('../services/creatureService', () => ({
  evolveCreature: jest.fn(),
  getCreature: jest.fn(),
  selectCreature: jest.fn(),
}));
jest.mock('../services/progressService', () => ({
  getCurrentWeek: jest.fn(),
  getStreak: jest.fn(),
}));
jest.mock('../services/campaignService', () => ({
  getCampaign: jest.fn(),
  getDailyBattleStatus: jest.fn(),
  recordBattle: jest.fn(),
}));
jest.mock('../services/goalService', () => ({ getActiveGoal: jest.fn(), saveGoal: jest.fn() }));
jest.mock('../services/analyticsService', () => ({ track: jest.fn() }));

const mockRegister = registerActivity as jest.MockedFunction<typeof registerActivity>;
const mockGetCreature = getCreature as jest.MockedFunction<typeof getCreature>;
const mockEvolve = evolveCreature as jest.MockedFunction<typeof evolveCreature>;
const mockWeek = getCurrentWeek as jest.MockedFunction<typeof getCurrentWeek>;
const mockStreak = getStreak as jest.MockedFunction<typeof getStreak>;

const CREATURE = { id: 'c1', creatureKey: 'solivar' } as unknown as CreatureState;

beforeEach(() => {
  jest.clearAllMocks();
  useGameStore.setState({ creature: CREATURE });
  mockWeek.mockResolvedValue(null);
  mockStreak.mockResolvedValue(null as never);
});

/**
 * A criatura no store só pode ser anulada por reset/logout explícito.
 * `creature: null` faz a home cair em `<Redirect href="/onboarding" />`, o que
 * para o usuário é indistinguível de ter perdido todo o progresso.
 */
describe('gameStore — a criatura nunca é anulada por acidente', () => {
  it('mantém a criatura quando registrar atividade não devolve o registro', async () => {
    mockRegister.mockResolvedValue({ activity: null } as never);
    mockGetCreature.mockResolvedValue(null);

    await useGameStore.getState().register({} as never);

    expect(useGameStore.getState().creature).toBe(CREATURE);
  });

  it('mantém a criatura quando a leitura pós-atividade volta vazia', async () => {
    mockRegister.mockResolvedValue({ activity: { id: 'a1' } } as never);
    mockGetCreature.mockResolvedValue(null);

    await useGameStore.getState().register({} as never);

    expect(useGameStore.getState().creature).toBe(CREATURE);
  });

  it('atualiza a criatura quando a leitura devolve dado novo', async () => {
    const updated = { ...CREATURE, xp: 120 } as CreatureState;
    mockRegister.mockResolvedValue({ activity: { id: 'a1' } } as never);
    mockGetCreature.mockResolvedValue(updated);

    await useGameStore.getState().register({} as never);

    expect(useGameStore.getState().creature).toBe(updated);
  });

  it('mantém a criatura quando a evolução falha', async () => {
    mockEvolve.mockResolvedValue(null as never);

    await useGameStore.getState().evolve();

    expect(useGameStore.getState().creature).toBe(CREATURE);
  });
});
