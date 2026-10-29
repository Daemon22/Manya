import { randomId } from '@manya-os/memory';

describe('randomId', () => {
  test('generates unique ids with prefix', () => {
    const id1 = randomId('test');
    const id2 = randomId('test');
    expect(id1).not.toBe(id2);
    expect(id1.startsWith('test_')).toBe(true);
    expect(id2.startsWith('test_')).toBe(true);
  });

  test('uses default prefix when omitted', () => {
    const id = randomId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  test('generates hex characters after prefix', () => {
    const id = randomId('mem');
    const hexPart = id.replace('mem_', '');
    expect(/^[0-9a-f]+$/.test(hexPart)).toBe(true);
  });

  test('different prefixes produce different ids', () => {
    const id1 = randomId('a');
    const id2 = randomId('b');
    expect(id1.startsWith('a_')).toBe(true);
    expect(id2.startsWith('b_')).toBe(true);
  });
});
