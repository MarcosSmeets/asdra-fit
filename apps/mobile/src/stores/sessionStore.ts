import { create } from 'zustand';
import type { AuthUserSummary } from '../api/auth';
import { getDatabase, setDatabaseScope } from '../db/database';
import { appStateRepository, APP_STATE_KEYS } from '../db/repositories/appStateRepository';
import { tokenStore } from '../platform/secureStore';
import { fetchMe } from '../api/auth';
import { EMPTY_USER_PROGRESS, type UserProgressState } from '../domain/userProgress';
import { getUserProgressState } from '../services/onboardingService';
import { ApiError } from '../api/client';
import { resolveSessionMode } from '../domain/sessionMode';
import { track } from '../services/analyticsService';
import { registerDeviceForPush } from '../services/pushTokenService';
import { fullAccountSync } from '../sync/syncEngine';
import { ONLINE_FEATURES_ENABLED } from '../config/features';

export type AppMode = 'local' | 'account' | null;

async function isGettingStartedCompleted(): Promise<boolean> {
  const db = await getDatabase();
  return appStateRepository.getBool(db, APP_STATE_KEYS.GETTING_STARTED_V1_COMPLETE);
}

interface SessionState {
  mode: AppMode;
  onboardingComplete: boolean;
  progress: UserProgressState;
  tutorialCompleted: boolean;
  user: AuthUserSummary | null;
  ready: boolean;
  load: () => Promise<void>;
  setMode: (mode: AppMode) => Promise<void>;
  setUser: (user: AuthUserSummary | null) => Promise<void>;
  refreshProgress: (remoteHasCreature?: boolean) => Promise<UserProgressState>;
  completeOnboarding: () => Promise<void>;
  completeTutorial: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  mode: null,
  onboardingComplete: false,
  progress: EMPTY_USER_PROGRESS,
  tutorialCompleted: false,
  user: null,
  ready: false,

