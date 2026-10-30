/**
 * @manya-os/cortex — structured logging tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import {
  ConsoleLogger,
  SilentLogger,
  scrubMetadata,
  shouldScrubField,
  SCRUBBED_FIELD_NAMES,
} from '../src';

describe('shouldScrubField', () => {
  test('returns true for exact match', () => {
    expect(shouldScrubField('secret')).toBe(true);
    expect(shouldScrubField('token')).toBe(true);
    expect(shouldScrubField('apiKey')).toBe(true);
    expect(shouldScrubField('password')).toBe(true);
    expect(shouldScrubField('privateKey')).toBe(true);
  });

  test('returns true for suffixed match', () => {
    expect(shouldScrubField('user_secret')).toBe(true);
    expect(shouldScrubField('api_token')).toBe(true);
    expect(shouldScrubField('my_password')).toBe(true);
  });

  test('returns false for non-matching fields', () => {
    expect(shouldScrubField('name')).toBe(false);
    expect(shouldScrubField('data')).toBe(false);
    expect(shouldScrubField('secretvalue')).toBe(false);
  });

  test('is case-insensitive', () => {
    expect(shouldScrubField('SECRET')).toBe(true);
    expect(shouldScrubField('Secret')).toBe(true);
    expect(shouldScrubField('TOKEN')).toBe(true);
  });
});

describe('SCRUBBED_FIELD_NAMES', () => {
  test('contains expected field names', () => {
    expect(SCRUBBED_FIELD_NAMES).toContain('secret');
    expect(SCRUBBED_FIELD_NAMES).toContain('token');
    expect(SCRUBBED_FIELD_NAMES).toContain('apiKey');
    expect(SCRUBBED_FIELD_NAMES).toContain('password');
    expect(SCRUBBED_FIELD_NAMES).toContain('privateKey');
  });
});

describe('scrubMetadata', () => {
  test('returns null/undefined as-is', () => {
    expect(scrubMetadata(null)).toBe(null);
    expect(scrubMetadata(undefined)).toBe(undefined);
  });

  test('returns primitives as-is', () => {
    expect(scrubMetadata('hello')).toBe('hello');
    expect(scrubMetadata(42)).toBe(42);
    expect(scrubMetadata(true)).toBe(true);
  });

  test('scrubs sensitive keys', () => {
    const result = scrubMetadata({ name: 'Alice', secret: 'xyz', token: 'abc' }) as Record<string, unknown>;
    expect(result.name).toBe('Alice');
    expect(result.secret).toBe('[redacted]');
    expect(result.token).toBe('[redacted]');
  });

  test('recursively scrubs nested objects', () => {
    const result = scrubMetadata({ a: { b: { password: 'pw' } } }) as Record<string, unknown>;
    const a = result.a as Record<string, unknown>;
    const b = a.b as Record<string, unknown>;
    expect(b.password).toBe('[redacted]');
  });

  test('scrubs arrays', () => {
    const result = scrubMetadata([{ secret: 'a' }, { name: 'b' }]) as Array<Record<string, unknown>>;
    expect(result[0].secret).toBe('[redacted]');
    expect(result[1].name).toBe('b');
  });

  test('converts Buffer to string', () => {
    const buf = Buffer.from('hello');
    const result = scrubMetadata(buf) as string;
    expect(result).toBe('[buffer:5]');
  });

  test('converts Date to ISO string', () => {
    const d = new Date('2024-01-01T00:00:00.000Z');
    const result = scrubMetadata(d) as string;
    expect(result).toBe('2024-01-01T00:00:00.000Z');
  });
});

describe('SilentLogger', () => {
  test('does not throw on any method', () => {
    const logger = new SilentLogger();
    expect(() => logger.debug('msg')).not.toThrow();
    expect(() => logger.info('msg')).not.toThrow();
    expect(() => logger.warn('msg')).not.toThrow();
    expect(() => logger.error('msg')).not.toThrow();
  });
});

describe('ConsoleLogger', () => {
  test('does not throw when logging at or above level', () => {
    const logger = new ConsoleLogger('silent');
    expect(() => logger.debug('msg')).not.toThrow();
    expect(() => logger.info('msg')).not.toThrow();
    expect(() => logger.warn('msg')).not.toThrow();
    expect(() => logger.error('msg')).not.toThrow();
  });

  test('does not throw with metadata', () => {
    const logger = new ConsoleLogger('silent');
    expect(() => logger.info('msg', { key: 'value' })).not.toThrow();
  });

  test('does not throw with sensitive metadata', () => {
    const logger = new ConsoleLogger('silent');
    expect(() => logger.info('msg', { secret: 'xyz', name: 'test' })).not.toThrow();
  });
});
