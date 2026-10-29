import {
  SessionManager,
  InMemorySessionStore,
  DEFAULT_SESSION_TTL_MS,
  SESSION_TOKEN_BYTES,
  SessionError,
  type SessionStore,
  type SessionRecord,
} from '@manya-os/attest';

describe('session/store', () => {
  it('InMemorySessionStore get/put/delete/list round-trip', async () => {
    const store = new InMemorySessionStore();
    const record: SessionRecord = {
      token: 'tok1',
      sessionId: 'sid1',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      fingerprint: 'fp1',
      identity: 'id1',
      trustScore: 0.9,
    };
    await store.put(record);
    const got = await store.get('tok1');
    expect(got).not.toBeNull();
    expect(got?.identity).toBe('id1');
    const list = await store.list();
    expect(list.length).toBe(1);
    const deleted = await store.delete('tok1');
    expect(deleted).toBe(true);
    expect(await store.get('tok1')).toBeNull();
    expect(await store.list()).toHaveLength(0);
  });

  it('InMemorySessionStore makes defensive copies', async () => {
    const store = new InMemorySessionStore();
    const record: SessionRecord = {
      token: 'tok1',
      sessionId: 'sid1',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      fingerprint: 'fp1',
      identity: 'id1',
      trustScore: 0.9,
    };
    await store.put(record);
    const got = await store.get('tok1');
    expect(got).not.toBeNull();
    // Mutate the returned record — the store should be unaffected.
    got!.identity = 'mutated';
    const got2 = await store.get('tok1');
    expect(got2?.identity).toBe('id1');
  });

  it('InMemorySessionStore rejects bad input', async () => {
    const store = new InMemorySessionStore();
    await expect(store.get('')).rejects.toThrow(SessionError);
    await expect(store.put({} as SessionRecord)).rejects.toThrow(SessionError);
    await expect(store.put({ token: '' } as SessionRecord)).rejects.toThrow(SessionError);
  });

  it('InMemorySessionStore.delete returns false for unknown tokens', async () => {
    const store = new InMemorySessionStore();
    expect(await store.delete('unknown')).toBe(false);
    expect(await store.delete('')).toBe(false);
  });

  it('clear empties the store', async () => {
    const store = new InMemorySessionStore();
    await store.put({
      token: 'a',
      sessionId: 's',
      createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      fingerprint: 'f',
      identity: 'i',
      trustScore: 1,
    });
    store.clear();
    expect(await store.list()).toHaveLength(0);
  });
});

