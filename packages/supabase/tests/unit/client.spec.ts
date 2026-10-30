/**
 * @manya-os/supabase — SupabaseClientFacade unit tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { SupabaseClientFacade } from '../../src/client.js';
import { ConnectionError } from '../../src/errors.js';
import { SilentLogger } from '../../src/logging.js';
import type { ResolvedConfig } from '../../src/config.js';
import { DEFAULT_TABLE_NAMES, DEFAULT_RETRY } from '../../src/config.js';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        limit: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

const mockConfig: ResolvedConfig = {
  url: 'https://test.supabase.co',
  serviceRoleKey: 'test-key',
  migrateOnStart: false,
  migrationDir: './migrations',
  poolMin: 1,
  poolMax: 10,
  timeoutMs: 30000,
  tables: DEFAULT_TABLE_NAMES,
  retry: DEFAULT_RETRY,
  logLevel: 'silent',
};

const logger = new SilentLogger();

describe('SupabaseClientFacade', () => {
  const facades: SupabaseClientFacade[] = [];

  afterEach(() => {
    for (const f of facades) f.dispose();
    facades.length = 0;
  });

  it('creates a client facade', () => {
    const facade = new SupabaseClientFacade(mockConfig, logger);
    facades.push(facade);
    expect(facade).toBeDefined();
  });

  it('returns the underlying client', () => {
    const facade = new SupabaseClientFacade(mockConfig, logger);
    facades.push(facade);
    const client = facade.getClient();
    expect(client).toBeDefined();
  });

  it('throws ConnectionError after dispose', () => {
    const facade = new SupabaseClientFacade(mockConfig, logger);
    facade.dispose();
    expect(() => facade.getClient()).toThrow(ConnectionError);
  });

  it('dispose is idempotent', () => {
    const facade = new SupabaseClientFacade(mockConfig, logger);
    facades.push(facade);
    expect(() => facade.dispose()).not.toThrow();
    expect(() => facade.dispose()).not.toThrow();
  });

  it('ping returns boolean', async () => {
    const facade = new SupabaseClientFacade(mockConfig, logger);
    facades.push(facade);
    const result = await facade.ping();
    expect(typeof result).toBe('boolean');
  });

  it('ready resolves when startup migrations are disabled', async () => {
    const facade = new SupabaseClientFacade(mockConfig, logger);
    facades.push(facade);
    await expect(facade.ready()).resolves.toBeUndefined();
  });

  it('runs startup migrations when migrateOnStart is enabled', async () => {
    const migrationDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manya-startup-migrations-'));
    await fs.writeFile(path.join(migrationDir, '001_bootstrap.sql'), 'CREATE TABLE example (id INTEGER);');
    const executor = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] }) // First call: ensureMigrationTable (no rows)
        .mockResolvedValueOnce({ rows: [] }) // Second call: getAppliedVersions (no rows)
        .mockResolvedValueOnce(undefined) // Third call: CREATE TABLE schema_migrations
        .mockResolvedValueOnce(undefined) // Fourth call: CREATE TABLE example
        .mockResolvedValueOnce({ rows: [] }) // Fifth call: getAppliedVersions after migration
    };
    const config = {
      ...mockConfig,
      migrateOnStart: true,
      migrationDir,
      migrationExecutor: executor,
    };
    const facade = new SupabaseClientFacade(config, logger);
    facades.push(facade);

    await expect(facade.ready()).resolves.toBeUndefined();
    expect(executor.query).toHaveBeenCalled();
    await fs.rm(migrationDir, { recursive: true, force: true });
  });
});
