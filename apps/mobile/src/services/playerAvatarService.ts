import { normalizePlayerAvatarAppearance, type PlayerAvatarAppearance } from '@ad-sidera/shared';
import { getDatabase } from '../db/database';
import { profileRepository } from '../db/repositories/profileRepository';
import { nowIso } from '../utils/datetime';
import { enqueueOperation } from './outbox';
import { profileSyncPayload } from './syncPayloads';

export async function getPlayerAvatarAppearance(): Promise<PlayerAvatarAppearance> {
  const db = await getDatabase();
  return normalizePlayerAvatarAppearance((await profileRepository.get(db))?.avatarAppearance);
}

export async function savePlayerAvatarAppearance(value: PlayerAvatarAppearance): Promise<void> {
  const db = await getDatabase();
  const profile = await profileRepository.get(db);
  if (!profile) throw new Error('Perfil local indisponível.');
  const updated = { ...profile, avatarAppearance: normalizePlayerAvatarAppearance(value), updatedAt: nowIso(), syncStatus: 'pending' as const };
  await db.withTransactionAsync(async () => {
    await profileRepository.upsert(db, updated);
    await enqueueOperation(db, {
      entityType: 'profile', entityId: updated.id, operationType: 'upsert',
      updatedAt: updated.updatedAt, payload: profileSyncPayload(updated),
    });
  });
}

