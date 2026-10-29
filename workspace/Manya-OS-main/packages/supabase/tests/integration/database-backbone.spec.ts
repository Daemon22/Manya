/**
 * @manya-os/supabase — integration test: database backbone validation.
 *
 * Comprehensive test of the complete database/migration backbone, ensuring
 * it works correctly in both local and production-like environments with
 * proper configuration, migration execution, and state management.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import * as path from 'path';
import { Pool } from 'pg';
import { SupabaseClientFacade } from '../../src/client.js';
import { MigrationRunner } from '../../src/migrations/runner.js';
import { PostgresMigrationExecutor } from '../../src/migrations/postgres-executor.js';
import { resolveConfig, configFromEnv, type ResolvedConfig } from '../../src/config.js';
import { ConsoleLogger } from '../../src/logging.js';

const INTEGRATION = process.env.SUPABASE_INTEGRATION_TEST === 'true';
const describeIfIntegration = INTEGRATION ? describe : describe.skip;

describeIfIntegration('Database Backbone Validation', () => {
  const logger = new ConsoleLogger('silent');
  let pool: Pool;
  let testDatabaseName: string;

  beforeAll(async () => {
    // Set up test database if using direct PostgreSQL
    const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
    if (databaseUrl) {
      pool = new Pool({ connectionString: databaseUrl });
      testDatabaseName = `manya_backbone_test_${Date.now()}`;

      await pool.query(`CREATE DATABASE ${testDatabaseName}`);
      logger.info(`Created backbone test database: ${testDatabaseName}`);
    }
  });

  afterAll(async () => {
    // Clean up test database
    if (pool && testDatabaseName) {
      await pool.query(`DROP DATABASE IF EXISTS ${testDatabaseName}`);
      logger.info(`Dropped backbone test database: ${testDatabaseName}`);
      await pool.end();
    }
  });

  describe('Environment Configuration', () => {
    it('loads configuration from environment variables', () => {
      const config = configFromEnv();

      expect(config.url).toBeDefined();
      expect(config.serviceRoleKey).toBeDefined();
      expect(typeof config.migrateOnStart).toBe('boolean');
      expect(typeof config.timeoutMs).toBe('number');
    });

    it('validates required configuration fields', () => {
      expect(() => {
        resolveConfig({ url: '', serviceRoleKey: '' } as any);
      }).toThrow();

      expect(() => {
        resolveConfig({ url: 'invalid-url', serviceRoleKey: 'key' });
      }).toThrow();
    });

    it('accepts valid configuration', () => {
      const config = resolveConfig({
        url: 'https://valid-project.supabase.co',
        serviceRoleKey: 'valid-service-role-key',
        databaseUrl: 'postgresql://user:pass@host:5432/db',
        migrateOnStart: true,
      });

      expect(config.url).toBe('https://valid-project.supabase.co');
      expect(config.serviceRoleKey).toBe('valid-service-role-key');
      expect(config.databaseUrl).toBe('postgresql://user:pass@host:5432/db');
      expect(config.migrateOnStart).toBe(true);
    });
  });

  describe('PostgresMigrationExecutor', () => {
    let executor: PostgresMigrationExecutor;
    let testDatabaseUrl: string;

    beforeAll(() => {
      const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
      if (databaseUrl && testDatabaseName) {
        testDatabaseUrl = databaseUrl.replace(/\/[^/]*$/, `/${testDatabaseName}`);
        executor = new PostgresMigrationExecutor(testDatabaseUrl);
      }
    });

    afterAll(async () => {
      if (executor) {
        await executor.close();
      }
    });

    it('executes SQL statements', async () => {
      if (!executor) return;

      await executor.query('CREATE TABLE test_table (id INTEGER)');
      const result = await executor.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'test_table'
        );
      `);

      expect(result.rows[0].exists).toBe(true);
    });

    it('handles parameterized queries', async () => {
      if (!executor) return;

      await executor.query('INSERT INTO test_table (id) VALUES ($1)', [42]);
      const result = await executor.query('SELECT id FROM test_table WHERE id = $1', [42]);

      expect(result.rows[0].id).toBe(42);
    });

    it('closes connection properly', async () => {
      if (!executor) return;

      await executor.close();
      // Should not throw when closing again
      await executor.close();
    });
  });

  describe('MigrationRunner with Direct Executor', () => {
    let executor: PostgresMigrationExecutor;
    let testDatabaseUrl: string;

    beforeAll(() => {
      const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
      if (databaseUrl && testDatabaseName) {
        testDatabaseUrl = databaseUrl.replace(/\/[^/]*$/, `/${testDatabaseName}`);
        executor = new PostgresMigrationExecutor(testDatabaseUrl);
      }
    });

    afterAll(async () => {
      if (executor) {
        await executor.close();
      }
    });

    it('creates migration table in fresh database', async () => {
      if (!executor) return;

      const runner = new MigrationRunner(
        { rpc: jest.fn() } as any,
        logger,
        path.join(__dirname, '../../migrations'),
        executor,
      );

      await runner.ensureMigrationTable();

      const result = await executor.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'schema_migrations'
        );
      `);

      expect(result.rows[0].exists).toBe(true);
    });

    it('applies migrations to fresh database', async () => {
      if (!executor) return;

      const runner = new MigrationRunner(
        { rpc: jest.fn() } as any,
        logger,
        path.join(__dirname, '../../migrations'),
        executor,
      );

      const results = await runner.runPending();

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.applied)).toBe(true);
    });

    it('tracks migration state correctly', async () => {
      if (!executor) return;

      const runner = new MigrationRunner(
        { rpc: jest.fn() } as any,
        logger,
        path.join(__dirname, '../../migrations'),
        executor,
      );

      const status = await runner.status();

      expect(status.length).toBeGreaterThan(0);
      expect(status.every(s => s.applied)).toBe(true);
      expect(status.every(s => s.appliedAt)).toBe(true);
    });
  });

  describe('SupabaseClientFacade Integration', () => {
    let facade: SupabaseClientFacade;

    it('creates client with configuration', () => {
      const config = resolveConfig({
        url: process.env.SUPABASE_URL!,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        logLevel: 'silent',
      });

      facade = new SupabaseClientFacade(config, logger);
      expect(facade).toBeDefined();
    });

    it('waits for initialization', async () => {
      if (!facade) return;

      await facade.ready();
      // Should complete without throwing
    });

    it('provides Supabase client', async () => {
      if (!facade) return;

      const client = facade.getClient();
      expect(client).toBeDefined();
    });

    it('pings database successfully', async () => {
      if (!facade) return;

      await facade.ready();
      const canPing = await facade.ping();

      expect(canPing).toBe(true);
    });

    afterAll(() => {
      if (facade) {
        facade.dispose();
      }
    });
  });

  describe('Migration Idempotency', () => {
    let executor: PostgresMigrationExecutor;
    let testDatabaseUrl: string;

    beforeAll(() => {
      const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
      if (databaseUrl && testDatabaseName) {
        testDatabaseUrl = databaseUrl.replace(/\/[^/]*$/, `/${testDatabaseName}`);
        executor = new PostgresMigrationExecutor(testDatabaseUrl);
      }
    });

    afterAll(async () => {
      if (executor) {
        await executor.close();
      }
    });

    it('does not re-run completed migrations', async () => {
      if (!executor) return;

      const runner = new MigrationRunner(
        { rpc: jest.fn() } as any,
        logger,
        path.join(__dirname, '../../migrations'),
        executor,
      );

      // First run
      const results1 = await runner.runPending();
      expect(results1.length).toBeGreaterThan(0);

      // Second run (should be no-op)
      const results2 = await runner.runPending();
      expect(results2.length).toBe(0);
    });

    it('maintains consistent migration state across runs', async () => {
      if (!executor) return;

      const runner = new MigrationRunner(
        { rpc: jest.fn() } as any,
        logger,
        path.join(__dirname, '../../migrations'),
        executor,
      );

      const status1 = await runner.status();
      const status2 = await runner.status();

      expect(status1.length).toBe(status2.length);
      expect(status1.every((s, i) => s.applied === status2[i].applied)).toBe(true);
    });
  });

  describe('End-to-End Flow', () => {
    it('complete flow: config → client → migrations → ready', async () => {
      const config = resolveConfig({
        url: process.env.SUPABASE_URL!,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        logLevel: 'silent',
      });

      const facade = new SupabaseClientFacade(config, logger);
      await facade.ready();

      const client = facade.getClient();
      expect(client).toBeDefined();

      const canPing = await facade.ping();
      expect(canPing).toBe(true);

      facade.dispose();
    });
  });
});
