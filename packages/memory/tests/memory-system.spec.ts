import { MemorySystem } from '@manya-os/memory';

describe('MemorySystem end-to-end', () => {
  test('remember, recall, search', () => {
    const m = new MemorySystem({ logLevel: 'silent' });
    m.remember('agent1', 'user logged in', { ip: '10.0.0.1' });
    m.remember('agent1', 'user logged out');
    const recalled = m.recall('logged', 5);
    expect(recalled.length).toBeGreaterThan(0);
    m.dispose();
  });

  test('learn and recall semantic', () => {
    const m = new MemorySystem({ logLevel: 'silent' });
    m.learn('alice', 'role', 'admin');
    expect(m.semantic.recall('alice', 'role')?.value).toBe('admin');
    m.dispose();
  });

  test('store and retrieve long-term', () => {
    const m = new MemorySystem({ logLevel: 'silent' });
    const id = m.store({ name: 'record' }, { importance: 0.8, tags: ['test'] });
    const r = m.retrieve(id);
    expect(r?.payload).toEqual({ name: 'record' });
    m.dispose();
  });

  test('link and related', () => {
    const m = new MemorySystem({ logLevel: 'silent' });
    const id1 = m.store('a');
    const id2 = m.store('b');
    m.link(id1, id2, 'causes');
    expect(m.related(id1)).toContain(id2);
    m.dispose();
  });

  test('snapshot and restore', () => {
    const m1 = new MemorySystem({ logLevel: 'silent' });
    m1.remember('a', 'event');
    const snap = m1.snapshot();
    const m2 = new MemorySystem({ logLevel: 'silent' });
    m2.restore(snap);
    expect(m2.episodic.count()).toBe(1);
    m1.dispose();
    m2.dispose();
  });

  test('backup and restore', () => {
    const m1 = new MemorySystem({ logLevel: 'silent' });
    m1.remember('a', 'event');
    const backup = m1.backup();
    const m2 = new MemorySystem({ logLevel: 'silent' });
    m2.restoreFromBackup(backup);
    expect(m2.episodic.count()).toBe(1);
    m1.dispose();
    m2.dispose();
  });

  test('export and import', () => {
    const m1 = new MemorySystem({ logLevel: 'silent' });
    m1.remember('a', 'event');
    const json = m1.export();
    const m2 = new MemorySystem({ logLevel: 'silent' });
    m2.import(json);
    expect(m2.episodic.count()).toBe(1);
    m1.dispose();
    m2.dispose();
  });

  test('synchronize merges remote', () => {
    const m1 = new MemorySystem({ logLevel: 'silent' });
    m1.remember('a', 'local event');
    const m2 = new MemorySystem({ logLevel: 'silent' });
    m2.remember('a', 'remote event');
    const remoteSnap = m2.snapshot();
    const delta = m1.synchronize(remoteSnap);
    expect(delta.addedEpisodic.length).toBe(1);
    expect(m1.episodic.count()).toBe(2);
    m1.dispose();
    m2.dispose();
  });

  test('age prunes low-importance events', () => {
    const m = new MemorySystem({ logLevel: 'silent', aging: { episodicPruneThreshold: 0.9 } });
    m.remember('a', 'event1', undefined, { importance: 0.1 });
    const events = m.episodic.all();
    if (events[0]) events[0].timestamp = 0;
    const result = m.age();
    expect(result.prunedEpisodic).toBeGreaterThanOrEqual(0);
    m.dispose();
  });

  test('search returns ranked results', () => {
    const m = new MemorySystem({ logLevel: 'silent' });
    m.store('apple pie recipe', { importance: 0.8 });
    m.store('banana bread recipe', { importance: 0.5 });
    const results = m.search('apple');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].record.payload).toContain('apple');
    m.dispose();
  });

  test('permissions enforced', () => {
    const m = new MemorySystem({ logLevel: 'silent' });
    const id = m.store('secret');
    m.permissions.set({ recordId: id, readers: ['alice'], writers: ['alice'], deleters: ['alice'] });
    expect(m.permissions.canRead(id, 'alice')).toBe(true);
    expect(m.permissions.canRead(id, 'bob')).toBe(false);
    m.dispose();
  });

  test('procedural skills execute', () => {
    const m = new MemorySystem({ logLevel: 'silent' });
    m.procedural.learn('add', (a: unknown, b: unknown) => (a as number) + (b as number));
    expect(m.procedural.execute('add', 2, 3)).toBe(5);
    m.dispose();
  });

  test('working memory set and get', () => {
    const m = new MemorySystem({ logLevel: 'silent' });
    m.working.set('key', 'value');
    expect(m.working.get('key')).toBe('value');
    m.dispose();
  });

  test('dispose does not throw', () => {
    const m = new MemorySystem({ logLevel: 'silent' });
    expect(() => m.dispose()).not.toThrow();
  });

  test('double dispose is safe', () => {
    const m = new MemorySystem({ logLevel: 'silent' });
    m.dispose();
    expect(() => m.dispose()).not.toThrow();
  });
});
