import { getDatabase } from '../db/database';
import { appStateRepository, APP_STATE_KEYS } from '../db/repositories/appStateRepository';
import { nowIso } from '../utils/datetime';
import { uuidv4 } from '../utils/id';

/**
 * Telemetria LOCAL e opt-in (DEC-14): eventos ficam no SQLite do aparelho e
 * NUNCA são enviados a servidor algum. Desligada por padrão; desativar apaga
 * o histórico. Serve para o usuário (e o desenvolvimento) enxergarem uso real
 * — retenção, constância — sem abrir mão da filosofia de privacidade.
 */
export type AnalyticsEventName =
  | 'app_opened'
  | 'activity_registered'
  | 'battle_finished'
  | 'onboarding_completed';

export async function isAnalyticsEnabled(): Promise<boolean> {
  const db = await getDatabase();
  return appStateRepository.getBool(db, APP_STATE_KEYS.ANALYTICS_ENABLED);
}

export async function setAnalyticsEnabled(enabled: boolean): Promise<void> {
  const db = await getDatabase();
  await appStateRepository.setBool(db, APP_STATE_KEYS.ANALYTICS_ENABLED, enabled);
  if (!enabled) {
    // Privacidade: desligar também apaga tudo o que foi coletado.
    await db.runAsync('DELETE FROM analytics_events');
  }
}

/** Registra um evento local. Nunca lança; sem opt-in é um no-op. */
export async function track(
  event: AnalyticsEventName,
  properties?: Record<string, string | number | boolean>,
): Promise<void> {
  try {
    const db = await getDatabase();
    if (!(await appStateRepository.getBool(db, APP_STATE_KEYS.ANALYTICS_ENABLED))) {
      return;
    }
    const occurredAt = nowIso();
    await db.runAsync(
      'INSERT INTO analytics_events (id, event, properties_json, occurred_at, day_key) VALUES (?,?,?,?,?)',
      [
        uuidv4(),
        event,
        properties ? JSON.stringify(properties) : null,
        occurredAt,
        occurredAt.slice(0, 10),
      ],
    );
  } catch {
    // Telemetria jamais interfere no uso do app.
  }
}

export interface LocalInsights {
  /** Dias distintos com atividade registrada nos últimos 30 dias. */
  activeDays30: number;
  activities30: number;
  battles30: number;
  appOpens30: number;
  totalEvents: number;
}

export async function getLocalInsights(): Promise<LocalInsights> {
  const db = await getDatabase();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const countSince = async (event: AnalyticsEventName): Promise<number> => {
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM analytics_events WHERE event = ? AND day_key >= ?',
      [event, since],
    );
    return row?.count ?? 0;
  };

  const activeDaysRow = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(DISTINCT day_key) as count FROM analytics_events WHERE event = 'activity_registered' AND day_key >= ?",
    [since],
  );
  const totalRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM analytics_events',
  );

  return {
    activeDays30: activeDaysRow?.count ?? 0,
    activities30: await countSince('activity_registered'),
    battles30: await countSince('battle_finished'),
    appOpens30: await countSince('app_opened'),
    totalEvents: totalRow?.count ?? 0,
  };
}
