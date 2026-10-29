import {
  ConsoleLogger,
  SilentLogger,
  shouldScrubField,
  scrubMetadata,
  SCRUBBED_FIELD_NAMES,
} from '@manya-os/memory';

describe('shouldScrubField', () => {
  test('matches exact field names case-insensitively', () => {
    expect(shouldScrubField('secret')).toBe(true);
    expect(shouldScrubField('SECRET')).toBe(true);
    expect(shouldScrubField('token')).toBe(true);
    expect(shouldScrubField('apiKey')).toBe(true);
    expect(shouldScrubField('password')).toBe(true);
    expect(shouldScrubField('privateKey')).toBe(true);
  });

  test('matches suffixed field names', () => {
    expect(shouldScrubField('user_secret')).toBe(true);
    expect(shouldScrubField('auth_token')).toBe(true);
    expect(shouldScrubField('my_apiKey')).toBe(true);
    expect(shouldScrubField('my_password')).toBe(true);
    expect(shouldScrubField('my_privateKey')).toBe(true);
  });

  test('rejects non-sensitive fields', () => {
    expect(shouldScrubField('name')).toBe(false);
    expect(shouldScrubField('email')).toBe(false);
    expect(shouldScrubField('public_key')).toBe(false);
    expect(shouldScrubField('')).toBe(false);
  });
});

describe('SCRUBBED_FIELD_NAMES', () => {
  test('contains the expected five entries', () => {
    expect(SCRUBBED_FIELD_NAMES).toEqual([
      'secret', 'token', 'apiKey', 'password', 'privateKey',
    ]);
  });
});

describe('scrubMetadata', () => {
  test('returns primitives as-is', () => {
    expect(scrubMetadata(null)).toBeNull();
    expect(scrubMetadata(undefined)).toBeUndefined();
    expect(scrubMetadata(42)).toBe(42);
    expect(scrubMetadata('hello')).toBe('hello');
  });

  test('scrubs sensitive keys in objects', () => {
    const result = scrubMetadata({ secret: 'abc', name: 'alice' }) as Record<string, unknown>;
    expect(result.secret).toBe('[redacted]');
    expect(result.name).toBe('alice');
  });

  test('recursively scrubs nested objects', () => {
    const result = scrubMetadata({ a: { b: { token: 'xyz' } } }) as Record<string, unknown>;
    const nested = result.a as Record<string, unknown>;
    const inner = nested.b as Record<string, unknown>;
    expect(inner.token).toBe('[redacted]');
  });

  test('scrubs arrays recursively', () => {
    const result = scrubMetadata([{ secret: 'a' }, { name: 'b' }]) as Array<Record<string, unknown>>;
    expect(result[0]!.secret).toBe('[redacted]');
    expect(result[1]!.name).toBe('b');
  });

  test('converts Buffer to string', () => {
    const buf = Buffer.from('hello');
    const result = scrubMetadata(buf);
    expect(result).toBe('[buffer:5]');
  });

  test('converts Date to ISO string', () => {
    const d = new Date('2024-01-15T00:00:00.000Z');
    const result = scrubMetadata(d);
    expect(result).toBe('2024-01-15T00:00:00.000Z');
  });
});

describe('ConsoleLogger', () => {
  test('does not throw on any log level', () => {
    const logger = new ConsoleLogger('silent');
    expect(() => logger.debug('msg')).not.toThrow();
    expect(() => logger.info('msg')).not.toThrow();
    expect(() => logger.warn('msg')).not.toThrow();
    expect(() => logger.error('msg')).not.toThrow();
  });

  test('scrubs metadata in log output', () => {
    const logger = new ConsoleLogger('silent');
    expect(() => logger.info('test', { secret: 'abc' })).not.toThrow();
  });
});

describe('SilentLogger', () => {
  test('all methods are no-ops', () => {
    const logger = new SilentLogger();
    expect(() => logger.debug('msg')).not.toThrow();
    expect(() => logger.info('msg')).not.toThrow();
    expect(() => logger.warn('msg')).not.toThrow();
    expect(() => logger.error('msg')).not.toThrow();
  });
});
