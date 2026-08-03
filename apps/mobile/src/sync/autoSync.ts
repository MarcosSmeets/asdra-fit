import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { useSessionStore } from '../stores/sessionStore';
import { connectionRestored, createAutoSyncController } from './autoSyncController';
import { flushOutbox, pendingSyncCount } from './syncEngine';

/**
 * Reenvia a outbox automaticamente quando a conexão volta ou o app retorna ao
 * primeiro plano — cumpre a promessa "tentaremos novamente" da tela de perfil.
 * Retorna a função de teardown.
 */
export function startAutoSync(): () => void {
  const controller = createAutoSyncController({
    isAccountMode: () => useSessionStore.getState().mode === 'account',
    pendingCount: pendingSyncCount,
    flush: flushOutbox,
  });
  const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    if (connectionRestored(state)) controller.signal();
  });
  const appStateSubscription = AppState.addEventListener('change', (status) => {
    if (status === 'active') controller.signal();
  });
  // Cobre operações pendentes deixadas por sessões anteriores.
  controller.signal();
  return () => {
    unsubscribeNetInfo();
    appStateSubscription.remove();
    controller.dispose();
  };
}
