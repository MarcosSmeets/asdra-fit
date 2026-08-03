import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiRequest } from '../api/client';
import { getDatabase } from '../db/database';
import { appStateRepository, APP_STATE_KEYS } from '../db/repositories/appStateRepository';
import { uuidv4 } from '../utils/id';

/**
 * Registra este dispositivo (e o token de push, se disponível) no backend.
 * Best-effort: push remoto NÃO funciona no Expo Go (SDK 53+) — lá o token
 * falha e apenas o dispositivo é registrado; em dev build o fluxo completa.
 * Só é chamado em modo conta; a permissão de notificação é a mesma pedida
 * pelo fluxo de lembretes.
 */
export async function registerDeviceForPush(): Promise<void> {
  try {
    const db = await getDatabase();
    let installationId = await appStateRepository.get(db, APP_STATE_KEYS.DEVICE_ID);
    if (!installationId) {
      installationId = uuidv4();
      await appStateRepository.set(db, APP_STATE_KEYS.DEVICE_ID, installationId);
    }

    let pushToken: string | undefined;
    try {
      const settings = await Notifications.getPermissionsAsync();
      if (settings.granted) {
        const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
          ?.eas?.projectId;
        pushToken = (
          await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
        ).data;
      }
    } catch {
      // Expo Go / sem projectId: segue sem token; o registro do device ainda vale.
    }

    await apiRequest('/devices', {
      method: 'POST',
      body: {
        installationId,
        platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
        pushToken,
      },
    });
  } catch {
    // Offline ou sessão indisponível: tentaremos de novo no próximo boot em modo conta.
  }
}
