/**
 * @manya-os/supabase — typed configuration.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { ConfigError } from './errors.js';
import type { LogLevel, Logger } from './logging.js';
import type { MigrationSqlExecutor } from './migrations/runner.js';

/** Default table names for each domain. */
export const DEFAULT_TABLE_NAMES = {
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
} as const;

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
export type ResolvedConfig = Required<
  Pick<SupabaseConfig, 'url' | 'serviceRoleKey'>
> & {
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

export const DEFAULT_RETRY: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * Validate and resolve a partial config into a full ResolvedConfig.
 * Throws ConfigError for missing required fields.
 */
export function resolveConfig(input: SupabaseConfig): ResolvedConfig {
  if (!input.url || typeof input.url !== 'string') {
    throw new ConfigError('SupabaseConfig.url is required and must be a non-empty string');
  }
  if (!input.serviceRoleKey || typeof input.serviceRoleKey !== 'string') {
    throw new ConfigError('SupabaseConfig.serviceRoleKey is required and must be a non-empty string');
  }

  // Validate URL format
  let parsed: URL;
  try {
    parsed = new URL(input.url);
  } catch {
    throw new ConfigError(`SupabaseConfig.url is not a valid URL: ${input.url}`);
  }
  if (!parsed.protocol.startsWith('http')) {
    throw new ConfigError(`SupabaseConfig.url must use http or https protocol`);
  }

  const tables: TableNames = {
    ...DEFAULT_TABLE_NAMES,
    ...(input.tables ?? {}),
  };

  const retry: RetryConfig = {
    ...DEFAULT_RETRY,
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
export function configFromEnv(overrides?: Partial<SupabaseConfig>): ResolvedConfig {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new ConfigError('SUPABASE_URL environment variable is required');
  if (!serviceRoleKey) throw new ConfigError('SUPABASE_SERVICE_ROLE_KEY environment variable is required');

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
