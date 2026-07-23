import * as Notifications from 'expo-notifications';

/**
 * Notificações LOCAIS e encorajadoras (nunca culpabilizadoras). A permissão é
 * pedida apenas quando o usuário ativa lembretes, após explicar o benefício.
 */
export interface ReminderConfig {
  hour: number;
  minute: number;
  /** Dias ISO (1=seg ... 7=dom). */
  weekdays: number[];
}

export const ENCOURAGING_REMINDERS = [
  'Sua jornada continua hoje. Que tal uma atividade?',
  'Uma pequena atividade já conta. Seu Adari está pronto.',
  'Ainda há tempo para avançar na sua meta semanal.',
];

export async function requestPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) {
    return true;
  }
  const request = await Notifications.requestPermissionsAsync();
  return request.granted;
}

export async function scheduleWeeklyReminders(config: ReminderConfig): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const granted = await requestPermission();
  if (!granted) {
    return;
  }
  for (const weekday of config.weekdays) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Ad Sidera',
        body: ENCOURAGING_REMINDERS[weekday % ENCOURAGING_REMINDERS.length] ?? ENCOURAGING_REMINDERS[0]!,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        // Expo usa 1=domingo..7=sábado; convertemos de ISO (1=seg..7=dom).
        weekday: weekday === 7 ? 1 : weekday + 1,
        hour: config.hour,
        minute: config.minute,
      },
    });
  }
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
