export type SqlValue = string | number | null;

export interface RunResult {
  lastInsertRowId: number;
  changes: number;
}

/**
 * Interface fina sobre o SQLite. A implementação real usa expo-sqlite; os
 * testes de repositório podem injetar uma implementação em memória.
 */
export interface SqlDatabase {
  runAsync(sql: string, params?: SqlValue[]): Promise<RunResult>;
  getAllAsync<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  execAsync(sql: string): Promise<void>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
  closeAsync?: () => Promise<void>;
}