  load: async () => {
    if (!ONLINE_FEATURES_ENABLED) {
      await setDatabaseScope({ kind: 'local' });
      const db = await getDatabase();
      const storedMode = (await appStateRepository.get(db, APP_STATE_KEYS.MODE)) as AppMode;
      if (storedMode === 'account') {
        await appStateRepository.set(db, APP_STATE_KEYS.MODE, 'local');
      }
      const onboardingComplete = await appStateRepository.getBool(
        db,
        APP_STATE_KEYS.ONBOARDING_COMPLETE,
      );
      const progress = await getUserProgressState({
        mode: 'local',
        hasAuthenticatedUser: false,
      });
      const tutorialCompleted = progress.hasCompletedOnboarding
        ? await isGettingStartedCompleted()
        : false;
      set({
        mode: 'local',
        onboardingComplete: progress.hasCompletedOnboarding && onboardingComplete,
        progress,
        tutorialCompleted,
        user: null,
        ready: true,
      });
      return;
    }
    const [accessToken, refreshToken, storedAccountUserId] = await Promise.all([
      tokenStore.getAccess(),
      tokenStore.getRefresh(),
      tokenStore.getAccountUserId(),
    ]);
    let hasCredentials = Boolean(accessToken || refreshToken);
    let user: AuthUserSummary | null = null;
    if (hasCredentials) {
      try {
        user = await fetchMe();
        await tokenStore.setAccountUserId(user.id);
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) hasCredentials = false;
        // Offline: a sessão e o progresso local continuam utilizáveis.
      }
    }
    const accountUserId = user?.id ?? (hasCredentials ? storedAccountUserId : null);
    await setDatabaseScope(accountUserId
      ? { kind: 'account', userId: accountUserId }
      : { kind: 'local' });
    if (user && hasCredentials) {
      // Hidrata o namespace da conta antes de decidir se o onboarding acabou.
      await fullAccountSync().catch(() => undefined);
      // Registro de device/push é best-effort e nunca atrasa o boot.
      void registerDeviceForPush();
    }
    const db = await getDatabase();
    const mode = (await appStateRepository.get(db, APP_STATE_KEYS.MODE)) as AppMode;
    const onboardingComplete = await appStateRepository.getBool(
      db,
      APP_STATE_KEYS.ONBOARDING_COMPLETE,
    );
    const resolvedMode = resolveSessionMode(mode, hasCredentials);
    if (mode === 'account' && resolvedMode === 'local') {
      await appStateRepository.set(db, APP_STATE_KEYS.MODE, 'local');
    }
    const progress = await getUserProgressState({
      mode: resolvedMode,
      hasAuthenticatedUser: hasCredentials,
      remoteHasCreature: user?.hasCreature,
    });
    const tutorialCompleted = progress.hasCompletedOnboarding
      ? await isGettingStartedCompleted()
      : false;
    set({
      mode: resolvedMode,
      onboardingComplete: progress.hasCompletedOnboarding && onboardingComplete,
      progress,
      tutorialCompleted,
      user,
      ready: true,
    });
  },

  setMode: async (mode) => {
    const nextMode = !ONLINE_FEATURES_ENABLED && mode === 'account' ? 'local' : mode;
    const db = await getDatabase();
    if (nextMode) {
      await appStateRepository.set(db, APP_STATE_KEYS.MODE, nextMode);
    }
    const progress = await getUserProgressState({
      mode: nextMode,
      hasAuthenticatedUser: ONLINE_FEATURES_ENABLED && Boolean(await tokenStore.getAccess()),
    });
    const tutorialCompleted = progress.hasCompletedOnboarding
      ? await isGettingStartedCompleted()
      : false;
    set({
      mode: nextMode,
      progress,
      onboardingComplete: progress.hasCompletedOnboarding,
      tutorialCompleted,
    });
  },

  setUser: async (user) => {
    if (!ONLINE_FEATURES_ENABLED) {
      await useSessionStore.getState().setMode('local');
      set({ user: null });
      return;
    }
    const nextMode = user ? 'account' : null;
    if (user) {
      await tokenStore.setAccountUserId(user.id);
      await setDatabaseScope({ kind: 'account', userId: user.id });
      const db = await getDatabase();
      await appStateRepository.set(db, APP_STATE_KEYS.MODE, 'account');
      void registerDeviceForPush();
    }
    const progress = await getUserProgressState({
      mode: nextMode,
      hasAuthenticatedUser: Boolean(user),
      remoteHasCreature: user?.hasCreature,
    });
    const tutorialCompleted = progress.hasCompletedOnboarding
      ? await isGettingStartedCompleted()
      : false;
    set({
      user,
      mode: nextMode,
      progress,
      onboardingComplete: progress.hasCompletedOnboarding,
      tutorialCompleted,
    });
  },

  refreshProgress: async (remoteHasCreature) => {
    const state = useSessionStore.getState();
    const progress = await getUserProgressState({
      mode: state.mode,
      hasAuthenticatedUser: ONLINE_FEATURES_ENABLED
        && (Boolean(state.user) || Boolean(await tokenStore.getAccess())),
      remoteHasCreature,
    });
    const tutorialCompleted = progress.hasCompletedOnboarding
      ? await isGettingStartedCompleted()
      : false;
    set({ progress, onboardingComplete: progress.hasCompletedOnboarding, tutorialCompleted });
    return progress;
  },

  completeOnboarding: async () => {
    const progress = await useSessionStore.getState().refreshProgress();
    if (progress.hasCompletedOnboarding) void track('onboarding_completed');
    set({ onboardingComplete: progress.hasCompletedOnboarding });
  },

  completeTutorial: async () => {
    const db = await getDatabase();
    await appStateRepository.setBool(db, APP_STATE_KEYS.GETTING_STARTED_V1_COMPLETE, true);
    set({ tutorialCompleted: true });
  },

  signOut: async () => {
    await tokenStore.clear();
    await setDatabaseScope({ kind: 'local' });
    const db = await getDatabase();
    await appStateRepository.remove(db, APP_STATE_KEYS.MODE);
    const progress = await getUserProgressState({
      mode: null,
      hasAuthenticatedUser: false,
    });
    set({
      user: null,
      mode: null,
      progress,
      onboardingComplete: false,
      tutorialCompleted: false,
    });
  },
}));
