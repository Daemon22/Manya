"use strict";
/**
 * @manya-os/supabase - trusted PostgreSQL migration executor.
 *
 * Server-side only. This connection is used to bootstrap fresh databases
 * before the Supabase RPC helpers exist.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresMigrationExecutor = void 0;
const pg_1 = require("pg");
/** PostgreSQL-backed migration executor with explicit lifecycle management. */
class PostgresMigrationExecutor {
    pool;
    constructor(databaseUrl) {
        if (!databaseUrl)
            throw new Error('databaseUrl is required');
        this.pool = new pg_1.Pool({ connectionString: databaseUrl });
    }
    async query(sql, values) {
        const result = await this.pool.query(sql, values);
        return { rows: result.rows };
    }
    async close() {
        await this.pool.end();
    }
}
exports.PostgresMigrationExecutor = PostgresMigrationExecutor;
//# sourceMappingURL=postgres-executor.js.map