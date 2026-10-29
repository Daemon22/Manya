/**
 * @manya-os/supabase — integration test: encrypted storage CRUD.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { SupabaseClientFacade } from '../../src/client.js';
import { SupabaseEncryptedStorage } from '../../src/keyring/supabase-encrypted-storage.js';
import { resolveConfig, type ResolvedConfig } from '../../src/config.js';
import { ConsoleLogger } from '../../src/logging.js';

const INTEGRATION = process.env.SUPABASE_INTEGRATION_TEST === 'true';
const describeIfIntegration = INTEGRATION ? describe : describe.skip;

const TEST_PREFIX = `test_kv_${process.env.JEST_WORKER_ID ?? '0'}_${Date.now()}`;

describeIfIntegration('Encrypted Storage CRUD', () => {
  let config: ResolvedConfig;
  const logger = new ConsoleLogger('silent');
  let facade: SupabaseClientFacade;
  let store: SupabaseEncryptedStorage;

  beforeAll(async () => {
    config = resolveConfig({
      url: process.env.SUPABASE_URL!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      logLevel: 'silent',
    });
    facade = new SupabaseClientFacade(config, logger);
    store = new SupabaseEncryptedStorage(facade.getClient(), config, logger);
    await facade.getClient().from('keyring_kv')
      .delete()
      .like('key', `${TEST_PREFIX}%`);
  });

  afterAll(async () => {
    await facade.getClient().from('keyring_kv')
      .delete()
      .like('key', `${TEST_PREFIX}%`);
    facade.dispose();
  });

  it('put and get binary data', async () => {
    const key = `${TEST_PREFIX}_key_${Date.now()}`;
    const value = Buffer.from('encrypted payload data');
    await store.put(key, value);
    const result = await store.get(key);
    expect(result).toBeDefined();
    expect(result!.toString()).toBe('encrypted payload data');
  });

  it('put overwrites existing value', async () => {
    const key = `${TEST_PREFIX}_overwrite_${Date.now()}`;
    await store.put(key, Buffer.from('v1'));
    await store.put(key, Buffer.from('v2'));
    const result = await store.get(key);
    expect(result!.toString()).toBe('v2');
  });

  it('get returns null for missing key', async () => {
    const result = await store.get(`${TEST_PREFIX}_missing_${Date.now()}`);
    expect(result).toBeNull();
  });

  it('delete removes key', async () => {
    const key = `${TEST_PREFIX}_del_${Date.now()}`;
    await store.put(key, Buffer.from('data'));
    await store.delete(key);
    expect(await store.get(key)).toBeNull();
  });

  it('list returns all keys', async () => {
    const prefix = `${TEST_PREFIX}_list_${Date.now()}`;
    await store.put(`${prefix}:a`, Buffer.from('a'));
    await store.put(`${prefix}:b`, Buffer.from('b'));
    const keys = await store.list(`${prefix}:`);
    expect(keys.length).toBeGreaterThanOrEqual(2);
  });

  it('handles binary data with special bytes', async () => {
    const key = `${TEST_PREFIX}_binary_${Date.now()}`;
    const value = Buffer.from([0x00, 0xff, 0x80, 0x01, 0xfe]);
    await store.put(key, value);
    const result = await store.get(key);
    expect(result).toBeDefined();
    expect(result!.equals(value)).toBe(true);
  });
});
