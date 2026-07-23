import { confirmLocalProfileConversion, convertLocalProfileAccount, fetchMe } from '../api/auth';
import type { AuthUserSummary } from '../api/auth';
import { getDatabase } from '../db/database';
import { appStateRepository, APP_STATE_KEYS } from '../db/repositories/appStateRepository';
import { creatureRepository } from '../db/repositories/creatureRepository';
import { profileRepository } from '../db/repositories/profileRepository';
import { flushOutbox, pendingSyncCount } from '../sync/syncEngine';
import { uuidv4 } from '../utils/id';

export type LocalConversionState =
  | 'preparing'
  | 'creatingAccount'
  | 'linkingProfile'
  | 'syncingAdari'
  | 'syncingActivities'
  | 'syncingProgress'
  | 'syncingInventory'
  | 'finalizing'
  | 'completed'
  | 'failedRecoverable';

export interface LocalConversionContext {
  profileId: string;
  displayName: string;
  creatureNameKey: string;
}

export async function getLocalConversionContext(): Promise<LocalConversionContext | null> {
  const db = await getDatabase();
  const [profile, creature, alreadyBound] = await Promise.all([
    profileRepository.get(db),
    creatureRepository.get(db),
    appStateRepository.getBool(db, APP_STATE_KEYS.LOCAL_PROFILE_BOUND),
  ]);
  if (!profile || !creature || alreadyBound) return null;
  return {
    profileId: profile.id,
    displayName: profile.displayName,
    creatureNameKey: creature.creatureKey,
  };
}

async function setState(state: LocalConversionState): Promise<void> {
  const db = await getDatabase();
  await appStateRepository.set(db, APP_STATE_KEYS.CONVERSION_STATE, state);
}

async function stableOperationId(): Promise<string> {
  const db = await getDatabase();
  const existing = await appStateRepository.get(db, APP_STATE_KEYS.CONVERSION_OPERATION_ID);
  if (existing) return existing;
  const operationId = uuidv4();
  await appStateRepository.set(db, APP_STATE_KEYS.CONVERSION_OPERATION_ID, operationId);
  return operationId;
}

export async function convertLocalProfile(input: {
  email: string;
  password: string;
  timezone: string;
  context: LocalConversionContext;
  onState?: (state: LocalConversionState) => void;
}): Promise<AuthUserSummary> {
  const transition = async (state: LocalConversionState): Promise<void> => {
    input.onState?.(state);
    await setState(state);
  };
  const operationId = await stableOperationId();
  try {
    await transition('preparing');
    await transition('creatingAccount');
    await convertLocalProfileAccount({
      displayName: input.context.displayName,
      email: input.email,
      password: input.password,
      timezone: input.timezone,
      operationId,
      localProfileId: input.context.profileId,
    });
    await transition('linkingProfile');
    await transition('syncingAdari');
    for (let batch = 0; batch < 10 && (await pendingSyncCount()) > 0; batch += 1) {
      const result = await flushOutbox();
      if (result.failed > 0) {
        throw new Error('Algumas alterações ainda precisam ser sincronizadas.');
      }
      if (batch === 0) await transition('syncingActivities');
      if (batch === 1) await transition('syncingProgress');
      if (batch === 2) await transition('syncingInventory');
    }
    await transition('finalizing');
    await confirmLocalProfileConversion(operationId);
    const db = await getDatabase();
    await appStateRepository.setBool(db, APP_STATE_KEYS.LOCAL_PROFILE_BOUND, true);
    await transition('completed');
    return fetchMe();
  } catch (error) {
    await transition('failedRecoverable');
    throw error;
  }
}

export const LOCAL_CONVERSION_LABELS: Record<LocalConversionState, string> = {
  preparing: 'Preparando seu perfil',
  creatingAccount: 'Criando sua conta',
  linkingProfile: 'Associando seu Adari',
  syncingAdari: 'Sincronizando seu Adari',
  syncingActivities: 'Enviando atividades',
  syncingProgress: 'Sincronizando sua jornada',
  syncingInventory: 'Sincronizando inventário',
  finalizing: 'Finalizando com segurança',
  completed: 'Concluído',
  failedRecoverable: 'Aguardando nova tentativa',
};
