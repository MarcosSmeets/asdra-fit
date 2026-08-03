import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';
import type { SqlDatabase } from './types';
import {
  databaseNameForScope,
  sameDatabaseScope,
  type DatabaseScope,
} from './databaseScope';

let instance: SqlDatabase | null = null;
let scope: DatabaseScope = { kind: 'local' };
let opening: Promise<SqlDatabase> | null = null;
let injectedForTests = false;

/** Abre (uma vez) o banco local e aplica as migrations. */
export async function getDatabase(): Promise<SqlDatabase> {
  if (instance) {
    return instance;
  }
  if (opening) return opening;
  opening = (async () => {
    const db = (await SQLite.openDatabaseAsync(databaseNameForScope(scope))) as unknown as SqlDatabase;
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    await runMigrations(db);
    instance = db;
    opening = null;
    return db;
  })().catch((cause) => {
    opening = null;
    throw cause;
  });
  return opening;
}

/**
 * Troca o namespace local nas fronteiras de autenticação. Cada conta possui
 * seu próprio arquivo SQLite; o perfil local continua no arquivo legado.
 */
export async function setDatabaseScope(nextScope: DatabaseScope): Promise<void> {
  if (sameDatabaseScope(scope, nextScope)) return;
  if (opening) await opening;
  if (instance && !injectedForTests) await instance.closeAsync?.();
  instance = null;
  scope = nextScope;
}

export function getDatabaseScope(): DatabaseScope {
  return scope;
}

/**
 * Fecha o banco atual sem trocar o escopo. O próximo getDatabase() reabre o
 * arquivo (ou o recria do zero, se ele tiver sido apagado do disco).
 */
export async function closeDatabase(): Promise<void> {
  if (opening) await opening.catch(() => undefined);
  if (instance && !injectedForTests) await instance.closeAsync?.();
  instance = null;
  opening = null;
}

/** Apenas para testes: injeta uma implementação de SqlDatabase. */
export function __setDatabaseForTests(db: SqlDatabase | null): void {
  instance = db;
  injectedForTests = db !== null;
  opening = null;
}
