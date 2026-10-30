/**
 * @manya-os/supabase — SupabaseSessionStore unit tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { SupabaseSessionStore } from '../../src/attest/supabase-session-store.js';
import { SilentLogger } from '../../src/logging.js';
import type { ResolvedConfig } from '../../src/config.js';
import { DEFAULT_TABLE_NAMES, DEFAULT_RETRY } from '../../src/config.js';
import type { SessionRecord } from '@manya-os/attest';

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

function makeSession(overrides?: Partial<SessionRecord>): SessionRecord {
  return {
    token: 'tok-001',
    sessionId: 'sess-001',
    createdAt: '2024-01-01T00:00:00Z',
    expiresAt: '2024-01-01T01:00:00Z',
    fingerprint: 'fp-abc',
    identity: 'did:test:123',
    trustScore: 0.85,
    boundNonce: 'nonce-1',
    ...overrides,
  };
}

function createMockClient(overrides: Record<string, any> = {}) {
  const chain: any = {
    insert: jest.fn().mockResolvedValue({ error: null }),
    upsert: jest.fn().mockResolvedValue({ error: null }),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    delete: jest.fn().mockReturnThis(),
    ...overrides,
  };
  return {
    from: jest.fn(() => chain),
  };
}

describe('SupabaseSessionStore', () => {
  describe('get', () => {
    it('returns null for not found', async () => {
      const client = createMockClient({
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      });
      const store = new SupabaseSessionStore(client as any, mockConfig, logger);
      const result = await store.get('missing');
      expect(result).toBeNull();
    });

    it('returns mapped session record', async () => {
      const row = {
        token: 'tok-001', session_id: 'sess-001', created_at: '2024-01-01T00:00:00Z',
        expires_at: '2024-01-01T01:00:00Z', fingerprint: { cpus: 4 },
        identity: 'did:test:123', trust_score: 0.85, bound_nonce: 'n1',
        inserted_at: '2024-01-01T00:00:00Z',
      };
      const client = createMockClient({
        single: jest.fn().mockResolvedValue({ data: row, error: null }),
      });
      const store = new SupabaseSessionStore(client as any, mockConfig, logger);
      const result = await store.get('tok-001');
      expect(result).toBeDefined();
      expect(result?.token).toBe('tok-001');
      expect(result?.sessionId).toBe('sess-001');
    });
  });

  describe('put', () => {
    it('upserts session record', async () => {
      const client = createMockClient();
      const store = new SupabaseSessionStore(client as any, mockConfig, logger);
      await expect(store.put(makeSession())).resolves.not.toThrow();
      expect(client.from).toHaveBeenCalledWith('attest_sessions');
    });

    it('throws on upsert error', async () => {
      const client = createMockClient({
        upsert: jest.fn().mockResolvedValue({ error: { message: 'fail' } }),
      });
      const store = new SupabaseSessionStore(client as any, mockConfig, logger);
      await expect(store.put(makeSession())).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('returns true when deleted', async () => {
      const client = createMockClient({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null, count: 1 }),
      });
      const store = new SupabaseSessionStore(client as any, mockConfig, logger);
      expect(await store.delete('tok-001')).toBe(true);
    });

    it('returns false when not found', async () => {
      const client = createMockClient({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null, count: 0 }),
      });
      const store = new SupabaseSessionStore(client as any, mockConfig, logger);
      expect(await store.delete('missing')).toBe(false);
    });
  });

  describe('list', () => {
    it('returns empty array', async () => {
      const client = createMockClient({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });
      const store = new SupabaseSessionStore(client as any, mockConfig, logger);
      const result = await store.list();
      expect(result).toEqual([]);
    });
  });

  describe('pruneExpired', () => {
    it('returns count of pruned sessions', async () => {
      const client = createMockClient({
        delete: jest.fn().mockReturnThis(),
        lt: jest.fn().mockResolvedValue({ error: null, count: 3 }),
      });
      const store = new SupabaseSessionStore(client as any, mockConfig, logger);
      const result = await store.pruneExpired();
      expect(result).toBe(3);
    });
  });
});
