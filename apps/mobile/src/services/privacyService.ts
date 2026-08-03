// SDK 54 moveu a API clássica (documentDirectory/deleteAsync/…) para /legacy.
import * as FileSystem from 'expo-file-system/legacy';
import { closeDatabase, setDatabaseScope } from '../db/database';
import { EMPTY_USER_PROGRESS } from '../domain/userProgress';
import { tokenStore } from '../platform/secureStore';
import { useGameStore } from '../stores/gameStore';
import { useSessionStore } from '../stores/sessionStore';
import { deleteAllPrivatePhotos } from './photoService';

/**
 * Apaga TODOS os dados locais do dispositivo: os bancos SQLite (perfil local e
 * quaisquer namespaces de conta), as fotos privadas e as credenciais salvas.
 * Contas remotas não são afetadas — a exclusão de conta é feita pela API.
 */
export async function wipeAllLocalData(): Promise<void> {
  await closeDatabase();
  await deleteSqliteFiles();
  await deleteAllPrivatePhotos();
  await tokenStore.clear();
  await setDatabaseScope({ kind: 'local' });
  useSessionStore.setState({
    mode: null,
    onboardingComplete: false,
    progress: EMPTY_USER_PROGRESS,
    user: null,
    ready: true,
  });
  useGameStore.setState({
    creature: null,
    goal: null,
    currentWeek: null,
    streak: null,
    campaign: [],
    dailyBattle: null,
    loading: false,
    error: null,
  });
}

async function deleteSqliteFiles(): Promise<void> {
  // expo-sqlite guarda os bancos em <documentDirectory>/SQLite. Apagar por
  // listagem cobre também os arquivos -wal/-shm e namespaces de contas antigas.
  const dir = `${FileSystem.documentDirectory ?? ''}SQLite`;
  try {
    const entries = await FileSystem.readDirectoryAsync(dir);
    await Promise.all(
      entries
        .filter((name) => name.startsWith('adsidera'))
        .map((name) => FileSystem.deleteAsync(`${dir}/${name}`, { idempotent: true })),
    );
  } catch {
    // Diretório inexistente (banco nunca aberto): não há o que apagar.
  }
}
