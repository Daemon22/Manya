import { compress, decompress, ratio } from '@manya-os/memory';
import type { CompressedPayload } from '@manya-os/memory';

describe('compress', () => {
  test('compress and decompress round-trip', () => {
    const payload = { name: 'alice', data: [1, 2, 3], nested: { x: 'y' } };
    const c = compress(payload);
    expect(c.algorithm).toBe('gzip+json');
    const d = decompress(c);
    expect(d).toEqual(payload);
  });

  test('round-trip preserves primitive values', () => {
    expect(decompress(compress('hello'))).toBe('hello');
    expect(decompress(compress(42))).toBe(42);
    expect(decompress(compress(true))).toBe(true);
    expect(decompress(compress(null))).toBeNull();
  });

  test('round-trip preserves arrays', () => {
    const arr = [1, 'two', { three: 3 }];
    expect(decompress(compress(arr))).toEqual(arr);
  });

  test('ratio is in (0,1) for compressible input', () => {
    const c = compress('hello world '.repeat(500));
    const r = ratio(c);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(1);
  });

  test('ratio is 1 for incompressible small input', () => {
    const c = compress(42);
    const r = ratio(c);
    expect(r).toBeGreaterThanOrEqual(1);
  });

  test('decompress throws on bad algorithm', () => {
    expect(() => decompress({ algorithm: 'lz4' as any, data: '', originalLength: 0, compressedLength: 0 })).toThrow();
  });

  test('compressed data is a string', () => {
    const c = compress({ test: true });
    expect(typeof c.data).toBe('string');
  });

  test('originalLength and compressedLength are non-negative', () => {
    const c = compress('test data');
    expect(c.originalLength).toBeGreaterThanOrEqual(0);
    expect(c.compressedLength).toBeGreaterThanOrEqual(0);
  });
});
