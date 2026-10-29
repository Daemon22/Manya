"use strict";
/**
 * @manya-os/supabase — typed configuration.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_RETRY = exports.DEFAULT_TABLE_NAMES = void 0;
exports.resolveConfig = resolveConfig;
exports.configFromEnv = configFromEnv;
const errors_js_1 = require("./errors.js");
/** Default table names for each domain. */
exports.DEFAULT_TABLE_NAMES = {
    ledgerEvents: 'ledger_events',
    memoryEpisodic: 'memory_episodic',
    memorySemantic: 'memory_semantic',
    memoryLongterm: 'memory_longterm',
    memoryLinks: 'memory_links',
    memoryPermissions: 'memory_permissions',
    attestSessions: 'attest_sessions',
    keyringIdentities: 'keyring_identities',
    keyringCredentials: 'keyring_credentials',
    keyringRoleAssignments: 'keyring_role_assignments',
    keyringKv: 'keyring_kv',
    councilDebates: 'council_debates',
    councilDecisions: 'council_decisions',
    constitutionAudit: 'constitution_audit',
    customsReports: 'customs_reports',
};
exports.DEFAULT_RETRY = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
};
/**
 * Validate and resolve a partial config into a full ResolvedConfig.
 * Throws ConfigError for missing required fields.
 */
function resolveConfig(input) {
    if (!input.url || typeof input.url !== 'string') {
        throw new errors_js_1.ConfigError('SupabaseConfig.url is required and must be a non-empty string');
    }
    if (!input.serviceRoleKey || typeof input.serviceRoleKey !== 'string') {
        throw new errors_js_1.ConfigError('SupabaseConfig.serviceRoleKey is required and must be a non-empty string');
    }
    // Validate URL format
    let parsed;
    try {
        parsed = new URL(input.url);
    }
    catch {
        throw new errors_js_1.ConfigError(`SupabaseConfig.url is not a valid URL: ${input.url}`);
    }
    if (!parsed.protocol.startsWith('http')) {
        throw new errors_js_1.ConfigError(`SupabaseConfig.url must use http or https protocol`);
    }
    const tables = {
        ...exports.DEFAULT_TABLE_NAMES,
        ...(input.tables ?? {}),
    };
    const retry = {
        ...exports.DEFAULT_RETRY,
        ...(input.retry ?? {}),
    };
    return {
        url: input.url.replace(/\/$/, ''),
        serviceRoleKey: input.serviceRoleKey,
        databaseUrl: input.databaseUrl,
        anonKey: input.anonKey,
        migrateOnStart: input.migrateOnStart ?? false,
        migrationDir: input.migrationDir ?? './migrations',
        poolMin: input.poolMin ?? 1,
        poolMax: input.poolMax ?? 10,
        timeoutMs: input.timeoutMs ?? 30000,
        tables,
        retry,
        migrationExecutor: input.migrationExecutor,
        logLevel: input.logLevel ?? 'info',
        logger: input.logger,
    };
}
/**
 * Build configuration from environment variables.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
function configFromEnv(overrides) {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url)
        throw new errors_js_1.ConfigError('SUPABASE_URL environment variable is required');
    if (!serviceRoleKey)
        throw new errors_js_1.ConfigError('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    return resolveConfig({
        url,
        serviceRoleKey,
        databaseUrl: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
        migrateOnStart: process.env.SUPABASE_MIGRATE_ON_START === 'true',
        migrationDir: process.env.SUPABASE_MIGRATION_DIR,
        timeoutMs: process.env.SUPABASE_TIMEOUT_MS
            ? parseInt(process.env.SUPABASE_TIMEOUT_MS, 10)
            : undefined,
        ...overrides,
    });
}
//# sourceMappingURL=config.js.map