/**
 * @manya-os/supabase — retry utility unit tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { withRetry, backoffDelay } from '../../src/retry.js';
import { ConnectionError, SupabaseError } from '../../src/errors.js';
import { SilentLogger } from '../../src/logging.js';
import type { RetryConfig } from '../../src/config.js';

const logger = new SilentLogger();

const baseConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 10,
  maxDelayMs: 1000,
};

describe('backoffDelay', () => {
  it('computes exponential backoff', () => {
    expect(backoffDelay(baseConfig, 0)).toBe(10);
    expect(backoffDelay(baseConfig, 1)).toBe(20);
    expect(backoffDelay(baseConfig, 2)).toBe(40);
  });

  it('caps at maxDelayMs', () => {
    const config = { ...baseConfig, maxDelayMs: 50 };
    expect(backoffDelay(config, 0)).toBe(10);
    expect(backoffDelay(config, 1)).toBe(20);
    expect(backoffDelay(config, 2)).toBe(40);
    expect(backoffDelay(config, 10)).toBe(50);
  });
});

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, baseConfig, logger, 'test');
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable error and eventually succeeds', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new ConnectionError('fail 1'))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, baseConfig, logger, 'test');
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries up to maxAttempts then throws', async () => {
    const fn = jest.fn().mockRejectedValue(new ConnectionError('fail'));
    await expect(withRetry(fn, baseConfig, logger, 'test')).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-retryable errors', async () => {
    const fn = jest.fn().mockRejectedValue(new SupabaseError('non-retryable'));
    await expect(withRetry(fn, baseConfig, logger, 'test')).rejects.toThrow('non-retryable');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns the last error when all attempts fail', async () => {
    const error = new ConnectionError('final');
    const fn = jest.fn().mockRejectedValue(error);
    try {
      await withRetry(fn, baseConfig, logger, 'test');
      fail('should have thrown');
    } catch (err) {
      expect(err).toBe(error);
    }
  });

  it('handles single attempt config', async () => {
    const fn = jest.fn().mockRejectedValue(new ConnectionError('fail'));
    await expect(withRetry(fn, { ...baseConfig, maxAttempts: 1 }, logger, 'test')).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('succeeds on final attempt after retries', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new ConnectionError('fail 1'))
      .mockRejectedValueOnce(new ConnectionError('fail 2'))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, baseConfig, logger, 'test');
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('handles string errors', async () => {
    const fn = jest.fn().mockRejectedValue('string error');
    await expect(withRetry(fn, baseConfig, logger, 'test')).rejects.toBe('string error');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
