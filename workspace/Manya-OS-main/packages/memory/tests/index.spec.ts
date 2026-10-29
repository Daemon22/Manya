import { InvertedIndex } from '@manya-os/memory';

describe('InvertedIndex', () => {
  describe('tokenize', () => {
    test('tokenizes text into lowercase tokens', () => {
      expect(InvertedIndex.tokenize('Hello, World!')).toEqual(['hello', 'world']);
    });

    test('returns empty array for empty string', () => {
      expect(InvertedIndex.tokenize('')).toEqual([]);
    });

    test('filters single-character tokens', () => {
      expect(InvertedIndex.tokenize('a b c')).toEqual([]);
    });

    test('handles multiple spaces', () => {
      expect(InvertedIndex.tokenize('hello   world')).toEqual(['hello', 'world']);
    });
  });

  describe('add and search', () => {
    test('add and search', () => {
      const idx = new InvertedIndex();
      idx.add('1', 'the quick brown fox');
      idx.add('2', 'the lazy dog');
      const r = idx.search('fox');
      expect(r.length).toBe(1);
      expect(r[0].recordId).toBe('1');
    });

    test('search ranks by TF-IDF', () => {
      const idx = new InvertedIndex();
      idx.add('1', 'apple apple apple');
      idx.add('2', 'apple');
      const r = idx.search('apple');
      expect(r[0].recordId).toBe('1');
    });

    test('search returns empty for non-matching query', () => {
      const idx = new InvertedIndex();
      idx.add('1', 'hello world');
      expect(idx.search('xyz')).toHaveLength(0);
    });

    test('search handles multi-word queries', () => {
      const idx = new InvertedIndex();
      idx.add('1', 'quick brown fox');
      idx.add('2', 'lazy brown dog');
      const r = idx.search('brown fox');
      expect(r.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('remove', () => {
    test('remove', () => {
      const idx = new InvertedIndex();
      idx.add('1', 'apple');
      idx.remove('1');
      expect(idx.search('apple')).toHaveLength(0);
    });

    test('remove non-existent record does not throw', () => {
      const idx = new InvertedIndex();
      expect(() => idx.remove('nonexistent')).not.toThrow();
    });
  });

  describe('lookup', () => {
    test('lookup returns index entry with record ids', () => {
      const idx = new InvertedIndex();
      idx.add('1', 'hello world');
      idx.add('2', 'hello there');
      const entry = idx.lookup('hello');
      expect(entry).toBeDefined();
      expect(entry!.recordIds).toContain('1');
      expect(entry!.recordIds).toContain('2');
    });

    test('lookup returns undefined for unknown token', () => {
      const idx = new InvertedIndex();
      expect(idx.lookup('unknown')).toBeUndefined();
    });
  });

  describe('size and entries', () => {
    test('size tracks record count', () => {
      const idx = new InvertedIndex();
      expect(idx.size()).toBe(0);
      idx.add('1', 'hello');
      expect(idx.size()).toBe(1);
      idx.add('2', 'world');
      expect(idx.size()).toBe(2);
    });

    test('entries returns all index entries', () => {
      const idx = new InvertedIndex();
      idx.add('1', 'hello world');
      const entries = idx.entries();
      expect(entries.length).toBeGreaterThan(0);
    });
  });
});
