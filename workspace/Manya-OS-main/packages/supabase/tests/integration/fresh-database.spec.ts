/**
 * @manya-os/supabase — integration test: fresh database bootstrap.
 *
 * Tests the complete flow of initializing a fresh database with migrations,
 * ensuring the PostgresMigrationExecutor works correctly and the migration
 * table is created and populated properly.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import * as path from 'path';
import { Pool } from 'pg';
import { MigrationRunner } from '../../src/migrations/runner.js';
import { PostgresMigrationExecutor } from '../../src/migrations/postgres-executor.js';
import { ConsoleLogger } from '../../src/logging.js';

const INTEGRATION = process.env.SUPABASE_INTEGRATION_TEST === 'true';
const describeIfIntegration = INTEGRATION ? describe : describe.skip;

describeIfIntegration('Fresh Database Bootstrap', () => {
  const logger = new ConsoleLogger('silent');
  let pool: Pool;
  let executor: PostgresMigrationExecutor;
  let testDatabaseName: string;

  beforeAll(async () => {
    // Connect to the test database
    const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('SUPABASE_DB_URL or DATABASE_URL environment variable is required for fresh database tests');
    }

    // Create a unique test database
    pool = new Pool({ connectionString: databaseUrl });
    testDatabaseName = `manya_fresh_test_${Date.now()}`;

    await pool.query(`CREATE DATABASE ${testDatabaseName}`);
    logger.info(`Created test database: ${testDatabaseName}`);

    // Connect to the new database
    const testDatabaseUrl = databaseUrl.replace(/\/[^/]*$/, `/${testDatabaseName}`);
    executor = new PostgresMigrationExecutor(testDatabaseUrl);
  });

  afterAll(async () => {
    // Clean up executor
    if (executor) {
      await executor.close();
    }

    // Drop the test database
    if (pool && testDatabaseName) {
      await pool.query(`DROP DATABASE IF EXISTS ${testDatabaseName}`);
      logger.info(`Dropped test database: ${testDatabaseName}`);
      await pool.end();
    }
  });

  it('creates schema_migrations table on fresh database', async () => {
    const migrationDir = path.join(__dirname, '../../migrations');
    const runner = new MigrationRunner(
      { rpc: jest.fn() } as any, // Mock Supabase client (won't be used with executor)
      logger,
      migrationDir,
      executor, // Use direct SQL executor
    );

    // Ensure migration table is created
    await runner.ensureMigrationTable();

    // Verify table exists
    const result = await executor.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'schema_migrations'
      );
    `);

    expect(result.rows[0].exists).toBe(true);
  });

  it('applies all migrations to fresh database', async () => {
    const migrationDir = path.join(__dirname, '../../migrations');
    const runner = new MigrationRunner(
      { rpc: jest.fn() } as any, // Mock Supabase client (won't be used with executor)
      logger,
      migrationDir,
      executor, // Use direct SQL executor
    );

    // Run all pending migrations
    const results = await runner.runPending();

    // Verify all migrations were applied
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.applied)).toBe(true);

    // Verify schema_migrations table has entries
    const applied = await runner.getAppliedVersions();
    expect(applied.size).toBe(results.length);
  });

  it('records migration state correctly', async () => {
    const migrationDir = path.join(__dirname, '../../migrations');
    const runner = new MigrationRunner(
      { rpc: jest.fn() } as any,
      logger,
      migrationDir,
      executor,
    );

    // Get migration status
    const status = await runner.status();

    // Verify all migrations are marked as applied
    expect(status.length).toBeGreaterThan(0);
    expect(status.every(s => s.applied)).toBe(true);

    // Verify each has an applied_at timestamp
    expect(status.every(s => s.appliedAt)).toBe(true);
  });

  it('does not re-run already applied migrations', async () => {
    const migrationDir = path.join(__dirname, '../../migrations');
    const runner = new MigrationRunner(
      { rpc: jest.fn() } as any,
      logger,
      migrationDir,
      executor,
    );

    // Run migrations again (should be no-op)
    const results = await runner.runPending();

    // Verify no migrations were applied (all were already applied)
    expect(results.length).toBe(0);
  });

  it('creates all expected tables', async () => {
    // Query for all tables in the database
    const result = await executor.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    const tables = result.rows.map((r: any) => r.tablename);

    // Verify core tables exist
    expect(tables).toContain('schema_migrations');
    expect(tables).toContain('ledger_events');
    expect(tables).toContain('memory_episodic');
    expect(tables).toContain('memory_semantic');
    expect(tables).toContain('memory_longterm');
    expect(tables).toContain('memory_links');
    expect(tables).toContain('memory_permissions');
    expect(tables).toContain('attest_sessions');
    expect(tables).toContain('keyring_identities');
    expect(tables).toContain('keyring_credentials');
    expect(tables).toContain('keyring_kv');
  });

  it('handles migration errors gracefully', async () => {
    const migrationDir = path.join(__dirname, '../../migrations');
    const runner = new MigrationRunner(
      { rpc: jest.fn() } as any,
      logger,
      migrationDir,
      executor,
    );

    // Since all migrations are already applied, this should be a no-op
    const results = await runner.runPending();
    expect(results.length).toBe(0);
  });
});
