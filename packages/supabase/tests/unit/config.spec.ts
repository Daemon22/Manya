/**
 * @manya-os/supabase — config unit tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { resolveConfig, configFromEnv, DEFAULT_TABLE_NAMES, DEFAULT_RETRY } from '../../src/config.js';
import { ConfigError } from '../../src/errors.js';

describe('resolveConfig', () => {
  const validInput = {
    url: 'https://test.supabase.co',
    serviceRoleKey: 'test-key-123',
  };

  it('returns resolved config with defaults for valid input', () => {
    const result = resolveConfig(validInput);
    expect(result.url).toBe('https://test.supabase.co');
    expect(result.serviceRoleKey).toBe('test-key-123');
    expect(result.migrateOnStart).toBe(false);
    expect(result.poolMin).toBe(1);
    expect(result.poolMax).toBe(10);
    expect(result.timeoutMs).toBe(30000);
    expect(result.logLevel).toBe('info');
    expect(result.tables).toEqual(DEFAULT_TABLE_NAMES);
    expect(result.retry).toEqual(DEFAULT_RETRY);
  });

  it('strips trailing slash from URL', () => {
    const result = resolveConfig({ ...validInput, url: 'https://test.supabase.co/' });
    expect(result.url).toBe('https://test.supabase.co');
  });

  it('accepts http URLs', () => {
    const result = resolveConfig({ ...validInput, url: 'http://localhost:54321' });
    expect(result.url).toBe('http://localhost:54321');
  });

  it('throws ConfigError for missing url', () => {
    expect(() => resolveConfig({ ...validInput, url: '' })).toThrow(ConfigError);
    expect(() => resolveConfig({ serviceRoleKey: 'key' } as any)).toThrow(ConfigError);
  });

  it('throws ConfigError for missing serviceRoleKey', () => {
    expect(() => resolveConfig({ ...validInput, serviceRoleKey: '' })).toThrow(ConfigError);
  });

  it('throws ConfigError for invalid URL format', () => {
    expect(() => resolveConfig({ ...validInput, url: 'not-a-url' })).toThrow(ConfigError);
  });

  it('throws ConfigError for non-http protocol', () => {
    expect(() => resolveConfig({ ...validInput, url: 'ftp://test.supabase.co' })).toThrow(ConfigError);
  });

  it('applies table name overrides', () => {
    const result = resolveConfig({
      ...validInput,
      tables: { ledgerEvents: 'custom_ledger' },
    });
    expect(result.tables.ledgerEvents).toBe('custom_ledger');
    expect(result.tables.memoryEpisodic).toBe('memory_episodic');
  });

  it('applies retry overrides', () => {
    const result = resolveConfig({
      ...validInput,
      retry: { maxAttempts: 5 },
    });
    expect(result.retry.maxAttempts).toBe(5);
    expect(result.retry.baseDelayMs).toBe(DEFAULT_RETRY.baseDelayMs);
  });

  it('applies all optional overrides', () => {
    const result = resolveConfig({
      ...validInput,
      anonKey: 'anon-123',
      migrateOnStart: true,
      migrationDir: '/custom/migrations',
      poolMin: 2,
      poolMax: 20,
      timeoutMs: 60000,
      logLevel: 'debug',
    });
    expect(result.anonKey).toBe('anon-123');
    expect(result.migrateOnStart).toBe(true);
    expect(result.migrationDir).toBe('/custom/migrations');
    expect(result.poolMin).toBe(2);
    expect(result.poolMax).toBe(20);
    expect(result.timeoutMs).toBe(60000);
    expect(result.logLevel).toBe('debug');
  });

  it('preserves the trusted migration executor', () => {
    const migrationExecutor = { query: jest.fn() };
    const result = resolveConfig({ ...validInput, migrationExecutor });
    expect(result.migrationExecutor).toBe(migrationExecutor);
  });
});

describe('configFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from env', () => {
    process.env.SUPABASE_URL = 'https://env.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'env-key';
    const result = configFromEnv();
    expect(result.url).toBe('https://env.supabase.co');
    expect(result.serviceRoleKey).toBe('env-key');
  });

  it('reads optional env vars', () => {
    process.env.SUPABASE_URL = 'https://env.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'env-key';
    process.env.SUPABASE_ANON_KEY = 'anon-env';
    process.env.SUPABASE_MIGRATE_ON_START = 'true';
    process.env.SUPABASE_TIMEOUT_MS = '5000';
    process.env.SUPABASE_DB_URL = 'postgresql://localhost/manya';
    const result = configFromEnv();
    expect(result.anonKey).toBe('anon-env');
    expect(result.migrateOnStart).toBe(true);
    expect(result.timeoutMs).toBe(5000);
    expect(result.databaseUrl).toBe('postgresql://localhost/manya');
  });

  it('throws ConfigError when SUPABASE_URL is missing', () => {
    delete process.env.SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'key';
    expect(() => configFromEnv()).toThrow(ConfigError);
  });

  it('throws ConfigError when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    process.env.SUPABASE_URL = 'https://env.supabase.co';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => configFromEnv()).toThrow(ConfigError);
  });

  it('applies overrides on top of env vars', () => {
    process.env.SUPABASE_URL = 'https://env.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'env-key';
    const result = configFromEnv({ url: 'https://override.supabase.co' });
    expect(result.url).toBe('https://override.supabase.co');
    expect(result.serviceRoleKey).toBe('env-key');
  });
});
