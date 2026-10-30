/**
 * @manya-os/supabase — migration runner.
 *
 * Versioned, deterministic, transactional migration execution against
 * a Postgres/Supabase database.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Logger } from '../logging.js';
/** Represents a single migration file. */
export interface Migration {
    version: number;
    name: string;
    filename: string;
    sql: string;
    checksum: string;
}
/** Status of a migration. */
export interface MigrationStatus {
    version: number;
    name: string;
    applied: boolean;
    appliedAt?: string;
}
/** Result of running a migration. */
export interface MigrationResult {
    version: number;
    name: string;
    applied: boolean;
    durationMs: number;
    error?: string;
}
/** Executes arbitrary migration SQL inside the caller's trusted database connection. */
export interface MigrationSqlExecutor {
    query(sql: string, values?: unknown[]): Promise<{
        rows?: unknown[];
    } | unknown>;
}
/**
 * Migration runner for Supabase/Postgres.
 *
 * Reads numbered SQL files from a directory, tracks applied migrations
 * in a `schema_migrations` table, and applies pending ones in order.
 */
export declare class MigrationRunner {
    private readonly client;
    private readonly logger;
    private readonly sqlExecutor?;
    private migrationDir;
    constructor(client: SupabaseClient, logger: Logger, migrationDir?: string, sqlExecutor?: MigrationSqlExecutor | undefined);
    private executeSql;
    /**
     * Read all migration files from the migration directory.
     */
    readMigrations(): Promise<Migration[]>;
    /**
     * Ensure the schema_migrations table exists.
     */
    ensureMigrationTable(): Promise<void>;
    /**
     * Get all applied migration versions.
     */
    getAppliedVersions(): Promise<Map<number, {
        name: string;
        checksum: string;
        appliedAt: string;
    }>>;
    /**
     * Get the status of all migrations (applied + pending).
     */
    status(): Promise<MigrationStatus[]>;
    /**
     * Apply all pending migrations in order.
     * Each migration runs within a transaction via Supabase RPC.
     */
    runPending(): Promise<MigrationResult[]>;
    /**
     * Apply a single migration by executing its SQL.
     * Uses raw SQL execution via Supabase's rpc endpoint.
     * Handles dollar-quoted PL/pgSQL blocks and quoted strings correctly.
     */
    private applyMigration;
}
//# sourceMappingURL=runner.d.ts.map