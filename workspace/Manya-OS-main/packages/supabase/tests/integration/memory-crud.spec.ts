/**
 * @manya-os/supabase — integration test: memory CRUD.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { SupabaseClientFacade } from '../../src/client.js';
import { SupabaseMemoryStore } from '../../src/memory/supabase-memory-store.js';
import { resolveConfig, type ResolvedConfig } from '../../src/config.js';
import { ConsoleLogger } from '../../src/logging.js';

const INTEGRATION = process.env.SUPABASE_INTEGRATION_TEST === 'true';
const describeIfIntegration = INTEGRATION ? describe : describe.skip;

const TEST_PREFIX = `test_mem_${process.env.JEST_WORKER_ID ?? '0'}_${Date.now()}`;

describeIfIntegration('Memory CRUD', () => {
  let config: ResolvedConfig;
  const logger = new ConsoleLogger('silent');
  let facade: SupabaseClientFacade;
  let store: SupabaseMemoryStore;

  async function cleanupTestData() {
    const client = facade.getClient();
    await Promise.all([
      client.from('memory_episodic').delete().like('id', `${TEST_PREFIX}%`),
      client.from('memory_semantic').delete().like('id', `${TEST_PREFIX}%`),
      client.from('memory_longterm').delete().like('id', `${TEST_PREFIX}%`),
      client.from('memory_links').delete().like('from_id', `${TEST_PREFIX}%`),
      client.from('memory_permissions').delete().like('record_id', `${TEST_PREFIX}%`),
    ]);
  }

  beforeAll(async () => {
    config = resolveConfig({
      url: process.env.SUPABASE_URL!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      logLevel: 'silent',
    });
    facade = new SupabaseClientFacade(config, logger);
    store = new SupabaseMemoryStore(facade.getClient(), config, logger);
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    facade.dispose();
  });

  describe('episodic', () => {
    const eventId = `${TEST_PREFIX}_ep_${Date.now()}`;

    it('put and get episodic event', async () => {
      await store.putEpisodic({
        id: eventId, agent: TEST_PREFIX, event: 'user login',
        timestamp: Date.now(), importance: 0.8,
      });
      const result = await store.getEpisodic(eventId);
      expect(result).toBeDefined();
      expect(result?.event).toBe('user login');
    });

    it('delete episodic event', async () => {
      const deleted = await store.deleteEpisodic(eventId);
      expect(deleted).toBe(true);
      const result = await store.getEpisodic(eventId);
      expect(result).toBeNull();
    });
  });

  describe('semantic', () => {
    const factId = `${TEST_PREFIX}_sf_${Date.now()}`;

    it('put and get semantic fact', async () => {
      await store.putSemantic({
        id: factId, entity: `${TEST_PREFIX}_user`, attribute: 'name',
        value: 'Alice', confidence: 0.95, learnedAt: Date.now(),
      });
      const result = await store.getSemantic(factId);
      expect(result).toBeDefined();
      expect(result?.entity).toBe(`${TEST_PREFIX}_user`);
    });

    it('find semantic by entity', async () => {
      const results = await store.findSemantic(`${TEST_PREFIX}_user`);
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('delete semantic fact', async () => {
      const deleted = await store.deleteSemantic(factId);
      expect(deleted).toBe(true);
    });
  });

  describe('longterm', () => {
    const recId = `${TEST_PREFIX}_lt_${Date.now()}`;

    it('put and get longterm record', async () => {
      await store.putLongterm({
        id: recId, type: 'note', payload: { text: 'hello', prefix: TEST_PREFIX },
        createdAt: Date.now(), lastAccessedAt: Date.now(),
        accessCount: 0, importance: 0.5,
      });
      const result = await store.getLongterm(recId);
      expect(result).toBeDefined();
      expect(result?.type).toBe('note');
    });

    it('touch increments access count', async () => {
      const touched = await store.touchLongterm(recId);
      expect(touched).toBe(true);
    });

    it('delete longterm record', async () => {
      const deleted = await store.deleteLongterm(recId);
      expect(deleted).toBe(true);
    });
  });

  describe('links', () => {
    const linkFrom = `${TEST_PREFIX}_link_a`;
    const linkTo = `${TEST_PREFIX}_link_b`;

    it('put and query links', async () => {
      await store.putLink({ fromId: linkFrom, toId: linkTo, relation: 'knows' });
      const outgoing = await store.outgoingFrom(linkFrom);
      expect(outgoing.length).toBeGreaterThanOrEqual(1);
    });

    it('delete link', async () => {
      const deleted = await store.deleteLink(linkFrom, linkTo, 'knows');
      expect(deleted).toBe(true);
    });
  });

  describe('permissions', () => {
    const permId = `${TEST_PREFIX}_perm_${Date.now()}`;

    it('set and get permission', async () => {
      await store.setPermission({
        recordId: permId, readers: ['*'], writers: ['admin'], deleters: [],
      });
      const result = await store.getPermission(permId);
      expect(result).toBeDefined();
      expect(result?.writers).toContain('admin');
    });

    it('delete permission', async () => {
      const deleted = await store.deletePermission(permId);
      expect(deleted).toBe(true);
    });
  });

  describe('snapshot', () => {
    it('loadSnapshot returns valid snapshot', async () => {
      const snap = await store.loadSnapshot();
      expect(snap.schemaVersion).toBe(1);
      expect(Array.isArray(snap.episodic)).toBe(true);
      expect(Array.isArray(snap.semantic)).toBe(true);
      expect(Array.isArray(snap.longterm)).toBe(true);
      expect(Array.isArray(snap.links)).toBe(true);
      expect(Array.isArray(snap.permissions)).toBe(true);
    });
  });
});
