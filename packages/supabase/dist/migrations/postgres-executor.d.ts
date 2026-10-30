/**
 * @manya-os/supabase - trusted PostgreSQL migration executor.
 *
 * Server-side only. This connection is used to bootstrap fresh databases
 * before the Supabase RPC helpers exist.
 */
import type { MigrationSqlExecutor } from './runner.js';
/** PostgreSQL-backed migration executor with explicit lifecycle management. */
export declare class PostgresMigrationExecutor implements MigrationSqlExecutor {
    private readonly pool;
    constructor(databaseUrl: string);
    query(sql: string, values?: unknown[]): Promise<{
        rows: unknown[];
    }>;
    close(): Promise<void>;
}
//# sourceMappingURL=postgres-executor.d.ts.map