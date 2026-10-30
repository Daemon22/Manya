/**
 * @manya-os/supabase — SupabaseEncryptedStorage unit tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { SupabaseEncryptedStorage } from '../../src/keyring/supabase-encrypted-storage.js';
import { SilentLogger } from '../../src/logging.js';
import type { ResolvedConfig } from '../../src/config.js';
import { DEFAULT_TABLE_NAMES, DEFAULT_RETRY } from '../../src/config.js';

const logger = new SilentLogger();
const mockConfig: ResolvedConfig = {
  url: 'https://test.supabase.co',
  serviceRoleKey: 'test-key',
  migrateOnStart: false,
  migrationDir: './migrations',
  poolMin: 1,
  poolMax: 10,
  timeoutMs: 30000,
  tables: DEFAULT_TABLE_NAMES,
  retry: { ...DEFAULT_RETRY, maxAttempts: 1 },
  logLevel: 'silent',
};

function createMockClient(overrides: Record<string, any> = {}) {
  const chain: any = {
    insert: jest.fn().mockResolvedValue({ error: null }),
    upsert: jest.fn().mockResolvedValue({ error: null }),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    delete: jest.fn().mockReturnThis(),
    ...overrides,
  };
  return {
    from: jest.fn(() => chain),
  };
}

describe('SupabaseEncryptedStorage', () => {
  describe('get', () => {
    it('returns null for not found', async () => {
      const client = createMockClient({
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      });
      const store = new SupabaseEncryptedStorage(client as any, mockConfig, logger);
      const result = await store.get('missing');
      expect(result).toBeNull();
    });

    it('returns decoded Buffer for found key', async () => {
      const original = Buffer.from('hello world');
      const base64 = original.toString('base64');
      const client = createMockClient({
        single: jest.fn().mockResolvedValue({ data: { value: base64 }, error: null }),
      });
      const store = new SupabaseEncryptedStorage(client as any, mockConfig, logger);
      const result = await store.get('mykey');
      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result!.toString()).toBe('hello world');
    });

    it('throws on database error', async () => {
      const client = createMockClient({
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
      });
      const store = new SupabaseEncryptedStorage(client as any, mockConfig, logger);
      await expect(store.get('key')).rejects.toThrow();
    });
  });

  describe('put', () => {
    it('upserts base64-encoded value', async () => {
      const client = createMockClient();
      const store = new SupabaseEncryptedStorage(client as any, mockConfig, logger);
      await store.put('mykey', Buffer.from('data'));
      expect(client.from).toHaveBeenCalledWith('keyring_kv');
    });

    it('throws on upsert error', async () => {
      const client = createMockClient({
        upsert: jest.fn().mockResolvedValue({ error: { message: 'fail' } }),
      });
      const store = new SupabaseEncryptedStorage(client as any, mockConfig, logger);
      await expect(store.put('key', Buffer.from('data'))).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('deletes by key', async () => {
      const client = createMockClient();
      const store = new SupabaseEncryptedStorage(client as any, mockConfig, logger);
      await expect(store.delete('mykey')).resolves.not.toThrow();
    });

    it('throws on delete error', async () => {
      const client = createMockClient({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: { message: 'fail' } }),
      });
      const store = new SupabaseEncryptedStorage(client as any, mockConfig, logger);
      await expect(store.delete('key')).rejects.toThrow();
    });
  });

  describe('list', () => {
    it('returns all keys when no prefix', async () => {
      const client = createMockClient({
        order: jest.fn().mockResolvedValue({
          data: [{ key: 'a' }, { key: 'b' }, { key: 'c' }],
          error: null,
        }),
      });
      const store = new SupabaseEncryptedStorage(client as any, mockConfig, logger);
      const result = await store.list();
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('filters by prefix using ilike', async () => {
      const client = createMockClient();
      client.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockResolvedValue({
          data: [{ key: 'wallet:id1' }],
          error: null,
        }),
      }));
      const store = new SupabaseEncryptedStorage(client as any, mockConfig, logger);
      const result = await store.list('wallet:');
      expect(result).toEqual(['wallet:id1']);
    });

    it('returns empty array when no keys', async () => {
      const client = createMockClient({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });
      const store = new SupabaseEncryptedStorage(client as any, mockConfig, logger);
      const result = await store.list();
      expect(result).toEqual([]);
    });
  });
});
