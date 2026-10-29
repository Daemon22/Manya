/**
 * @manya-os/supabase — typed configuration.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { LogLevel, Logger } from './logging.js';
import type { MigrationSqlExecutor } from './migrations/runner.js';
/** Default table names for each domain. */
export declare const DEFAULT_TABLE_NAMES: {
    readonly ledgerEvents: "ledger_events";
    readonly memoryEpisodic: "memory_episodic";
    readonly memorySemantic: "memory_semantic";
    readonly memoryLongterm: "memory_longterm";
    readonly memoryLinks: "memory_links";
    readonly memoryPermissions: "memory_permissions";
    readonly attestSessions: "attest_sessions";
    readonly keyringIdentities: "keyring_identities";
    readonly keyringCredentials: "keyring_credentials";
    readonly keyringRoleAssignments: "keyring_role_assignments";
    readonly keyringKv: "keyring_kv";
    readonly councilDebates: "council_debates";
    readonly councilDecisions: "council_decisions";
    readonly constitutionAudit: "constitution_audit";
    readonly customsReports: "customs_reports";
};
/** Table name overrides. */
export type TableNames = typeof DEFAULT_TABLE_NAMES;
/** Retry configuration for transient errors. */
export interface RetryConfig {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
}
/** Full Supabase adapter configuration. */
export interface SupabaseConfig {
    /** Supabase project URL (e.g. https://xyz.supabase.co). Required. */
    url: string;
    /** Service-role key — server-side only. Never expose to clients. Required. */
    serviceRoleKey: string;
    /** Trusted PostgreSQL URL for fresh-database migrations. Server-side only. */
    databaseUrl?: string;
    /** Anonymous key — client-safe. Optional. */
    anonKey?: string;
    /** Automatically run pending migrations on first connection. Default: false. */
    migrateOnStart?: boolean;
    /** Path to migration SQL files. Default: ./migrations */
    migrationDir?: string;
    /** Connection pool minimum size. Default: 1 */
    poolMin?: number;
    /** Connection pool maximum size. Default: 10 */
    poolMax?: number;
    /** Query timeout in ms. Default: 30000 */
    timeoutMs?: number;
    /** Table name overrides. */
    tables?: Partial<TableNames>;
    /** Retry config for transient errors. */
    retry?: Partial<RetryConfig>;
    /** Trusted server-side SQL executor used for migrations when configured. */
    migrationExecutor?: MigrationSqlExecutor;
    /** Log level. Default: 'info' */
    logLevel?: LogLevel;
    /** Custom logger. Overrides logLevel. */
    logger?: Logger;
}
/** Resolved configuration with all defaults applied. */
export type ResolvedConfig = Required<Pick<SupabaseConfig, 'url' | 'serviceRoleKey'>> & {
    databaseUrl?: string;
    anonKey?: string;
    migrateOnStart: boolean;
    migrationDir: string;
    poolMin: number;
    poolMax: number;
    timeoutMs: number;
    tables: TableNames;
    retry: RetryConfig;
    migrationExecutor?: MigrationSqlExecutor;
    logLevel: LogLevel;
    logger?: Logger;
};
export declare const DEFAULT_RETRY: RetryConfig;
/**
 * Validate and resolve a partial config into a full ResolvedConfig.
 * Throws ConfigError for missing required fields.
 */
export declare function resolveConfig(input: SupabaseConfig): ResolvedConfig;
/**
 * Build configuration from environment variables.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
export declare function configFromEnv(overrides?: Partial<SupabaseConfig>): ResolvedConfig;
//# sourceMappingURL=config.d.ts.map