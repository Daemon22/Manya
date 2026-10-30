import { SemanticMemory } from '@manya-os/memory';

describe('SemanticMemory', () => {
  describe('learn and recall', () => {
    test('learn and recall', () => {
      const s = new SemanticMemory();
      s.learn('alice', 'age', 30);
      expect(s.recall('alice', 'age')?.value).toBe(30);
    });

    test('recall returns null for unknown fact', () => {
      const s = new SemanticMemory();
      expect(s.recall('alice', 'unknown')).toBeNull();
    });

    test('recallEntity returns all attributes', () => {
      const s = new SemanticMemory();
      s.learn('alice', 'age', 30);
      s.learn('alice', 'role', 'admin');
      expect(s.recallEntity('alice')).toHaveLength(2);
    });

    test('recallEntity returns empty for unknown entity', () => {
      const s = new SemanticMemory();
      expect(s.recallEntity('unknown')).toHaveLength(0);
    });
  });

  describe('findByAttribute', () => {
    test('findByAttribute with valueMatch', () => {
      const s = new SemanticMemory();
      s.learn('alice', 'role', 'admin');
      s.learn('bob', 'role', 'user');
      expect(s.findByAttribute('role', 'admin')).toHaveLength(1);
    });

    test('findByAttribute returns all when no match', () => {
      const s = new SemanticMemory();
      s.learn('alice', 'role', 'admin');
      expect(s.findByAttribute('role', 'superadmin')).toHaveLength(0);
    });
  });

  describe('forget', () => {
    test('forget removes fact', () => {
      const s = new SemanticMemory();
      s.learn('alice', 'age', 30);
      expect(s.forget('alice', 'age')).toBe(true);
      expect(s.recall('alice', 'age')).toBeNull();
    });

    test('forget returns false for unknown fact', () => {
      const s = new SemanticMemory();
      expect(s.forget('alice', 'unknown')).toBe(false);
    });
  });

  describe('updateConfidence', () => {
    test('updateConfidence', () => {
      const s = new SemanticMemory();
      s.learn('alice', 'age', 30, 0.5);
      s.updateConfidence('alice', 'age', 0.9);
      expect(s.recall('alice', 'age')?.confidence).toBe(0.9);
    });
  });

  describe('all and count', () => {
    test('all returns all facts', () => {
      const s = new SemanticMemory();
      s.learn('a', 'x', 1);
      s.learn('b', 'y', 2);
      expect(s.all()).toHaveLength(2);
    });

    test('count returns correct count', () => {
      const s = new SemanticMemory();
      expect(s.count()).toBe(0);
      s.learn('a', 'x', 1);
      expect(s.count()).toBe(1);
    });
  });

  describe('validation', () => {
    test('throws on invalid confidence', () => {
      const s = new SemanticMemory();
      expect(() => s.learn('a', 'b', 'c', 1.5)).toThrow();
    });

    test('accepts confidence in valid range', () => {
      const s = new SemanticMemory();
      expect(() => s.learn('a', 'b', 'c', 0)).not.toThrow();
      expect(() => s.learn('a', 'b', 'c', 1)).not.toThrow();
    });
  });
});
