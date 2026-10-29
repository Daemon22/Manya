import { LongTermMemory } from '@manya-os/memory';
import type { LongTermRecord } from '@manya-os/memory';

describe('LongTermMemory', () => {
  describe('store and retrieve', () => {
    test('store and retrieve', () => {
      const lt = new LongTermMemory();
      const id = lt.store({ name: 'record1' });
      const r = lt.retrieve(id);
      expect(r?.payload).toEqual({ name: 'record1' });
      expect(r?.accessCount).toBe(1);
    });

    test('retrieve increments accessCount', () => {
      const lt = new LongTermMemory();
      const id = lt.store('data');
      lt.retrieve(id);
      lt.retrieve(id);
      expect(lt.peek(id)?.accessCount).toBe(2);
    });

    test('retrieve updates lastAccessedAt', () => {
      const lt = new LongTermMemory();
      const id = lt.store('data');
      const before = lt.peek(id)!.lastAccessedAt;
      lt.retrieve(id);
      expect(lt.peek(id)!.lastAccessedAt).toBeGreaterThanOrEqual(before);
    });

    test('retrieve returns null for unknown id', () => {
      const lt = new LongTermMemory();
      expect(lt.retrieve('unknown')).toBeNull();
    });
  });

  describe('peek', () => {
    test('peek does not increment accessCount', () => {
      const lt = new LongTermMemory();
      const id = lt.store('data');
      lt.peek(id);
      lt.peek(id);
      expect(lt.peek(id)?.accessCount).toBe(0);
    });
  });

  describe('update', () => {
    test('update modifies payload', () => {
      const lt = new LongTermMemory();
      const id = lt.store('old');
      lt.update(id, 'new');
      expect(lt.retrieve(id)?.payload).toBe('new');
    });

    test('update throws for unknown id', () => {
      const lt = new LongTermMemory();
      expect(() => lt.update('unknown', 'x')).toThrow();
    });
  });

  describe('delete', () => {
    test('delete removes record', () => {
      const lt = new LongTermMemory();
      const id = lt.store('data');
      expect(lt.delete(id)).toBe(true);
      expect(lt.retrieve(id)).toBeNull();
    });

    test('delete returns false for unknown id', () => {
      const lt = new LongTermMemory();
      expect(lt.delete('unknown')).toBe(false);
    });
  });

  describe('findByTag', () => {
    test('findByTag', () => {
      const lt = new LongTermMemory();
      lt.store('a', { tags: ['red'] });
      lt.store('b', { tags: ['blue'] });
      expect(lt.findByTag('red')).toHaveLength(1);
    });

    test('findByTag returns empty for non-matching tag', () => {
      const lt = new LongTermMemory();
      lt.store('a', { tags: ['red'] });
      expect(lt.findByTag('green')).toHaveLength(0);
    });
  });

  describe('findByType', () => {
    test('findByType filters by type', () => {
      const lt = new LongTermMemory();
      lt.store('a', { type: 'episodic' as const });
      lt.store('b', { type: 'longterm' as const });
      expect(lt.findByType('episodic')).toHaveLength(1);
    });
  });

  describe('all and count', () => {
    test('all returns all records', () => {
      const lt = new LongTermMemory();
      lt.store('a');
      lt.store('b');
      expect(lt.all()).toHaveLength(2);
    });

    test('count returns correct count', () => {
      const lt = new LongTermMemory();
      expect(lt.count()).toBe(0);
      lt.store('a');
      expect(lt.count()).toBe(1);
    });
  });

  describe('staleSince', () => {
    test('finds stale records', () => {
      const lt = new LongTermMemory();
      const id = lt.store('old');
      const r = lt.peek(id)!;
      r.lastAccessedAt = Date.now() - 10000;
      expect(lt.staleSince(Date.now() - 5000).length).toBe(1);
    });

    test('returns empty when no stale records', () => {
      const lt = new LongTermMemory();
      lt.store('fresh');
      expect(lt.staleSince(Date.now() - 100_000)).toHaveLength(0);
    });
  });

  describe('applyAging', () => {
    test('applyAging decays low-access records', () => {
      const lt = new LongTermMemory();
      const id = lt.store('data', { importance: 0.8 });
      const r = lt.peek(id)!;
      r.createdAt = Date.now() - 60 * 86_400_000;
      r.accessCount = 0;
      lt.applyAging();
      expect(lt.peek(id)?.importance).toBeLessThan(0.8);
    });

    test('applyAging preserves high-access records', () => {
      const lt = new LongTermMemory();
      const id = lt.store('data', { importance: 0.8 });
      const r = lt.peek(id)!;
      r.createdAt = Date.now() - 60 * 86_400_000;
      r.accessCount = 10;
      lt.applyAging();
      expect(lt.peek(id)?.importance).toBe(0.8);
    });
  });
});
