/**
 * @manya-os/supabase — end-to-end smoke test.
 *
 * Proves the full persistence loop:
 *   Manya-OS → Supabase adapter → Postgres → read-back
 *
 * Exercises session, memory, ledger, and encrypted storage in a
 * single cohesive workflow with isolated test identifiers.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { SupabaseClientFacade } from '../../src/client.js';
import { SupabaseSessionStore } from '../../src/attest/supabase-session-store.js';
import { SupabaseMemoryStore } from '../../src/memory/supabase-memory-store.js';
import { SupabaseLedgerStore } from '../../src/ledger/supabase-ledger-store.js';
import { SupabaseEncryptedStorage } from '../../src/keyring/supabase-encrypted-storage.js';
import { resolveConfig, type ResolvedConfig } from '../../src/config.js';
import { ConsoleLogger } from '../../src/logging.js';
import type { LedgerEvent } from '@manya-os/ledger';

const INTEGRATION = process.env.SUPABASE_INTEGRATION_TEST === 'true';
const describeIfIntegration = INTEGRATION ? describe : describe.skip;

const PREFIX = `e2e_smoke_${process.env.JEST_WORKER_ID ?? '0'}_${Date.now()}`;

describeIfIntegration('E2E Smoke Test', () => {
  let config: ResolvedConfig;
  const logger = new ConsoleLogger('silent');
  let facade: SupabaseClientFacade;
  let sessionStore: SupabaseSessionStore;
  let memoryStore: SupabaseMemoryStore;
  let ledgerStore: SupabaseLedgerStore;
  let kvStore: SupabaseEncryptedStorage;

  beforeAll(async () => {
    config = resolveConfig({
      url: process.env.SUPABASE_URL!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      logLevel: 'silent',
    });
    facade = new SupabaseClientFacade(config, logger);
    sessionStore = new SupabaseSessionStore(facade.getClient(), config, logger);
    memoryStore = new SupabaseMemoryStore(facade.getClient(), config, logger);
    ledgerStore = new SupabaseLedgerStore(facade.getClient(), config, logger);
    kvStore = new SupabaseEncryptedStorage(facade.getClient(), config, logger);
  });

  afterAll(() => {
    facade.dispose();
  });

  it('full lifecycle: session → memory → ledger → kv → read-back → cleanup', async () => {
    const identityId = `${PREFIX}_identity_01`;
    const sessionId = `${PREFIX}_session_01`;
    const token = `${PREFIX}_token_01`;
    const memoryId = `${PREFIX}_mem_01`;
    const ledgerSeq = 1;
    const ledgerEventId = `${PREFIX}_evt_01`;
    const kvKey = `${PREFIX}:secret`;

    // ── 1. Create session ──
    await sessionStore.put({
      token,
      sessionId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      fingerprint: `${PREFIX}_fingerprint`,
      identity: identityId,
      trustScore: 0.95,
    });
    const retrievedSession = await sessionStore.get(token);
    expect(retrievedSession).toBeDefined();
    expect(retrievedSession!.identity).toBe(identityId);
    expect(retrievedSession!.trustScore).toBe(0.95);

    // ── 2. Persist memory ──
    await memoryStore.putEpisodic({
      id: memoryId,
      agent: identityId,
      event: 'user authenticated via biometric',
      context: { method: 'biometric', device: 'test-device' },
      importance: 0.9,
      timestamp: Date.now(),
    });
    const retrievedMemory = await memoryStore.getEpisodic(memoryId);
    expect(retrievedMemory).toBeDefined();
    expect(retrievedMemory!.agent).toBe(identityId);
    expect(retrievedMemory!.event).toBe('user authenticated via biometric');

    // ── 3. Persist ledger event ──
    const ledgerEvent: LedgerEvent = {
      id: ledgerEventId,
      seq: ledgerSeq,
      type: `${PREFIX}.identity.created`,
      actor: identityId,
      payload: { sessionId, identityId },
      timestamp: new Date().toISOString(),
      prevHash: '0000',
      hash: `hash_${PREFIX}_001`,
    };
    await ledgerStore.append(ledgerEvent);
    const retrievedLedger = await ledgerStore.get(ledgerSeq);
    expect(retrievedLedger).toBeDefined();
    expect(retrievedLedger!.id).toBe(ledgerEventId);
    expect(retrievedLedger!.actor).toBe(identityId);

    // ── 4. Store encrypted blob ──
    const secretPayload = Buffer.from(`encrypted_secret_${PREFIX}`);
    await kvStore.put(kvKey, secretPayload);
    const retrievedBlob = await kvStore.get(kvKey);
    expect(retrievedBlob).toBeDefined();
    expect(retrievedBlob!.toString()).toBe(`encrypted_secret_${PREFIX}`);

    // ── 5. Verify identifiers match across domains ──
    expect(retrievedSession!.identity).toBe(retrievedMemory!.agent);
    expect(retrievedLedger!.actor).toBe(identityId);
    expect(retrievedLedger!.payload).toHaveProperty('sessionId', sessionId);

    // ── 6. Cleanup only test-created records ──
    await sessionStore.delete(token);
    expect(await sessionStore.get(token)).toBeNull();

    await memoryStore.deleteEpisodic(memoryId);
    expect(await memoryStore.getEpisodic(memoryId)).toBeNull();

    await kvStore.delete(kvKey);
    expect(await kvStore.get(kvKey)).toBeNull();

    await facade.getClient().from('ledger_events').delete().eq('id', ledgerEventId);
  }, 30000);

  it('memory longterm lifecycle: create → touch → read-back', async () => {
    const recId = `${PREFIX}_lt_01`;
    await memoryStore.putLongterm({
      id: recId,
      type: 'note',
      payload: { text: 'important observation', prefix: PREFIX },
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
      importance: 0.8,
    });

    const rec = await memoryStore.getLongterm(recId);
    expect(rec).toBeDefined();
    expect(rec!.accessCount).toBe(0);

    const touched = await memoryStore.touchLongterm(recId);
    expect(touched).toBe(true);

    await memoryStore.deleteLongterm(recId);
    expect(await memoryStore.getLongterm(recId)).toBeNull();
  }, 30000);

  it('binary round-trip through encrypted storage', async () => {
    const key = `${PREFIX}:bin`;
    const data = Buffer.from([0x00, 0xff, 0x80, 0x01, 0xfe, 0x7f, 0x00, 0xab]);
    await kvStore.put(key, data);
    const result = await kvStore.get(key);
    expect(result).toBeDefined();
    expect(result!.equals(data)).toBe(true);
    await kvStore.delete(key);
  });
});