describe('session/session', () => {
  it('default TTL is 1 hour', () => {
    expect(DEFAULT_SESSION_TTL_MS).toBe(60 * 60 * 1000);
  });

  it('SESSION_TOKEN_BYTES is 32', () => {
    expect(SESSION_TOKEN_BYTES).toBe(32);
  });

  it('establish + verify round-trip', async () => {
    const mgr = new SessionManager();
    const session = await mgr.establish('fp1', 'did:key:zabc');
    expect(session.token).toMatch(/^[0-9a-f]{64}$/);
    expect(session.fingerprint).toBe('fp1');
    expect(session.identity).toBe('did:key:zabc');
    expect(session.trustScore).toBe(1.0);

    const verified = await mgr.verify(session.token);
    expect(verified).not.toBeNull();
    expect(verified?.sessionId).toBe(session.sessionId);
    expect(verified?.identity).toBe('did:key:zabc');
  });

  it('verify returns null for unknown token', async () => {
    const mgr = new SessionManager();
    expect(await mgr.verify('unknown')).toBeNull();
    expect(await mgr.verify('')).toBeNull();
  });

  it('verify returns null for expired sessions', async () => {
    const mgr = new SessionManager();
    const session = await mgr.establish('fp1', 'id1', { ttlMs: 30 });
    await new Promise((r) => setTimeout(r, 60));
    expect(await mgr.verify(session.token)).toBeNull();
  });

  it('revoke deletes a session', async () => {
    const mgr = new SessionManager();
    const session = await mgr.establish('fp1', 'id1');
    expect(await mgr.revoke(session.token)).toBe(true);
    expect(await mgr.verify(session.token)).toBeNull();
    expect(await mgr.revoke(session.token)).toBe(false);
  });

  it('refresh issues a new token and revokes the old one', async () => {
    const mgr = new SessionManager();
    const session = await mgr.establish('fp1', 'id1');
    const refreshed = await mgr.refresh(session.token);
    expect(refreshed.token).not.toBe(session.token);
    expect(refreshed.identity).toBe('id1');
    expect(refreshed.fingerprint).toBe('fp1');
    // Old token is revoked.
    expect(await mgr.verify(session.token)).toBeNull();
    // New token is valid.
    expect(await mgr.verify(refreshed.token)).not.toBeNull();
  });

  it('refresh on an expired session throws', async () => {
    const mgr = new SessionManager();
    const session = await mgr.establish('fp1', 'id1', { ttlMs: 30 });
    await new Promise((r) => setTimeout(r, 60));
    await expect(mgr.refresh(session.token)).rejects.toThrow(SessionError);
  });

  it('refresh on an unknown token throws', async () => {
    const mgr = new SessionManager();
    await expect(mgr.refresh('unknown')).rejects.toThrow(SessionError);
  });

  it('establish validates inputs', async () => {
    const mgr = new SessionManager();
    await expect(mgr.establish('', 'id1')).rejects.toThrow(SessionError);
    await expect(mgr.establish('fp1', '')).rejects.toThrow(SessionError);
    await expect(mgr.establish('fp1', 'id1', { ttlMs: 0 })).rejects.toThrow(SessionError);
    await expect(mgr.establish('fp1', 'id1', { trustScore: 1.5 })).rejects.toThrow(SessionError);
    await expect(mgr.establish('fp1', 'id1', { trustScore: -0.1 })).rejects.toThrow(SessionError);
    await expect(mgr.establish('fp1', 'id1', { trustScore: NaN })).rejects.toThrow(SessionError);
  });

  it('constructor validates defaultTtlMs', () => {
    expect(() => new SessionManager(new InMemorySessionStore(), 0)).toThrow(SessionError);
    expect(() => new SessionManager(new InMemorySessionStore(), -1)).toThrow(SessionError);
  });

  it('boundNonce is preserved on the session record (replay protection)', async () => {
    const store = new InMemorySessionStore();
    const mgr = new SessionManager(store);
    const session = await mgr.establish('fp1', 'id1', { boundNonce: 'nonce-xyz' });
    const record = await store.get(session.token);
    expect(record?.boundNonce).toBe('nonce-xyz');
  });

  it('list returns all active sessions', async () => {
    const mgr = new SessionManager();
    await mgr.establish('fp1', 'id1');
    await mgr.establish('fp2', 'id2');
    const list = await mgr.list();
    expect(list.length).toBe(2);
  });

  it('reap removes expired sessions', async () => {
    const mgr = new SessionManager();
    await mgr.establish('fp1', 'id1', { ttlMs: 30 });
    await mgr.establish('fp2', 'id2', { ttlMs: 60000 });
    await new Promise((r) => setTimeout(r, 60));
    const removed = await mgr.reap();
    expect(removed).toBe(1);
    const list = await mgr.list();
    expect(list.length).toBe(1);
    expect(list[0]!.fingerprint).toBe('fp2');
  });

  it('custom SessionStore can be plugged in', async () => {
    // A minimal custom store that wraps InMemorySessionStore with a prefix.
    class PrefixedStore implements SessionStore {
      private inner = new InMemorySessionStore();
      async get(token: string) {
        return this.inner.get('p:' + token);
      }
      async put(record: SessionRecord) {
        return this.inner.put({ ...record, token: 'p:' + record.token });
      }
      async delete(token: string) {
        return this.inner.delete('p:' + token);
      }
      async list() {
        const all = await this.inner.list();
        return all.map((r) => ({ ...r, token: r.token.slice(2) }));
      }
    }
    const mgr = new SessionManager(new PrefixedStore());
    const s = await mgr.establish('fp', 'id');
    expect(await mgr.verify(s.token)).not.toBeNull();
  });
});
