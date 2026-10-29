import { WorkingMemory, WorkingMemoryError } from '@manya-os/memory';

describe('WorkingMemory', () => {
  describe('basic operations', () => {
    test('set and get', () => {
      const w = new WorkingMemory();
      w.set('key1', 'value1');
      expect(w.get('key1')).toBe('value1');
    });

    test('returns null for missing key', () => {
      const w = new WorkingMemory();
      expect(w.get('missing')).toBeNull();
    });

    test('has returns true for existing key', () => {
      const w = new WorkingMemory();
      w.set('k', 'v');
      expect(w.has('k')).toBe(true);
    });

    test('has returns false for missing key', () => {
      const w = new WorkingMemory();
      expect(w.has('missing')).toBe(false);
    });

    test('delete removes entry', () => {
      const w = new WorkingMemory();
      w.set('k', 'v');
      expect(w.delete('k')).toBe(true);
      expect(w.has('k')).toBe(false);
    });

    test('delete returns false for missing key', () => {
      const w = new WorkingMemory();
      expect(w.delete('missing')).toBe(false);
    });

    test('clear removes all entries', () => {
      const w = new WorkingMemory();
      w.set('k1', 'v1');
      w.set('k2', 'v2');
      w.clear();
      expect(w.size()).toBe(0);
    });

    test('size tracks entry count', () => {
      const w = new WorkingMemory();
      expect(w.size()).toBe(0);
      w.set('a', '1');
      expect(w.size()).toBe(1);
      w.set('b', '2');
      expect(w.size()).toBe(2);
    });
  });

  describe('getEntry', () => {
    test('returns full entry', () => {
      const w = new WorkingMemory();
      w.set('k', 'v', 60_000, ['tag1']);
      const entry = w.getEntry('k');
      expect(entry).not.toBeNull();
      expect(entry!.key).toBe('k');
      expect(entry!.value).toBe('v');
      expect(entry!.tags).toEqual(['tag1']);
    });

    test('returns null for missing key', () => {
      const w = new WorkingMemory();
      expect(w.getEntry('missing')).toBeNull();
    });
  });

  describe('entries', () => {
    test('returns all entries', () => {
      const w = new WorkingMemory();
      w.set('a', '1');
      w.set('b', '2');
      const all = w.entries();
      expect(all).toHaveLength(2);
    });
  });

  describe('TTL and expiration', () => {
    test('TTL expiration', (done) => {
      const w = new WorkingMemory();
      w.set('temp', 'value', 50);
      expect(w.get('temp')).toBe('value');
      setTimeout(() => {
        expect(w.get('temp')).toBeNull();
        done();
      }, 100);
    });

    test('sweep removes expired entries', () => {
      const w = new WorkingMemory();
      w.set('expired', 'v', -1);
      expect(w.sweep()).toBe(1);
      expect(w.size()).toBe(0);
    });

    test('sweep returns 0 when nothing expired', () => {
      const w = new WorkingMemory();
      w.set('live', 'v', 60_000);
      expect(w.sweep()).toBe(0);
    });
  });

  describe('findByTag', () => {
    test('finds entries by tag', () => {
      const w = new WorkingMemory();
      w.set('k1', 'v1', undefined, ['red', 'blue']);
      w.set('k2', 'v2', undefined, ['blue']);
      expect(w.findByTag('blue')).toHaveLength(2);
      expect(w.findByTag('red')).toHaveLength(1);
    });

    test('returns empty for non-matching tag', () => {
      const w = new WorkingMemory();
      w.set('k1', 'v1', undefined, ['red']);
      expect(w.findByTag('green')).toHaveLength(0);
    });
  });

  describe('validation', () => {
    test('throws on empty key', () => {
      const w = new WorkingMemory();
      expect(() => w.set('', 'v')).toThrow(WorkingMemoryError);
    });
  });

  describe('dispose', () => {
    test('dispose stops sweeper without throwing', () => {
      const w = new WorkingMemory();
      expect(() => w.dispose()).not.toThrow();
    });
  });
});
