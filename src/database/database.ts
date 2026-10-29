import type * as SQLiteTypes from 'expo-sqlite';
import { SCHEMA, DATABASE_NAME } from './schema';

export interface IDatabaseResult {
  lastInsertRowId: number;
  changes: number;
}

// Fallback in-memory table store for web or environments where native SQLite is unavailable
interface FallbackRow {
  [key: string]: any;
}

class FallbackDatabaseEngine {
  private tables: Map<string, FallbackRow[]> = new Map();
  private initialized = false;

  public init() {
    if (this.initialized) return;
    this.tables.set('teachers', []);
    this.tables.set('attendance_logs', []);
    this.tables.set('verification_records', []);
    this.tables.set('sync_queue', []);
    this.tables.set('app_key_values', []);

    // Try loading persistent state from localStorage if available
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem('@teacher_db_tables');
        if (stored) {
          const parsed = JSON.parse(stored);
          Object.keys(parsed).forEach(table => {
            this.tables.set(table, parsed[table]);
          });
        }
      } catch (e) {
        console.warn('Fallback DB localStorage load notice:', e);
      }
    }
    this.initialized = true;
  }

  private persist() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const dump: Record<string, FallbackRow[]> = {};
        this.tables.forEach((rows, table) => {
          dump[table] = rows;
        });
        window.localStorage.setItem('@teacher_db_tables', JSON.stringify(dump));
      } catch (e) {
        console.error('Fallback DB persist error:', e);
      }
    }
  }

  public async exec(sql: string): Promise<void> {
    this.init();
    // DDL statements are no-ops in memory since tables are already keyed
  }

  public async run(sql: string, params: any[] = []): Promise<IDatabaseResult> {
    this.init();
    const cleanSql = sql.trim().replace(/\s+/g, ' ');

    // Handle INSERT OR REPLACE / INSERT INTO
    if (cleanSql.toUpperCase().startsWith('INSERT')) {
      const match = cleanSql.match(/INSERT(?:\s+OR\s+REPLACE)?\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        const columns = match[2].split(',').map(c => c.trim().toLowerCase());
        const row: FallbackRow = {};
        columns.forEach((col, idx) => {
          row[col] = params[idx];
        });

        if (!this.tables.has(tableName)) {
          this.tables.set(tableName, []);
        }
        const rows = this.tables.get(tableName)!;
        const pk = row.id || row.key;
        if (pk) {
          const existingIdx = rows.findIndex(r => (r.id && r.id === pk) || (r.key && r.key === pk));
          if (existingIdx >= 0) {
            rows[existingIdx] = { ...rows[existingIdx], ...row };
          } else {
            rows.unshift(row);
          }
        } else {
          rows.unshift(row);
        }
        this.persist();
        return { lastInsertRowId: 1, changes: 1 };
      }
    }

    // Handle UPDATE
    if (cleanSql.toUpperCase().startsWith('UPDATE')) {
      const tableMatch = cleanSql.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
      if (tableMatch) {
        const tableName = tableMatch[1].toLowerCase();
        const rows = this.tables.get(tableName) || [];
        let changes = 0;
        rows.forEach(r => {
          // If update by id
          if (cleanSql.includes('WHERE id = ?') && params.length > 0) {
            const targetId = params[params.length - 1];
            if (r.id === targetId) {
              changes++;
              // Generically parse SET column = ? assignments
              const setClause = tableMatch[2];
              const setParts = setClause.split(',').map(s => s.trim());
              let paramIdx = 0;
              for (const part of setParts) {
                const colMatch = part.match(/^([a-zA-Z0-9_]+)\s*=\s*\?/i);
                if (colMatch && paramIdx < params.length - 1) {
                  const col = colMatch[1].toLowerCase();
                  r[col] = params[paramIdx];
                  paramIdx++;
                } else if (part.match(/^([a-zA-Z0-9_]+)\s*=\s*COALESCE\s*\(\s*\?/i)) {
                  const col2 = part.match(/^([a-zA-Z0-9_]+)/i);
                  if (col2 && paramIdx < params.length - 1) {
                    const val = params[paramIdx];
                    if (val !== null && val !== undefined) {
                      r[col2[1].toLowerCase()] = val;
                    }
                    paramIdx++;
                  }
                } else if (part.match(/^([a-zA-Z0-9_]+)\s*=\s*CASE/i)) {
                  // CASE WHEN expressions use the next param for condition
                  paramIdx++;
                } else if (part.match(/=\s*[a-zA-Z0-9_]+\s*\+\s*\d+/i)) {
                  // Expressions like sync_attempts = sync_attempts + 1
                  const incCol = part.match(/^([a-zA-Z0-9_]+)/i);
                  if (incCol) {
                    r[incCol[1].toLowerCase()] = (Number(r[incCol[1].toLowerCase()]) || 0) + 1;
                  }
                } else {
                  paramIdx++;
                }
              }
            }
          } else if (cleanSql.toUpperCase().includes("WHERE UPPER(STATUS)")) {
            // Bulk update by status (e.g., resetFailedToQueued)
            const statusMatch = cleanSql.match(/UPPER\(STATUS\)\s*=\s*'([^']+)'/i);
            if (statusMatch) {
              const matchStatus = statusMatch[1].toUpperCase();
              if ((r.status || '').toUpperCase() === matchStatus) {
                changes++;
                const setClause = tableMatch[2];
                const setParts = setClause.split(',').map(s => s.trim());
                let paramIdx = 0;
                for (const part of setParts) {
                  const colMatch = part.match(/^([a-zA-Z0-9_]+)\s*=\s*'([^']*)'/i);
                  if (colMatch) {
                    r[colMatch[1].toLowerCase()] = colMatch[2];
                  } else if (part.match(/=\s*NULL/i)) {
                    const col = part.match(/^([a-zA-Z0-9_]+)/i);
                    if (col) r[col[1].toLowerCase()] = null;
                  }
                }
              }
            }
          } else {
            changes++;
          }
        });
        this.persist();
        return { lastInsertRowId: 0, changes };
      }
    }

    // Handle DELETE
    if (cleanSql.toUpperCase().startsWith('DELETE')) {
      const match = cleanSql.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+))?/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        const rows = this.tables.get(tableName) || [];
        if (cleanSql.toUpperCase().includes("STATUS) = 'SYNCED'") || cleanSql.toUpperCase().includes("STATUS = 'SYNCED'")) {
          this.tables.set(tableName, rows.filter(r => (r.status || '').toUpperCase() !== 'SYNCED'));
        } else if (params.length > 0 && cleanSql.includes('id = ?')) {
          const targetId = params[0];
          this.tables.set(tableName, rows.filter(r => r.id !== targetId));
        } else if (params.length > 0 && cleanSql.includes('status = ?')) {
          const status = params[0];
          this.tables.set(tableName, rows.filter(r => r.status !== status));
        } else if (!cleanSql.toUpperCase().includes('WHERE')) {
          this.tables.set(tableName, []);
        }
        this.persist();
        return { lastInsertRowId: 0, changes: 1 };
      }
    }

    return { lastInsertRowId: 0, changes: 0 };
  }

  public async getAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    this.init();
    const cleanSql = sql.trim().replace(/\s+/g, ' ');
    const match = cleanSql.match(/FROM\s+([a-zA-Z0-9_]+)/i);
    if (!match) return [];
    const tableName = match[1].toLowerCase();
    const rows = [...(this.tables.get(tableName) || [])];

    // Handle COUNT(*) queries
    if (cleanSql.toUpperCase().includes('COUNT(*)')) {
      let filtered = rows;
      if (cleanSql.toUpperCase().includes('WHERE')) {
        if (cleanSql.toUpperCase().includes("QUEUED") || cleanSql.toUpperCase().includes("PENDING")) {
          filtered = rows.filter(r => ['QUEUED', 'FAILED', 'PENDING'].includes((r.status || '').toUpperCase()));
        }
      }
      return [{ count: filtered.length }] as unknown as T[];
    }

    // Filter by single or dual equality
    if (cleanSql.includes('WHERE')) {
      if (cleanSql.includes('WHERE id = ?')) {
        return rows.filter(r => r.id === params[0]) as unknown as T[];
      }
      if (cleanSql.includes('WHERE entity_id = ?')) {
        return rows.filter(r => r.entity_id === params[0]) as unknown as T[];
      }
      if (cleanSql.includes('WHERE employee_code = ?') || cleanSql.includes('WHERE UPPER(employee_code) = ?')) {
        const code = String(params[0] || '').toUpperCase();
        return rows.filter(r => (r.employee_code || '').toUpperCase() === code) as unknown as T[];
      }
      if (cleanSql.includes('WHERE teacher_id = ? AND date = ?')) {
        return rows.filter(r => r.teacher_id === params[0] && r.date === params[1]) as unknown as T[];
      }
      if (cleanSql.includes('WHERE teacher_id = ?')) {
        return rows.filter(r => r.teacher_id === params[0]) as unknown as T[];
      }
      if (cleanSql.includes('WHERE sync_status = ?')) {
        return rows.filter(r => (r.sync_status || '').toUpperCase() === String(params[0]).toUpperCase()) as unknown as T[];
      }
      if (cleanSql.includes('WHERE (status = ? OR status = ?)')) {
        return rows.filter(r => r.status === params[0] || r.status === params[1]) as unknown as T[];
      }
      if (tableName === 'sync_queue' && (cleanSql.toUpperCase().includes("QUEUED") || cleanSql.toUpperCase().includes("PENDING"))) {
        return rows.filter(r => ['QUEUED', 'FAILED', 'PENDING'].includes((r.status || '').toUpperCase())) as unknown as T[];
      }
      if (cleanSql.includes('WHERE attendance_id = ?')) {
        return rows.filter(r => r.attendance_id === params[0]) as unknown as T[];
      }
      if (cleanSql.includes('WHERE key = ?')) {
        return rows.filter(r => r.key === params[0]) as unknown as T[];
      }
    }

    return rows as unknown as T[];
  }

  public async getFirst<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const list = await this.getAll<T>(sql, params);
    return list.length > 0 ? list[0] : null;
  }

  public clear() {
    this.tables.clear();
    this.initialized = false;
    this.init();
    this.persist();
  }
}

