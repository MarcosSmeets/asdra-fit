import type { StreakResult } from '@ad-sidera/shared';
import { create } from 'zustand';
import type { CreatureState, WeeklyGoalRecord, WeeklyProgressRecord } from '../db/models';
import type { RegionState } from '../domain/campaign';
import {
  registerActivity,
  type RegisterActivityInput,
  type RegisterActivityResult,
} from '../services/activityService';
import {
  getCampaign,
  getDailyBattleStatus,
  recordBattle,
  type DailyBattleStatus,
  type VictoryResult,
} from '../services/campaignService';
import type { BattleResult } from '../db/models';
import { track } from '../services/analyticsService';
import { evolveCreature, getCreature, selectCreature } from '../services/creatureService';
import { getActiveGoal, saveGoal, type SaveGoalInput } from '../services/goalService';
import { getCurrentWeek, getStreak } from '../services/progressService';

interface GameState {
  creature: CreatureState | null;
  goal: WeeklyGoalRecord | null;
  currentWeek: WeeklyProgressRecord | null;
  streak: (StreakResult & { completedWeeks: number }) | null;
  campaign: RegionState[];
  dailyBattle: DailyBattleStatus | null;
  loading: boolean;
  error: string | null;

  load: () => Promise<void>;
  register: (input: RegisterActivityInput) => Promise<RegisterActivityResult>;
  evolve: () => Promise<void>;
  chooseCreature: (key: string, nickname?: string) => Promise<void>;
  updateGoal: (input: SaveGoalInput) => Promise<void>;
  finishBattle: (input: {
    adversaryId: string;
    clientGeneratedId: string;
    result: BattleResult;
    seed?: number | null;
    turns?: number | null;
  }) => Promise<VictoryResult | null>;
}

export const useGameStore = create<GameState>((set) => ({
  creature: null,
  goal: null,
  currentWeek: null,
  streak: null,
  campaign: [],
  dailyBattle: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [creature, goal, currentWeek, streak, campaign, dailyBattle] = await Promise.all([
        getCreature(),
        getActiveGoal(),
        getCurrentWeek(),
        getStreak(),
        getCampaign(),
        getDailyBattleStatus(),
      ]);
      set({ creature, goal, currentWeek, streak, campaign, dailyBattle, loading: false });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : 'Erro ao carregar.' });
    }
  },

  // A criatura só pode ser anulada por reset/logout explícito. Registrar atividade
  // ou evoluir jamais pode apagá-la: `creature: null` manda a home para
  // `<Redirect href="/onboarding" />` e parece que o app perdeu o progresso.
  register: async (input) => {
    const result = await registerActivity(input);
    const [creature, currentWeek, streak] = await Promise.all([
      getCreature(),
      getCurrentWeek(),
      getStreak(),
    ]);
    set((state) => ({ creature: creature ?? state.creature, currentWeek, streak }));
    return result;
  },

  evolve: async () => {
    const result = await evolveCreature();
    set((state) => ({ creature: result?.creature ?? state.creature }));
  },

  chooseCreature: async (key, nickname) => {
    const creature = await selectCreature(key, nickname);
    set({ creature });
  },

  updateGoal: async (input) => {
    const goal = await saveGoal(input);
    const currentWeek = await getCurrentWeek();
    set({ goal, currentWeek });
  },

  finishBattle: async (input) => {
    const result = await recordBattle(input);
    void track('battle_finished', { result: input.result });
    const [creature, campaign] = await Promise.all([getCreature(), getCampaign()]);
    set({ creature, campaign });
    return result;
  },
}));
