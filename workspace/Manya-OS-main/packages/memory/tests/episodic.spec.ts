import { EpisodicMemory } from '@manya-os/memory';
import type { EpisodicEvent } from '@manya-os/memory';

describe('EpisodicMemory', () => {
  describe('record and recall', () => {
    test('record and recall', () => {
      const e = new EpisodicMemory();
      e.record('agent1', 'did something');
      e.record('agent1', 'did another thing');
      const events = e.recall(10);
      expect(events).toHaveLength(2);
    });

    test('recall with agent filter', () => {
      const e = new EpisodicMemory();
      e.record('a1', 'event');
      e.record('a2', 'event');
      expect(e.recall(10, 'a1')).toHaveLength(1);
    });

    test('recall respects limit', () => {
      const e = new EpisodicMemory();
      e.record('a', 'event1');
      e.record('a', 'event2');
      e.record('a', 'event3');
      expect(e.recall(2)).toHaveLength(2);
    });

    test('recallRange', () => {
      const e = new EpisodicMemory();
      const t1 = Date.now();
      e.record('a', 'first');
      e.record('a', 'second');
      const events = e.recallRange(t1 - 1, Date.now() + 1);
      expect(events.length).toBe(2);
    });

    test('recallRange with no matches', () => {
      const e = new EpisodicMemory();
      e.record('a', 'event');
      const events = e.recallRange(0, 1);
      expect(events.length).toBe(0);
    });
  });

  describe('search', () => {
    test('search by substring', () => {
      const e = new EpisodicMemory();
      e.record('a', 'user logged in');
      e.record('a', 'user logged out');
      expect(e.search('logged').length).toBe(2);
      expect(e.search('in').length).toBeGreaterThanOrEqual(1);
    });

    test('search returns empty for non-matching query', () => {
      const e = new EpisodicMemory();
      e.record('a', 'hello world');
      expect(e.search('xyz')).toHaveLength(0);
    });
  });

  describe('findByTag', () => {
    test('finds events by tag', () => {
      const e = new EpisodicMemory();
      e.record('a', 'event', undefined, { tags: ['critical'] });
      expect(e.findByTag('critical')).toHaveLength(1);
    });

    test('returns empty for non-matching tag', () => {
      const e = new EpisodicMemory();
      e.record('a', 'event', undefined, { tags: ['low'] });
      expect(e.findByTag('critical')).toHaveLength(0);
    });
  });

  describe('findById', () => {
    test('returns event by id', () => {
      const e = new EpisodicMemory();
      e.record('a', 'event');
      const all = e.all();
      const found = e.findById(all[0]!.id);
      expect(found).not.toBeNull();
      expect(found!.event).toBe('event');
    });

    test('returns undefined for non-existent id', () => {
      const e = new EpisodicMemory();
      expect(e.findById('nonexistent')).toBeUndefined();
    });
  });

  describe('all and count', () => {
    test('all returns all events', () => {
      const e = new EpisodicMemory();
      e.record('a', 'event1');
      e.record('a', 'event2');
      expect(e.all()).toHaveLength(2);
    });

    test('count returns correct count', () => {
      const e = new EpisodicMemory();
      expect(e.count()).toBe(0);
      e.record('a', 'event');
      expect(e.count()).toBe(1);
    });
  });

  describe('pruning', () => {
    test('pruneOlderThan removes old events', () => {
      const e = new EpisodicMemory();
      e.record('a', 'old', undefined, { timestamp: Date.now() - 1000 });
      const cutoff = Date.now();
      e.record('a', 'new', undefined, { timestamp: Date.now() + 1 });
      const removed = e.pruneOlderThan(cutoff);
      expect(removed).toBe(1);
      expect(e.count()).toBe(1);
    });

    test('pruneLowImportance only prunes when over maxCount', () => {
      const e = new EpisodicMemory(2);
      e.record('a', 'trivial', undefined, { importance: 0.1 });
      e.record('a', 'important', undefined, { importance: 0.9 });
      e.record('a', 'extra', undefined, { importance: 0.1 });
      const removed = e.pruneLowImportance(0.5);
      expect(removed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validation', () => {
    test('throws on missing agent', () => {
      const e = new EpisodicMemory();
      expect(() => e.record('', 'event')).toThrow();
    });
  });
});