class DatabaseService {
  private sqliteDb: SQLiteTypes.SQLiteDatabase | null = null;
  private fallbackEngine: FallbackDatabaseEngine = new FallbackDatabaseEngine();
  private isInitialized = false;
  private isFallbackMode = false;
  private initPromise: Promise<void> | null = null;

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        let isWeb = false;
        try {
          const RN = require('react-native');
          isWeb = RN?.Platform?.OS === 'web';
        } catch {
          isWeb = typeof window !== 'undefined';
        }

        let SQLiteModule: any = null;
        if (!isWeb) {
          try {
            SQLiteModule = require('expo-sqlite');
          } catch {
            SQLiteModule = null;
          }
        }

        if (SQLiteModule && typeof SQLiteModule.openDatabaseAsync === 'function') {
          if (isWeb) {
            this.isFallbackMode = true;
            this.fallbackEngine.init();
          } else {
            this.sqliteDb = await SQLiteModule.openDatabaseAsync(DATABASE_NAME);
            await this.createSchema();
            this.isFallbackMode = false;
          }
        } else {
          this.isFallbackMode = true;
          this.fallbackEngine.init();
        }
        this.isInitialized = true;
      } catch (err) {
        console.warn('[Database] Initialization fallback triggered:', err);
        this.sqliteDb = null;
        this.isFallbackMode = true;
        this.fallbackEngine.init();
        this.isInitialized = true;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  private async createSchema(): Promise<void> {
    if (!this.sqliteDb) return;
    try {
      try {
        await this.sqliteDb.execAsync('PRAGMA foreign_keys = ON;');
        await this.sqliteDb.execAsync('PRAGMA journal_mode = WAL;');
      } catch {
        // Continue if PRAGMA cannot be altered
      }

      // Create all tables
      for (const tableSql of Object.values(SCHEMA.tables)) {
        await this.sqliteDb.execAsync(tableSql);
      }

      // Create all indexes
      for (const indexSql of SCHEMA.indexes) {
        await this.sqliteDb.execAsync(indexSql);
      }
    } catch (err) {
      console.error('[Database] Schema creation error:', err);
      throw err;
    }
  }

  public isUsingFallback(): boolean {
    return this.isFallbackMode;
  }

  public async execAsync(sql: string): Promise<void> {
    await this.init();
    if (this.sqliteDb && !this.isFallbackMode) {
      try {
        await this.sqliteDb.execAsync(sql);
      } catch (err) {
        console.warn('[Database] Native execAsync error, falling back:', err);
        await this.fallbackEngine.exec(sql);
      }
    } else {
      await this.fallbackEngine.exec(sql);
    }
  }

  private normalizeParams(params?: any[]): any[] {
    if (!params || !Array.isArray(params)) return [];
    return params.map((p) => (p === undefined ? null : p));
  }

  public async runAsync(sql: string, params: any[] = []): Promise<IDatabaseResult> {
    await this.init();
    const cleanParams = this.normalizeParams(params);
    if (this.sqliteDb && !this.isFallbackMode) {
      try {
        if (cleanParams.length === 0) {
          await this.sqliteDb.execAsync(sql);
          return { lastInsertRowId: 0, changes: 1 };
        }
        const res = await this.sqliteDb.runAsync(sql, ...cleanParams);
        return {
          lastInsertRowId: res.lastInsertRowId,
          changes: res.changes,
        };
      } catch (err) {
        console.warn('[Database] Native runAsync error, recovering with fallback engine:', err);
        return this.fallbackEngine.run(sql, cleanParams);
      }
    } else {
      return this.fallbackEngine.run(sql, cleanParams);
    }
  }

  public async getFirstAsync<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    await this.init();
    const cleanParams = this.normalizeParams(params);
    if (this.sqliteDb && !this.isFallbackMode) {
      try {
        return (await this.sqliteDb.getFirstAsync<T>(sql, ...cleanParams)) || null;
      } catch (err) {
        console.warn('[Database] Native getFirstAsync error, recovering with fallback engine:', err);
        return this.fallbackEngine.getFirst<T>(sql, cleanParams);
      }
    } else {
      return this.fallbackEngine.getFirst<T>(sql, cleanParams);
    }
  }

  public async getAllAsync<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    await this.init();
    const cleanParams = this.normalizeParams(params);
    if (this.sqliteDb && !this.isFallbackMode) {
      try {
        return await this.sqliteDb.getAllAsync<T>(sql, ...cleanParams);
      } catch (err) {
        console.warn('[Database] Native getAllAsync error, recovering with fallback engine:', err);
        return this.fallbackEngine.getAll<T>(sql, cleanParams);
      }
    } else {
      return this.fallbackEngine.getAll<T>(sql, cleanParams);
    }
  }

  public async withTransactionAsync<T>(task: () => Promise<T>): Promise<T> {
    await this.init();
    if (this.sqliteDb && !this.isFallbackMode) {
      let result: T;
      try {
        await this.sqliteDb.withTransactionAsync(async () => {
          result = await task();
        });
        return result!;
      } catch (err) {
        console.warn('[Database] Transaction error, attempting standard run:', err);
        return await task();
      }
    } else {
      return await task();
    }
  }

  // Key-value store compatibility layer backed by app_key_values table
  public async get<T = any>(key: string): Promise<T | null> {
    try {
      await this.init();
      const row = await this.getFirstAsync<{ value: string }>('SELECT value FROM app_key_values WHERE key = ?;', [key]);
      if (!row || !row.value) return null;
      return JSON.parse(row.value);
    } catch {
      return null;
    }
  }

  public async set<T = any>(key: string, value: T): Promise<void> {
    try {
      await this.init();
      const serialized = JSON.stringify(value);
      const now = new Date().toISOString();
      await this.runAsync(
        `INSERT INTO app_key_values (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
        [key, serialized, now]
      );
    } catch (err) {
      console.error('Database write error for key:', key, err);
    }
  }

  public async remove(key: string): Promise<void> {
    try {
      await this.init();
      this.fallbackEngine.run('DELETE FROM app_key_values WHERE key = ?;', [key]).catch(() => {});
      if (this.sqliteDb && !this.isFallbackMode) {
        try {
          const escaped = key.replace(/'/g, "''");
          await this.sqliteDb.execAsync(`DELETE FROM app_key_values WHERE key = '${escaped}';`);
        } catch {
          await this.runAsync('DELETE FROM app_key_values WHERE key = ?;', [key]);
        }
      } else {
        await this.fallbackEngine.run('DELETE FROM app_key_values WHERE key = ?;', [key]);
      }
    } catch (err) {
      console.error('Database remove error for key:', key, err);
    }
  }

  public async clearAll(): Promise<void> {
    try {
      await this.init();
      if (this.sqliteDb && !this.isFallbackMode) {
        await this.sqliteDb.execAsync('DELETE FROM teachers;');
        await this.sqliteDb.execAsync('DELETE FROM attendance_logs;');
        await this.sqliteDb.execAsync('DELETE FROM verification_records;');
        await this.sqliteDb.execAsync('DELETE FROM sync_queue;');
        await this.sqliteDb.execAsync('DELETE FROM app_key_values;');
      } else {
        this.fallbackEngine.clear();
      }
    } catch (err) {
      console.error('Database clearAll error:', err);
    }
  }
}

export const db = new DatabaseService();
export default db;
