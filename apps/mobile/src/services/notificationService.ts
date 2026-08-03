import * as Notifications from 'expo-notifications';
import { getDatabase } from '../db/database';
import { appStateRepository } from '../db/repositories/appStateRepository';

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

export interface StoredReminderConfig extends ReminderConfig {
  enabled: boolean;
}

const REMINDER_CONFIG_KEY = 'activity_reminder_config_v1';
const DEFAULT_REMINDER_CONFIG: StoredReminderConfig = {
  enabled: false,
  hour: 18,
  minute: 0,
  weekdays: [1, 2, 3, 4, 5],
};

export async function loadActivityReminderConfig(): Promise<StoredReminderConfig> {
  const db = await getDatabase();
  const value = await appStateRepository.get(db, REMINDER_CONFIG_KEY);
  if (!value) return { ...DEFAULT_REMINDER_CONFIG, weekdays: [...DEFAULT_REMINDER_CONFIG.weekdays] };
  try {
    const parsed = JSON.parse(value) as Partial<StoredReminderConfig>;
    return {
      enabled: parsed.enabled === true,
      hour: Number.isInteger(parsed.hour) && parsed.hour! >= 0 && parsed.hour! <= 23 ? parsed.hour! : 18,
      minute: 0,
      weekdays: Array.isArray(parsed.weekdays) && parsed.weekdays.length > 0
        ? parsed.weekdays.filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
        : [...DEFAULT_REMINDER_CONFIG.weekdays],
    };
  } catch {
    return { ...DEFAULT_REMINDER_CONFIG, weekdays: [...DEFAULT_REMINDER_CONFIG.weekdays] };
  }
}

async function persistActivityReminderConfig(config: StoredReminderConfig): Promise<void> {
  const db = await getDatabase();
  await appStateRepository.set(db, REMINDER_CONFIG_KEY, JSON.stringify(config));
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

export async function scheduleWeeklyReminders(config: ReminderConfig): Promise<boolean> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const granted = await requestPermission();
  if (!granted) {
    await persistActivityReminderConfig({ ...config, enabled: false });
    return false;
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
  await persistActivityReminderConfig({ ...config, enabled: true });
  return true;
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const current = await loadActivityReminderConfig();
  await persistActivityReminderConfig({ ...current, enabled: false });
}
