/**
 * @manya-os/supabase — integration test: session CRUD.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { SupabaseClientFacade } from '../../src/client.js';
import { SupabaseSessionStore } from '../../src/attest/supabase-session-store.js';
import { resolveConfig, type ResolvedConfig } from '../../src/config.js';
import { ConsoleLogger } from '../../src/logging.js';

const INTEGRATION = process.env.SUPABASE_INTEGRATION_TEST === 'true';
const describeIfIntegration = INTEGRATION ? describe : describe.skip;

const TEST_PREFIX = `test_sess_${process.env.JEST_WORKER_ID ?? '0'}_${Date.now()}`;

describeIfIntegration('Session CRUD', () => {
  let config: ResolvedConfig;
  const logger = new ConsoleLogger('silent');
  let facade: SupabaseClientFacade;
  let store: SupabaseSessionStore;

  beforeAll(async () => {
    config = resolveConfig({
      url: process.env.SUPABASE_URL!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      logLevel: 'silent',
    });
    facade = new SupabaseClientFacade(config, logger);
    store = new SupabaseSessionStore(facade.getClient(), config, logger);
    await facade.getClient().from('attest_sessions')
      .delete()
      .like('token', `${TEST_PREFIX}%`);
  });

  afterAll(async () => {
    await facade.getClient().from('attest_sessions')
      .delete()
      .like('token', `${TEST_PREFIX}%`);
    facade.dispose();
  });

  it('put and get session', async () => {
    const token = `${TEST_PREFIX}_tok_${Date.now()}`;
    await store.put({
      token, sessionId: `${TEST_PREFIX}_s1`, createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      fingerprint: `${TEST_PREFIX}_fp`, identity: 'did:test', trustScore: 0.9,
    });
    const result = await store.get(token);
    expect(result).toBeDefined();
    expect(result?.token).toBe(token);
  });

  it('delete session', async () => {
    const token = `${TEST_PREFIX}_tok_del_${Date.now()}`;
    await store.put({
      token, sessionId: `${TEST_PREFIX}_s2`, createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      fingerprint: `${TEST_PREFIX}_fp2`, identity: 'did:test', trustScore: 0.8,
    });
    const deleted = await store.delete(token);
    expect(deleted).toBe(true);
    expect(await store.get(token)).toBeNull();
  });

  it('list returns sessions', async () => {
    const list = await store.list();
    expect(Array.isArray(list)).toBe(true);
  });
});
