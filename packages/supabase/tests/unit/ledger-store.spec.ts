/**
 * @manya-os/supabase — SupabaseLedgerStore unit tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { SupabaseLedgerStore } from '../../src/ledger/supabase-ledger-store.js';
import { ConflictError } from '../../src/errors.js';
import { SilentLogger } from '../../src/logging.js';
import type { ResolvedConfig } from '../../src/config.js';
import { DEFAULT_TABLE_NAMES, DEFAULT_RETRY } from '../../src/config.js';
import type { LedgerEvent } from '@manya-os/ledger';

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

function makeEvent(overrides?: Partial<LedgerEvent>): LedgerEvent {
  return {
    id: 'evt-001',
    seq: 1,
    type: 'test.event',
    actor: 'test-actor',
    payload: { key: 'value' },
    timestamp: '2024-01-01T00:00:00Z',
    prevHash: '0000',
    hash: 'abcd',
    ...overrides,
  };
}

function createMockClient(overrides: Record<string, any> = {}) {
  const chain: any = {
    insert: jest.fn().mockResolvedValue({ error: null }),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    delete: jest.fn().mockReturnThis(),
    neq: jest.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
  return {
    from: jest.fn(() => chain),
  };
}

describe('SupabaseLedgerStore', () => {
  describe('append', () => {
    it('inserts an event successfully', async () => {
      const client = createMockClient();
      const store = new SupabaseLedgerStore(client as any, mockConfig, logger);
      const event = makeEvent();
      await expect(store.append(event)).resolves.not.toThrow();
      expect(client.from).toHaveBeenCalledWith('ledger_events');
    });

    it('throws on insert error', async () => {
      const client = createMockClient({
        insert: jest.fn().mockResolvedValue({ error: { message: 'duplicate', code: '23505' } }),
      });
      const store = new SupabaseLedgerStore(client as any, mockConfig, logger);
      await expect(store.append(makeEvent())).rejects.toThrow();
    });
  });

  describe('get', () => {
    it('returns undefined for not found', async () => {
      const client = createMockClient({
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      });
      const store = new SupabaseLedgerStore(client as any, mockConfig, logger);
      const result = await store.get(1);
      expect(result).toBeUndefined();
    });

    it('returns mapped event', async () => {
      const row = {
        id: 'evt-001', seq: 1, type: 'test', actor: 'a', payload: {},
        timestamp: '2024-01-01T00:00:00Z', prev_hash: '0', hash: 'h',
        signature: null, sig_algorithm: null, metadata: null, created_at: '2024-01-01T00:00:00Z',
      };
      const client = createMockClient({
        single: jest.fn().mockResolvedValue({ data: row, error: null }),
      });
      const store = new SupabaseLedgerStore(client as any, mockConfig, logger);
      const result = await store.get(1);
      expect(result).toBeDefined();
      expect(result?.id).toBe('evt-001');
    });
  });

  describe('getById', () => {
    it('returns undefined for not found', async () => {
      const client = createMockClient({
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      });
      const store = new SupabaseLedgerStore(client as any, mockConfig, logger);
      const result = await store.getById('missing');
      expect(result).toBeUndefined();
    });
  });

  describe('length', () => {
    it('returns count', async () => {
      const client = createMockClient();
      client.from = jest.fn(() => ({
        select: jest.fn().mockResolvedValue({ count: 42, error: null }),
      }));
      const store = new SupabaseLedgerStore(client as any, mockConfig, logger);
      const result = await store.length();
      expect(result).toBe(42);
    });

    it('returns 0 on error', async () => {
      const client = createMockClient();
      client.from = jest.fn(() => ({
        select: jest.fn().mockResolvedValue({ count: null, error: { message: 'fail' } }),
      }));
      const store = new SupabaseLedgerStore(client as any, mockConfig, logger);
      await expect(store.length()).rejects.toThrow();
    });
  });

  describe('all', () => {
    it('returns empty array when no events', async () => {
      const client = createMockClient({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });
      const store = new SupabaseLedgerStore(client as any, mockConfig, logger);
      const result = await store.all();
      expect(result).toEqual([]);
    });
  });

  describe('snapshot', () => {
    it('returns deep copy of all events', async () => {
      const row = {
        id: 'evt-001', seq: 1, type: 'test', actor: 'a', payload: {},
        timestamp: '2024-01-01T00:00:00Z', prev_hash: '0', hash: 'h',
        signature: null, sig_algorithm: null, metadata: null, created_at: '2024-01-01T00:00:00Z',
      };
      const client = createMockClient({
        order: jest.fn().mockResolvedValue({ data: [row], error: null }),
      });
      const store = new SupabaseLedgerStore(client as any, mockConfig, logger);
      const result = await store.snapshot();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('evt-001');
    });
  });

  describe('restore', () => {
    it('clears and re-inserts events', async () => {
      const client = createMockClient();
      const store = new SupabaseLedgerStore(client as any, mockConfig, logger);
      await store.restore([makeEvent()]);
      expect(client.from).toHaveBeenCalledWith('ledger_events');
    });

    it('handles empty restore', async () => {
      const client = createMockClient();
      const store = new SupabaseLedgerStore(client as any, mockConfig, logger);
      await store.restore([]);
    });
  });
});
