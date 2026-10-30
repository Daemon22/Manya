/**
 * @manya-os/supabase — SupabaseMemoryStore unit tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { SupabaseMemoryStore } from '../../src/memory/supabase-memory-store.js';
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
    lt: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    delete: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    ...overrides,
  };
  return {
    from: jest.fn(() => chain),
    rpc: jest.fn().mockResolvedValue({ error: null }),
  };
}

describe('SupabaseMemoryStore', () => {
  describe('episodic', () => {
    it('putEpisodic upserts event', async () => {
      const client = createMockClient();
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      await store.putEpisodic({
        id: 'ep-1', agent: 'test', event: 'action', timestamp: Date.now(),
      });
      expect(client.from).toHaveBeenCalledWith('memory_episodic');
    });

    it('getEpisodic returns null for not found', async () => {
      const client = createMockClient({
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      });
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      const result = await store.getEpisodic('missing');
      expect(result).toBeNull();
    });

    it('getEpisodic returns mapped event', async () => {
      const row = {
        id: 'ep-1', agent: 'test', event: 'action', context: null,
        tags: [], importance: null, source: null, timestamp: 1000, created_at: '2024-01-01T00:00:00Z',
      };
      const client = createMockClient({
        single: jest.fn().mockResolvedValue({ data: row, error: null }),
      });
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      const result = await store.getEpisodic('ep-1');
      expect(result).toBeDefined();
      expect(result?.id).toBe('ep-1');
    });

    it('deleteEpisodic returns boolean', async () => {
      const client = createMockClient({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null, count: 1 }),
      });
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      const result = await store.deleteEpisodic('ep-1');
      expect(result).toBe(true);
    });

    it('listEpisodic returns array', async () => {
      const client = createMockClient({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      const result = await store.listEpisodic();
      expect(Array.isArray(result)).toBe(true);
    });

    it('pruneEpisodic returns count', async () => {
      const client = createMockClient({
        delete: jest.fn().mockReturnThis(),
        lt: jest.fn().mockResolvedValue({ error: null, count: 5 }),
      });
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      const result = await store.pruneEpisodic(Date.now());
      expect(result).toBe(5);
    });
  });

  describe('semantic', () => {
    it('putSemantic upserts fact', async () => {
      const client = createMockClient();
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      await store.putSemantic({
        id: 'sf-1', entity: 'e', attribute: 'a', value: 'v', confidence: 0.9, learnedAt: Date.now(),
      });
      expect(client.from).toHaveBeenCalledWith('memory_semantic');
    });

    it('getSemantic returns null for not found', async () => {
      const client = createMockClient({
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      });
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      expect(await store.getSemantic('missing')).toBeNull();
    });

    it('deleteSemantic returns boolean', async () => {
      const client = createMockClient({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null, count: 1 }),
      });
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      expect(await store.deleteSemantic('sf-1')).toBe(true);
    });

    it('findSemantic returns array', async () => {
      const client = createMockClient({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      });
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      const result = await store.findSemantic('entity');
      expect(Array.isArray(result)).toBe(true);
    });

    it('updateSemanticConfidence returns boolean', async () => {
      const client = createMockClient({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null, count: 1 }),
      });
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      expect(await store.updateSemanticConfidence('sf-1', 0.5)).toBe(true);
    });
  });

  describe('longterm', () => {
    it('putLongterm upserts record', async () => {
      const client = createMockClient();
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      await store.putLongterm({
        id: 'lt-1', type: 'note', payload: {}, createdAt: Date.now(),
        lastAccessedAt: Date.now(), accessCount: 0, importance: 0.5,
      });
      expect(client.from).toHaveBeenCalledWith('memory_longterm');
    });

    it('getLongterm returns null for not found', async () => {
      const client = createMockClient({
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      });
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      expect(await store.getLongterm('missing')).toBeNull();
    });

    it('deleteLongterm returns boolean', async () => {
      const client = createMockClient({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null, count: 1 }),
      });
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      expect(await store.deleteLongterm('lt-1')).toBe(true);
    });

    it('listLongterm returns array', async () => {
      const client = createMockClient({
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      const result = await store.listLongterm();
      expect(Array.isArray(result)).toBe(true);
    });

    it('touchLongterm uses RPC for atomic increment', async () => {
      const rpcMock = jest.fn().mockResolvedValue({ data: true, error: null });
      const client = { from: jest.fn(), rpc: rpcMock };
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      const result = await store.touchLongterm('lt-1');
      expect(result).toBe(true);
      expect(rpcMock).toHaveBeenCalledWith('touch_longterm_record', expect.objectContaining({ p_id: 'lt-1' }));
      expect(rpcMock).toHaveBeenCalledWith('touch_longterm_record', expect.objectContaining({ p_accessed_at: expect.any(Number) }));
    });

    it('touchLongterm returns false when not found', async () => {
      const rpcMock = jest.fn().mockResolvedValue({ data: false, error: null });
      const client = { from: jest.fn(), rpc: rpcMock };
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      const result = await store.touchLongterm('missing');
      expect(result).toBe(false);
    });
  });

  describe('links', () => {
    it('putLink upserts link', async () => {
      const client = createMockClient();
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      await store.putLink({ fromId: 'a', toId: 'b', relation: 'knows' });
      expect(client.from).toHaveBeenCalledWith('memory_links');
    });

    it('deleteLink returns boolean', async () => {
      const client = createMockClient();
      const eq3 = jest.fn().mockResolvedValue({ error: null, count: 1 });
      const eq2 = jest.fn().mockReturnValue({ eq: eq3 });
      const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
      client.from = jest.fn(() => ({
        delete: jest.fn().mockReturnValue({ eq: eq1 }),
      }));
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      expect(await store.deleteLink('a', 'b', 'knows')).toBe(true);
    });

    it('outgoingFrom returns array', async () => {
      const client = createMockClient({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      });
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      const result = await store.outgoingFrom('a');
      expect(Array.isArray(result)).toBe(true);
    });

    it('incomingTo returns array', async () => {
      const client = createMockClient({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      });
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      const result = await store.incomingTo('b');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('permissions', () => {
    it('setPermission upserts permission', async () => {
      const client = createMockClient();
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      await store.setPermission({ recordId: 'r1', readers: ['*'], writers: [], deleters: [] });
      expect(client.from).toHaveBeenCalledWith('memory_permissions');
    });

    it('getPermission returns null for not found', async () => {
      const client = createMockClient({
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      });
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      expect(await store.getPermission('missing')).toBeNull();
    });

    it('deletePermission returns boolean', async () => {
      const client = createMockClient({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null, count: 1 }),
      });
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      expect(await store.deletePermission('r1')).toBe(true);
    });
  });

  describe('bulk operations', () => {
    it('loadSnapshot returns snapshot object', async () => {
      const emptyResult = { data: [], error: null };
      const client = {
        from: jest.fn(() => ({
          select: jest.fn().mockResolvedValue(emptyResult),
        })),
      };
      const store = new SupabaseMemoryStore(client as any, mockConfig, logger);
      const snapshot = await store.loadSnapshot();
      expect(snapshot.schemaVersion).toBe(1);
      expect(snapshot.episodic).toEqual([]);
      expect(snapshot.semantic).toEqual([]);
      expect(snapshot.longterm).toEqual([]);
      expect(snapshot.links).toEqual([]);
      expect(snapshot.permissions).toEqual([]);
    });
  });
});
