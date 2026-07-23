// SDK 54 moveu a API clássica (documentDirectory/copyAsync/…) para /legacy.
import * as FileSystem from 'expo-file-system/legacy';
import { uuidv4 } from '../utils/id';

/**
 * Fotos de treino são PRIVADAS: guardadas apenas no diretório privado do app,
 * nunca na galeria e nunca enviadas ao backend. O caminho local jamais é
 * sincronizado.
 */
const PRIVATE_DIR = `${FileSystem.documentDirectory ?? ''}private_photos/`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PRIVATE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PRIVATE_DIR, { intermediates: true });
  }
}

/** Copia a imagem escolhida para o diretório privado e retorna o novo caminho. */
export async function storePrivatePhoto(sourceUri: string): Promise<string> {
  await ensureDir();
  const ext = sourceUri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const target = `${PRIVATE_DIR}${uuidv4()}.${ext}`;
  await FileSystem.copyAsync({ from: sourceUri, to: target });
  return target;
}

export async function deletePrivatePhoto(uri: string | null): Promise<void> {
  if (!uri) {
    return;
  }
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {
    // Ignora falhas de exclusão de arquivo (best-effort).
  }
}
