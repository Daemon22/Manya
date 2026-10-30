import { ProceduralMemory } from '@manya-os/memory';

describe('ProceduralMemory', () => {
  describe('learn and execute', () => {
    test('learn and execute', () => {
      const p = new ProceduralMemory();
      p.learn('add', (a: unknown, b: unknown) => (a as number) + (b as number));
      expect(p.execute('add', 2, 3)).toBe(5);
    });

    test('throws on missing skill', () => {
      const p = new ProceduralMemory();
      expect(() => p.execute('missing')).toThrow();
    });
  });

  describe('get', () => {
    test('returns skill by name', () => {
      const p = new ProceduralMemory();
      const fn = () => 42;
      p.learn('answer', fn);
      const skill = p.get('answer');
      expect(skill).not.toBeNull();
      expect(skill!.name).toBe('answer');
    });

    test('returns undefined for unknown skill', () => {
      const p = new ProceduralMemory();
      expect(p.get('missing')).toBeUndefined();
    });
  });

  describe('validation', () => {
    test('throws on duplicate name', () => {
      const p = new ProceduralMemory();
      p.learn('add', () => 0);
      expect(() => p.learn('add', () => 0)).toThrow();
    });
  });

  describe('list and count', () => {
    test('list returns all skill names', () => {
      const p = new ProceduralMemory();
      p.learn('a', () => 0);
      p.learn('b', () => 0);
      expect(p.list()).toEqual(['a', 'b']);
    });

    test('count returns correct count', () => {
      const p = new ProceduralMemory();
      expect(p.count()).toBe(0);
      p.learn('a', () => 0);
      expect(p.count()).toBe(1);
    });
  });

  describe('forget', () => {
    test('forget removes skill', () => {
      const p = new ProceduralMemory();
      p.learn('a', () => 0);
      expect(p.forget('a')).toBe(true);
      expect(p.count()).toBe(0);
    });

    test('forget returns false for unknown skill', () => {
      const p = new ProceduralMemory();
      expect(p.forget('missing')).toBe(false);
    });
  });

  describe('findByTag', () => {
    test('finds skills by tag', () => {
      const p = new ProceduralMemory();
      p.learn('a', () => 0, { tags: ['math'] });
      p.learn('b', () => 0, { tags: ['string'] });
      expect(p.findByTag('math')).toHaveLength(1);
    });

    test('returns empty for non-matching tag', () => {
      const p = new ProceduralMemory();
      p.learn('a', () => 0, { tags: ['math'] });
      expect(p.findByTag('physics')).toHaveLength(0);
    });
  });
});
