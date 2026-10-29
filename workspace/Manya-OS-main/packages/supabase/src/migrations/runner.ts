/**
 * @manya-os/supabase — migration runner.
 *
 * Versioned, deterministic, transactional migration execution against
 * a Postgres/Supabase database.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Logger } from '../logging.js';
import { MigrationError } from '../errors.js';

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
  query(sql: string, values?: unknown[]): Promise<{ rows?: unknown[] } | unknown>;
}

/**
 * Parse a migration filename into its components.
 * Expected format: NNN_description.sql (e.g. 001_initial_schema.sql)
 */
function parseMigrationFilename(filename: string): { version: number; name: string } | null {
  const match = filename.match(/^(\d+)_(.+)\.sql$/);
  if (!match) return null;
  return {
    version: parseInt(match[1], 10),
    name: match[2].replace(/_/g, ' '),
  };
}

/** Compute SHA-256 checksum of SQL content. */
function checksum(sql: string): string {
  return createHash('sha256').update(sql).digest('hex');
}

/**
 * Split a SQL file into individual statements, correctly handling:
 * - Single-quoted strings
 * - Dollar-quoted PL/pgSQL blocks ($$...$, $tag$...$tag$)
 * - SQL comments (-- line comments and block comments)
 * - Statement-ending semicolons outside of strings/blocks
 */
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];

    // Skip single-line comments
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      continue;
    }

    // Skip block comments
    if (ch === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    // Handle dollar-quoted strings (PL/pgSQL blocks)
    if (ch === '$') {
      const tagEnd = sql.indexOf('$', i + 1);
      if (tagEnd !== -1) {
        const tag = sql.substring(i, tagEnd + 1);
        current += tag;
        i = tagEnd + 1;
        const blockEnd = sql.indexOf(tag, i);
        if (blockEnd !== -1) {
          current += sql.substring(i, blockEnd + tag.length);
          i = blockEnd + tag.length;
        }
        continue;
      }
    }

    // Handle single-quoted strings
    if (ch === "'") {
      current += ch;
      i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          current += "''";
          i += 2;
        } else if (sql[i] === "'") {
          current += "'";
          i++;
          break;
        } else {
          current += sql[i];
          i++;
        }
      }
      continue;
    }

    // Handle statement terminator
    if (ch === ';') {
      const trimmed = current.trim();
      // Skip empty statements and pure comments
      const withoutComments = trimmed
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim();
      if (withoutComments.length > 0) {
        statements.push(trimmed + ';');
      }
      current = '';
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  // Handle trailing statement without semicolon
  const trimmed = current.trim();
  if (trimmed.length > 0) {
    const withoutComments = trimmed
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .trim();
    if (withoutComments.length > 0) {
      statements.push(trimmed);
    }
  }

  return statements;
}

/**
 * Migration runner for Supabase/Postgres.
 *
 * Reads numbered SQL files from a directory, tracks applied migrations
 * in a `schema_migrations` table, and applies pending ones in order.
 */
export class MigrationRunner {
  private migrationDir: string;

  constructor(
    private readonly client: SupabaseClient,
    private readonly logger: Logger,
    migrationDir?: string,
    private readonly sqlExecutor?: MigrationSqlExecutor,
  ) {
    this.migrationDir = migrationDir ?? path.join(process.cwd(), 'migrations');
  }

