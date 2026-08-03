import type { ProfileRecord } from '../models';
import type { SqlDatabase, SqlValue } from '../types';
import { profileRepository } from './profileRepository';

function fakeDb(): { db: SqlDatabase; lastSql: () => string; stored: () => Record<string, unknown> | null } {
  let stored: Record<string, unknown> | null = null;
  let sql = '';
  const db = {
    runAsync: async (statement: string, params: SqlValue[] = []) => {
      sql = statement;
      stored = {
        id: params[0], display_name: params[1], timezone: params[2], locale: params[3],
        avatar_type: params[4], share_creature_level: params[5],
        goal: params[6], created_at: params[7], updated_at: params[8], sync_status: params[9],
      };
      return { lastInsertRowId: 1, changes: 1 };
    },
    getFirstAsync: async <T,>() => stored as T | null,
    getAllAsync: async <T,>() => [] as T[],
    execAsync: async () => undefined,
    withTransactionAsync: async (task: () => Promise<void>) => task(),
  } satisfies SqlDatabase;
  return { db, lastSql: () => sql, stored: () => stored };
}

const PROFILE: ProfileRecord = {
  id: 'profile-1', displayName: 'Lia', timezone: 'America/Sao_Paulo', locale: 'pt-BR',
  avatarType: 'star', shareCreatureLevel: false, goal: 'constancy',
  createdAt: '2026-07-22T10:00:00.000Z', updatedAt: '2026-07-22T10:00:00.000Z',
  syncStatus: 'pending',
};

describe('profileRepository', () => {
  it('faz round-trip do perfil', async () => {
    const { db } = fakeDb();
    await profileRepository.upsert(db, PROFILE);
    expect(await profileRepository.get(db)).toEqual(PROFILE);
  });

  // A coluna continua existindo no banco (slot v7 das migrations é imutável),
  // mas nada mais a escreve. Se voltar ao INSERT, o Explorador voltou junto.
  it('não escreve mais a coluna do Explorador', async () => {
    const { db, lastSql, stored } = fakeDb();
    await profileRepository.upsert(db, PROFILE);
    expect(lastSql()).not.toContain('avatar_appearance_json');
    expect(stored()).not.toHaveProperty('avatar_appearance_json');
  });

  // `avatarType` é o emblema usado por liga e duelos — não confundir com o
  // Explorador nem remover junto.
  it('preserva o emblema avatarType', async () => {
    const { db } = fakeDb();
    await profileRepository.upsert(db, { ...PROFILE, avatarType: 'comet' });
    expect((await profileRepository.get(db))?.avatarType).toBe('comet');
  });
});
