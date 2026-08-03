import type { ProfileRecord } from '../models';
import type { SqlDatabase, SqlValue } from '../types';
import { profileRepository } from './profileRepository';

describe('profileRepository avatar appearance', () => {
  it('saves and restores the exact modular appearance', async () => {
    let stored: Record<string, unknown> | null = null;
    const db = {
      runAsync: async (_sql: string, params: SqlValue[] = []) => {
        stored = {
          id: params[0], display_name: params[1], timezone: params[2], locale: params[3],
          avatar_type: params[4], avatar_appearance_json: params[5], share_creature_level: params[6],
          goal: params[7], created_at: params[8], updated_at: params[9], sync_status: params[10],
        };
        return { lastInsertRowId: 1, changes: 1 };
      },
      getFirstAsync: async <T,>() => stored as T | null,
      getAllAsync: async <T,>() => [] as T[],
      execAsync: async () => undefined,
      withTransactionAsync: async (task: () => Promise<void>) => task(),
    } satisfies SqlDatabase;
    const profile: ProfileRecord = {
      id: 'profile-1', displayName: 'Lia', timezone: 'America/Sao_Paulo', locale: 'pt-BR',
      avatarType: 'explorer',
      avatarAppearance: {
        bodyModel: 'feminine', skinToneKey: 'luminous', hairStyleKey: 'curly',
        hairColorKey: 'auburn', outfitKey: 'constellation',
      },
      shareCreatureLevel: false, goal: 'constancy', createdAt: '2026-07-22T10:00:00.000Z',
      updatedAt: '2026-07-22T10:00:00.000Z', syncStatus: 'pending',
    };

    await profileRepository.upsert(db, profile);
    const restored = await profileRepository.get(db);

    // Contas antigas (sem accessoryKey) são normalizadas para 'none' ao restaurar.
    expect(restored?.avatarAppearance).toEqual({ ...profile.avatarAppearance, accessoryKey: 'none' });
  });
});
