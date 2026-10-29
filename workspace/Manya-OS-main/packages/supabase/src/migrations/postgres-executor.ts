/**
 * @manya-os/supabase - trusted PostgreSQL migration executor.
 *
 * Server-side only. This connection is used to bootstrap fresh databases
 * before the Supabase RPC helpers exist.
 */

import { Pool } from 'pg';
import type { MigrationSqlExecutor } from './runner.js';

/** PostgreSQL-backed migration executor with explicit lifecycle management. */
export class PostgresMigrationExecutor implements MigrationSqlExecutor {
  private readonly pool: Pool;

  constructor(databaseUrl: string) {
    if (!databaseUrl) throw new Error('databaseUrl is required');
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async query(sql: string, values?: unknown[]): Promise<{ rows: unknown[] }> {
    const result = await this.pool.query(sql, values);
    return { rows: result.rows };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
