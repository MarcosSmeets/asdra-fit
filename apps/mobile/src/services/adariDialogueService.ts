import { getDatabase } from '../db/database';
import { activityRepository } from '../db/repositories/activityRepository';
import { battleSessionRepository } from '../db/repositories/battleSessionRepository';
import {
  selectAdariDialogue,
  type AdariDialogueInput,
} from '../domain/adariDialogue';

export { selectAdariDialogue, type AdariDialogueInput } from '../domain/adariDialogue';

export async function loadAdariDialogue(
  input: Omit<AdariDialogueInput, 'hour' | 'lastActivityAt' | 'lastBattleResult'>,
  now = new Date(),
): Promise<string> {
  const db = await getDatabase();
  const [activities, battle] = await Promise.all([
    activityRepository.list(db, 1, 0),
    battleSessionRepository.latest(db),
  ]);
  return selectAdariDialogue({
    ...input,
    hour: now.getHours(),
    lastActivityAt: activities[0]?.occurredAt ?? null,
    lastBattleResult: battle?.result ?? null,
  }, now);
}
