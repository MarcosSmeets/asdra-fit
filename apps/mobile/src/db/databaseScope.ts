export type DatabaseScope =
  | { kind: 'local' }
  | { kind: 'account'; userId: string };

const LOCAL_DATABASE_NAME = 'adsidera.db';

/**
 * O id vem do backend, mas ainda é normalizado antes de virar parte do nome do
 * arquivo. Isso também deixa a regra determinística e fácil de testar.
 */
export function databaseNameForScope(scope: DatabaseScope): string {
  if (scope.kind === 'local') return LOCAL_DATABASE_NAME;
  const safeUserId = scope.userId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!safeUserId) throw new Error('INVALID_ACCOUNT_DATABASE_SCOPE');
  return `adsidera-account-${safeUserId}.db`;
}

export function sameDatabaseScope(left: DatabaseScope, right: DatabaseScope): boolean {
  return databaseNameForScope(left) === databaseNameForScope(right);
}
