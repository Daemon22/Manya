/**
 * @manya-os/supabase — MigrationRunner unit tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { MigrationRunner } from '../../src/migrations/runner.js';
import { SilentLogger } from '../../src/logging.js';
import { MigrationError } from '../../src/errors.js';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

const logger = new SilentLogger();

function createMockClient(rpcResult: { data?: any; error?: any } = { data: null, error: null }) {
  return {
    rpc: jest.fn().mockResolvedValue(rpcResult),
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ error: null }),
    })),
  };
}

describe('MigrationRunner', () => {
  describe('constructor', () => {
    it('creates with default migration dir', () => {
      const client = createMockClient();
      const runner = new MigrationRunner(client as any, logger);
      expect(runner).toBeDefined();
    });

    it('creates with custom migration dir', () => {
      const client = createMockClient();
      const runner = new MigrationRunner(client as any, logger, '/custom/path');
      expect(runner).toBeDefined();
    });
  });

  describe('readMigrations', () => {
    it('throws MigrationError for non-existent directory', async () => {
      const client = createMockClient();
      const runner = new MigrationRunner(client as any, logger, '/nonexistent/path');
      await expect(runner.readMigrations()).rejects.toThrow(MigrationError);
    });
  });

  describe('ensureMigrationTable', () => {
    it('calls exec_sql RPC', async () => {
      const client = createMockClient();
      const runner = new MigrationRunner(client as any, logger);
      await runner.ensureMigrationTable();
      expect(client.rpc).toHaveBeenCalled();
    });

    it('does not throw when RPC fails (table may exist)', async () => {
      const client = createMockClient({ error: { message: 'already exists' } });
      const runner = new MigrationRunner(client as any, logger);
      await expect(runner.ensureMigrationTable()).resolves.not.toThrow();
    });

    it('uses a direct SQL executor when provided', async () => {
      const client = createMockClient({ error: { message: 'RPC unavailable' } });
      const executor = { query: jest.fn().mockResolvedValue(undefined) };
      const runner = new MigrationRunner(client as any, logger, undefined, executor);

      await runner.ensureMigrationTable();

      expect(executor.query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS schema_migrations'));
      expect(client.rpc).not.toHaveBeenCalled();
    });
  });

  describe('getAppliedVersions', () => {
    it('returns empty map when no migrations applied', async () => {
      const client = createMockClient();
      const runner = new MigrationRunner(client as any, logger);
      const result = await runner.getAppliedVersions();
      expect(result.size).toBe(0);
    });
  });

  describe('status', () => {
    it('throws for non-existent migration dir', async () => {
      const client = createMockClient();
      const runner = new MigrationRunner(client as any, logger, '/nonexistent');
      await expect(runner.status()).rejects.toThrow(MigrationError);
    });
  });

  describe('runPending', () => {
    it('returns empty array when no migrations dir', async () => {
      const client = createMockClient();
      const runner = new MigrationRunner(client as any, logger, '/nonexistent');
      await expect(runner.runPending()).rejects.toThrow(MigrationError);
    });

    it('bootstraps and records migrations with a direct SQL executor', async () => {
      const migrationDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manya-migrations-'));
      await fs.writeFile(path.join(migrationDir, '001_bootstrap.sql'), 'CREATE TABLE example (id INTEGER);');
      const client = createMockClient();
      const executor = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // First call: ensureMigrationTable (no rows)
          .mockResolvedValueOnce({ rows: [] }) // Second call: getAppliedVersions (no rows)
          .mockResolvedValueOnce(undefined) // Third call: CREATE TABLE schema_migrations
          .mockResolvedValueOnce(undefined) // Fourth call: CREATE TABLE example
          .mockResolvedValueOnce({ rows: [] }) // Fifth call: getAppliedVersions after migration
      };
      const runner = new MigrationRunner(client as any, logger, migrationDir, executor);

      const results = await runner.runPending();

      expect(results).toEqual([expect.objectContaining({ version: 1, applied: true })]);
      expect(executor.query).toHaveBeenCalled();
      expect(executor.query.mock.calls.some(call => call[0].includes('CREATE TABLE IF NOT EXISTS schema_migrations'))).toBe(true);
      expect(executor.query.mock.calls.some(call => call[0].includes('CREATE TABLE example'))).toBe(true);
      await fs.rm(migrationDir, { recursive: true, force: true });
    });
  });
});
