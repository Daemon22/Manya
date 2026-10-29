/**
 * @manya-os/supabase — Supabase/Postgres persistence adapters.
 *
 * Public API surface for @manya-os/supabase. Everything exported here is part
 * of the stable, semver-bound public API.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
export { DEFAULT_TABLE_NAMES, DEFAULT_RETRY, resolveConfig, configFromEnv, } from './config.js';
export type { TableNames, RetryConfig, SupabaseConfig, ResolvedConfig, } from './config.js';
export { SupabaseError, ConnectionError, QueryTimeoutError, ConflictError, ValidationError, MigrationError, ConfigError, classifyError, isRetryable, } from './errors.js';
export { ConsoleLogger, SilentLogger, createLogger, } from './logging.js';
export type { LogLevel, Logger } from './logging.js';
export type { LedgerEventRow, MemoryEpisodicRow, MemorySemanticRow, MemoryLongtermRow, MemoryLinkRow, MemoryPermissionRow, AttestSessionRow, KeyringIdentityRow, KeyringCredentialRow, KeyringKvRow, KeyringRoleAssignmentRow, CouncilDebateRow, CouncilDecisionRow, ConstitutionAuditRow, CustomsReportRow, } from './types.js';
export { SupabaseClientFacade } from './client.js';
export { withRetry } from './retry.js';
export { SupabaseLedgerStore } from './ledger/supabase-ledger-store.js';
export { SupabaseMemoryStore } from './memory/supabase-memory-store.js';
export { SupabaseSessionStore } from './attest/supabase-session-store.js';
export { SupabaseEncryptedStorage } from './keyring/supabase-encrypted-storage.js';
export { MigrationRunner } from './migrations/runner.js';
export { PostgresMigrationExecutor } from './migrations/postgres-executor.js';
export type { Migration, MigrationStatus, MigrationResult, MigrationSqlExecutor, } from './migrations/runner.js';
//# sourceMappingURL=index.d.ts.map