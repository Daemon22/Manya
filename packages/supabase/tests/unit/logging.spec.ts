/**
 * @manya-os/supabase — logging unit tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { ConsoleLogger, SilentLogger, createLogger } from '../../src/logging.js';

describe('ConsoleLogger', () => {
  it('creates with default info level', () => {
    const logger = new ConsoleLogger();
    expect(logger).toBeDefined();
  });

  it('creates with specified level', () => {
    expect(new ConsoleLogger('debug')).toBeDefined();
    expect(new ConsoleLogger('warn')).toBeDefined();
    expect(new ConsoleLogger('error')).toBeDefined();
    expect(new ConsoleLogger('silent')).toBeDefined();
  });

  it('has debug/info/warn/error methods', () => {
    const logger = new ConsoleLogger('debug');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('does not throw when logging', () => {
    const logger = new ConsoleLogger('debug');
    expect(() => logger.debug('test')).not.toThrow();
    expect(() => logger.info('test')).not.toThrow();
    expect(() => logger.warn('test')).not.toThrow();
    expect(() => logger.error('test')).not.toThrow();
  });

  it('does not throw when logging with metadata', () => {
    const logger = new ConsoleLogger('debug');
    expect(() => logger.debug('test', { key: 'value' })).not.toThrow();
    expect(() => logger.info('test', { nested: { a: 1 } })).not.toThrow();
  });

  it('redacts sensitive metadata keys', () => {
    const logger = new ConsoleLogger('debug');
    const meta = { serviceRoleKey: 'secret', url: 'https://test.co', password: 'pass123' };
    expect(() => logger.info('test', meta)).not.toThrow();
  });
});

describe('SilentLogger', () => {
  const logger = new SilentLogger();

  it('has all log methods', () => {
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('does not throw on any log call', () => {
    expect(() => logger.debug('msg')).not.toThrow();
    expect(() => logger.info('msg')).not.toThrow();
    expect(() => logger.warn('msg')).not.toThrow();
    expect(() => logger.error('msg')).not.toThrow();
    expect(() => logger.debug('msg', { key: 'val' })).not.toThrow();
  });
});

describe('createLogger', () => {
  it('returns provided logger if given', () => {
    const custom = new SilentLogger();
    expect(createLogger(undefined, custom)).toBe(custom);
  });

  it('returns SilentLogger for silent level', () => {
    const logger = createLogger('silent');
    expect(logger).toBeInstanceOf(SilentLogger);
  });

  it('returns ConsoleLogger for info level', () => {
    const logger = createLogger('info');
    expect(logger).toBeInstanceOf(ConsoleLogger);
  });

  it('returns ConsoleLogger for debug level', () => {
    const logger = createLogger('debug');
    expect(logger).toBeInstanceOf(ConsoleLogger);
  });

  it('defaults to info when no level provided', () => {
    const logger = createLogger();
    expect(logger).toBeInstanceOf(ConsoleLogger);
  });
});
