import { databaseNameForScope, sameDatabaseScope } from './databaseScope';

describe('database account isolation', () => {
  it('preserves the legacy database exclusively for local mode', () => {
    expect(databaseNameForScope({ kind: 'local' })).toBe('adsidera.db');
  });

  it('gives each authenticated user a different database', () => {
    expect(databaseNameForScope({ kind: 'account', userId: 'user-a' })).not.toBe(
      databaseNameForScope({ kind: 'account', userId: 'user-b' }),
    );
  });

  it('sanitizes an account id before composing the filename', () => {
    expect(databaseNameForScope({ kind: 'account', userId: 'auth0|abc/123' })).toBe(
      'adsidera-account-auth0_abc_123.db',
    );
  });

  it('compares scopes by their effective database', () => {
    expect(sameDatabaseScope(
      { kind: 'account', userId: 'same' },
      { kind: 'account', userId: 'same' },
    )).toBe(true);
  });
});