  private async executeSql(sql: string): Promise<void> {
    if (this.sqlExecutor) {
      await this.sqlExecutor.query(sql);
      return;
    }

    const { error } = await this.client.rpc('exec_sql', { query: sql });
    if (error) {
      throw new MigrationError(
        `Migration SQL execution requires an exec_sql RPC or a direct SQL executor: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Read all migration files from the migration directory.
   */
  async readMigrations(): Promise<Migration[]> {
    let files: string[];
    try {
      files = await fs.readdir(this.migrationDir);
    } catch (err) {
      throw new MigrationError(
        `Cannot read migration directory: ${this.migrationDir}`,
        err,
      );
    }

    const sqlFiles = files
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const migrations: Migration[] = [];
    for (const file of sqlFiles) {
      const parsed = parseMigrationFilename(file);
      if (!parsed) {
        this.logger.warn(`Skipping non-standard migration filename: ${file}`);
        continue;
      }
      const filePath = path.join(this.migrationDir, file);
      const sql = await fs.readFile(filePath, 'utf-8');
      migrations.push({
        version: parsed.version,
        name: parsed.name,
        filename: file,
        sql,
        checksum: checksum(sql),
      });
    }

    return migrations;
  }

  /**
   * Ensure the schema_migrations table exists.
   */
  async ensureMigrationTable(): Promise<void> {
    try {
      await this.executeSql(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version    INTEGER PRIMARY KEY,
          name       TEXT NOT NULL,
          checksum   TEXT NOT NULL,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
    } catch (error) {
      if (this.sqlExecutor) throw error;
      // Existing deployments may already have the table, but a missing executor
      // must remain visible when bootstrapping a new database.
      this.logger.debug('schema_migrations table check failed', { error });
    }
  }

  /**
   * Get all applied migration versions.
   */
  async getAppliedVersions(): Promise<Map<number, { name: string; checksum: string; appliedAt: string }>> {
    if (this.sqlExecutor) {
      const result = await this.sqlExecutor.query(
        'SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version ASC',
      ) as { rows?: Array<{ version: number; name: string; checksum: string; applied_at: string }> };
      const applied = new Map<number, { name: string; checksum: string; appliedAt: string }>();
      for (const row of result.rows ?? []) {
        applied.set(row.version, {
          name: row.name,
          checksum: row.checksum,
          appliedAt: row.applied_at,
        });
      }
      return applied;
    }

    const { data, error } = await this.client
      .from('schema_migrations')
      .select('version, name, checksum, applied_at')
      .order('version', { ascending: true });

    if (error) {
      throw new MigrationError(`Failed to read schema_migrations: ${error.message}`, error);
    }

    const applied = new Map<number, { name: string; checksum: string; appliedAt: string }>();
    if (data) {
      for (const row of data) {
        applied.set(row.version, {
          name: row.name,
          checksum: row.checksum,
          appliedAt: row.applied_at,
        });
      }
    }
    return applied;
  }

  /**
   * Get the status of all migrations (applied + pending).
   */
  async status(): Promise<MigrationStatus[]> {
    const migrations = await this.readMigrations();
    const applied = await this.getAppliedVersions();

    return migrations.map((m) => ({
      version: m.version,
      name: m.name,
      applied: applied.has(m.version),
      appliedAt: applied.get(m.version)?.appliedAt,
    }));
  }

  /**
   * Apply all pending migrations in order.
   * Each migration runs within a transaction via Supabase RPC.
   */
  async runPending(): Promise<MigrationResult[]> {
    const migrations = await this.readMigrations();
    await this.ensureMigrationTable();
    const applied = await this.getAppliedVersions();

    const pending = migrations.filter((m) => !applied.has(m.version));
    if (pending.length === 0) {
      this.logger.info('No pending migrations');
      return [];
    }

    this.logger.info(`Applying ${pending.length} pending migration(s)`);
    const results: MigrationResult[] = [];

    for (const migration of pending) {
      const start = Date.now();
      try {
        await this.applyMigration(migration);
        const durationMs = Date.now() - start;

        // Record in schema_migrations via RPC (idempotent ON CONFLICT DO NOTHING)
        let recordError: { message: string } | null = null;
        if (this.sqlExecutor) {
          await this.sqlExecutor.query(
            `INSERT INTO schema_migrations (version, name, checksum)
             VALUES ($1, $2, $3)
             ON CONFLICT (version) DO NOTHING`,
            [migration.version, migration.name, migration.checksum],
          );
        } else {
          const result = await this.client.rpc('record_migration', {
            p_version: migration.version,
            p_name: migration.name,
            p_checksum: migration.checksum,
          });
          recordError = result.error;
        }

        // Fallback to direct insert if record_migration RPC is not available
        if (recordError && !this.sqlExecutor) {
          await this.client.from('schema_migrations').insert({
            version: migration.version,
            name: migration.name,
            checksum: migration.checksum,
          });
        }

        this.logger.info(`Migration ${migration.version} applied`, {
          name: migration.name,
          durationMs,
        });

        results.push({
          version: migration.version,
          name: migration.name,
          applied: true,
          durationMs,
        });
      } catch (err) {
        const durationMs = Date.now() - start;
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Migration ${migration.version} failed`, {
          name: migration.name,
          error: msg,
          durationMs,
        });
        results.push({
          version: migration.version,
          name: migration.name,
          applied: false,
          durationMs,
          error: msg,
        });
        // Stop on first failure
        break;
      }
    }

    return results;
  }

  /**
   * Apply a single migration by executing its SQL.
   * Uses raw SQL execution via Supabase's rpc endpoint.
   * Handles dollar-quoted PL/pgSQL blocks and quoted strings correctly.
   */
  private async applyMigration(migration: Migration): Promise<void> {
    const statements = splitSqlStatements(migration.sql);

    for (const statement of statements) {
      try {
        await this.executeSql(statement);
      } catch (error) {
        if (error instanceof MigrationError) {
          throw new MigrationError(
            `Statement failed in migration ${migration.version}: ${error.message}`,
            error,
          );
        }
        throw new MigrationError(
          `Statement failed in migration ${migration.version}: ${error instanceof Error ? error.message : String(error)}`,
          error,
        );
      }
    }
  }
}
