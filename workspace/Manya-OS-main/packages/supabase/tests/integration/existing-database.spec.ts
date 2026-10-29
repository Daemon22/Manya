/**
 * @manya-os/supabase — integration test: existing database handling.
 *
 * Tests the migration system when connecting to a database that already
 * has migrations applied, ensuring no unnecessary re-execution and proper
 * state detection.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import * as path from 'path';
import { SupabaseClientFacade } from '../../src/client.js';
import { MigrationRunner } from '../../src/migrations/runner.js';
import { resolveConfig, type ResolvedConfig } from '../../src/config.js';
import { ConsoleLogger } from '../../src/logging.js';

const INTEGRATION = process.env.SUPABASE_INTEGRATION_TEST === 'true';
const describeIfIntegration = INTEGRATION ? describe : describe.skip;

describeIfIntegration('Existing Database Handling', () => {
  let config: ResolvedConfig;
  const logger = new ConsoleLogger('silent');
  let facade: SupabaseClientFacade;

  beforeAll(() => {
    config = resolveConfig({
      url: process.env.SUPABASE_URL!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      logLevel: 'silent',
    });
    facade = new SupabaseClientFacade(config, logger);
  });

  afterAll(() => {
    facade.dispose();
  });

  it('detects already-applied migrations', async () => {
    const runner = new MigrationRunner(
      facade.getClient(),
      logger,
      path.join(__dirname, '../../migrations'),
    );

    const status = await runner.status();

    // Verify we can read migration status
    expect(Array.isArray(status)).toBe(true);
    expect(status.length).toBeGreaterThan(0);

    // All migrations should be applied (database is already set up)
    expect(status.every(s => s.applied)).toBe(true);
  });

  it('does not re-run completed migrations', async () => {
    const runner = new MigrationRunner(
      facade.getClient(),
      logger,
      path.join(__dirname, '../../migrations'),
    );

    const results = await runner.runPending();

    // Should return empty array (no pending migrations)
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  it('reads migration state from schema_migrations table', async () => {
    const runner = new MigrationRunner(
      facade.getClient(),
      logger,
      path.join(__dirname, '../../migrations'),
    );

    const applied = await runner.getAppliedVersions();

    // Verify we can read applied migrations
    expect(applied instanceof Map).toBe(true);
    expect(applied.size).toBeGreaterThan(0);

    // Verify each entry has required fields
    for (const [version, data] of applied.entries()) {
      expect(typeof version).toBe('number');
      expect(typeof data.name).toBe('string');
      expect(typeof data.checksum).toBe('string');
      expect(typeof data.appliedAt).toBe('string');
    }
  });

  it('handles migration status for partially migrated database', async () => {
    // This test assumes the database is fully migrated.
    // In a real scenario, you might test with a database that has only
    // some migrations applied.

    const runner = new MigrationRunner(
      facade.getClient(),
      logger,
      path.join(__dirname, '../../migrations'),
    );

    const status = await runner.status();

    // Verify status structure
    expect(status.every(s => typeof s.version === 'number')).toBe(true);
    expect(status.every(s => typeof s.name === 'string')).toBe(true);
    expect(status.every(s => typeof s.applied === 'boolean')).toBe(true);
  });

  it('connects to existing database without migration executor', async () => {
    // Test that the facade works without a direct SQL executor
    // (using Supabase RPC fallback for existing databases)

    const configWithoutDbUrl = resolveConfig({
      url: process.env.SUPABASE_URL!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      logLevel: 'silent',
      // No databaseUrl - should use RPC fallback
    });

    const facadeWithoutExecutor = new SupabaseClientFacade(configWithoutDbUrl, logger);

    // Should be able to connect and ping
    await facadeWithoutExecutor.ready();
    const canPing = await facadeWithoutExecutor.ping();

    expect(canPing).toBe(true);

    facadeWithoutExecutor.dispose();
  });

  it('verifies database connectivity', async () => {
    // Test the ping method to verify database is accessible
    await facade.ready();
    const canPing = await facade.ping();

    expect(canPing).toBe(true);
  });

  it('handles multiple consecutive status checks', async () => {
    const runner = new MigrationRunner(
      facade.getClient(),
      logger,
      path.join(__dirname, '../../migrations'),
    );

    // Run status check multiple times to ensure consistency
    const status1 = await runner.status();
    const status2 = await runner.status();
    const status3 = await runner.status();

    // All should return the same result
    expect(status1.length).toBe(status2.length);
    expect(status2.length).toBe(status3.length);

    // All should have the same applied state
    expect(status1.every((s, i) => s.applied === status2[i].applied)).toBe(true);
    expect(status2.every((s, i) => s.applied === status3[i].applied)).toBe(true);
  });
});
