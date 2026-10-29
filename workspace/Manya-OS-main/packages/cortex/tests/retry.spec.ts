/**
 * @manya-os/cortex — retry policy executor tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { withRetry, backoffDelay, isRetryable, DEFAULT_RETRY_POLICY, RetryError } from '../src';

describe('withRetry', () => {
  test('succeeds on first try', async () => {
    let n = 0;
    const result = await withRetry(async () => { n++; return 'ok'; }, { ...DEFAULT_RETRY_POLICY, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(n).toBe(1);
  });

  test('retries on retryable error', async () => {
    let n = 0;
    const fn = async () => {
      n++;
      if (n < 3) throw new Error('transient failure');
      return 'ok';
    };
    const result = await withRetry(fn, { ...DEFAULT_RETRY_POLICY, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(n).toBe(3);
  });

  test('fails after max attempts', async () => {
    const fn = async () => { throw new Error('transient failure'); };
    await expect(withRetry(fn, { ...DEFAULT_RETRY_POLICY, maxAttempts: 2, baseDelayMs: 1 })).rejects.toThrow(RetryError);
  });

  test('does not retry non-retryable errors', async () => {
    let n = 0;
    const fn = async () => { n++; throw new Error('permanent failure'); };
    await expect(withRetry(fn, { ...DEFAULT_RETRY_POLICY, retryableErrors: ['transient'], baseDelayMs: 1 })).rejects.toThrow();
    expect(n).toBe(1);
  });

  test('throws on non-function argument', async () => {
    await expect(withRetry(null as any)).rejects.toThrow(RetryError);
  });

  test('retries with empty retryableErrors (all errors retryable)', async () => {
    let n = 0;
    const fn = async () => {
      n++;
      if (n < 2) throw new Error('any error');
      return 'ok';
    };
    const result = await withRetry(fn, { ...DEFAULT_RETRY_POLICY, retryableErrors: [], baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(n).toBe(2);
  });

  test('retries with undefined retryableErrors (all errors retryable)', async () => {
    let n = 0;
    const fn = async () => {
      n++;
      if (n < 2) throw new Error('any error');
      return 'ok';
    };
    const result = await withRetry(fn, { ...DEFAULT_RETRY_POLICY, retryableErrors: undefined, baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(n).toBe(2);
  });

  test('error message includes attempt count', async () => {
    const fn = async () => { throw new Error('fail'); };
    try {
      await withRetry(fn, { ...DEFAULT_RETRY_POLICY, maxAttempts: 3, baseDelayMs: 1 });
      fail('should have thrown');
    } catch (e) {
      expect((e as Error).message).toContain('3');
    }
  });

  test('preserves original error as cause', async () => {
    const fn = async () => { throw new Error('root cause'); };
    try {
      await withRetry(fn, { ...DEFAULT_RETRY_POLICY, maxAttempts: 1, baseDelayMs: 1 });
      fail('should have thrown');
    } catch (e) {
      expect((e as RetryError).cause).toBeDefined();
      expect((e as RetryError).cause).toBeInstanceOf(Error);
    }
  });
});

describe('backoffDelay', () => {
  test('fixed', () => {
    const p = { maxAttempts: 3, backoff: 'fixed' as const, baseDelayMs: 100, maxDelayMs: 1000 };
    expect(backoffDelay(p, 1)).toBe(100);
    expect(backoffDelay(p, 3)).toBe(100);
  });

  test('linear', () => {
    const p = { maxAttempts: 3, backoff: 'linear' as const, baseDelayMs: 100, maxDelayMs: 1000 };
    expect(backoffDelay(p, 1)).toBe(100);
    expect(backoffDelay(p, 3)).toBe(300);
  });

  test('exponential', () => {
    const p = { maxAttempts: 5, backoff: 'exponential' as const, baseDelayMs: 100, maxDelayMs: 10000 };
    expect(backoffDelay(p, 1)).toBe(100);
    expect(backoffDelay(p, 3)).toBe(400);
  });

  test('caps at maxDelayMs', () => {
    const p = { maxAttempts: 10, backoff: 'exponential' as const, baseDelayMs: 100, maxDelayMs: 1000 };
    expect(backoffDelay(p, 20)).toBe(1000);
  });

  test('handles attempt 0 by treating as 1', () => {
    const p = { maxAttempts: 3, backoff: 'linear' as const, baseDelayMs: 100, maxDelayMs: 1000 };
    expect(backoffDelay(p, 0)).toBe(100);
  });
});

describe('isRetryable', () => {
  test('matches substring', () => {
    const p = { ...DEFAULT_RETRY_POLICY, retryableErrors: ['timeout'] };
    expect(isRetryable(p, 'connection timeout')).toBe(true);
    expect(isRetryable(p, 'permanent error')).toBe(false);
  });

  test('returns true when retryableErrors is empty', () => {
    const p = { ...DEFAULT_RETRY_POLICY, retryableErrors: [] };
    expect(isRetryable(p, 'any error')).toBe(true);
  });

  test('returns true when retryableErrors is undefined', () => {
    const p = { ...DEFAULT_RETRY_POLICY, retryableErrors: undefined };
    expect(isRetryable(p, 'any error')).toBe(true);
  });

  test('matches case-insensitively', () => {
    const p = { ...DEFAULT_RETRY_POLICY, retryableErrors: ['TIMEOUT'] };
    expect(isRetryable(p, 'connection timeout')).toBe(true);
  });

  test('matches multiple patterns', () => {
    const p = { ...DEFAULT_RETRY_POLICY, retryableErrors: ['timeout', 'busy'] };
    expect(isRetryable(p, 'connection timeout')).toBe(true);
    expect(isRetryable(p, 'system busy')).toBe(true);
    expect(isRetryable(p, 'other error')).toBe(false);
  });
});

describe('DEFAULT_RETRY_POLICY', () => {
  test('has maxAttempts 3', () => {
    expect(DEFAULT_RETRY_POLICY.maxAttempts).toBe(3);
  });

  test('has exponential backoff', () => {
    expect(DEFAULT_RETRY_POLICY.backoff).toBe('exponential');
  });

  test('has retryable errors', () => {
    expect(DEFAULT_RETRY_POLICY.retryableErrors).toContain('timeout');
    expect(DEFAULT_RETRY_POLICY.retryableErrors).toContain('transient');
  });

  test('has baseDelayMs and maxDelayMs', () => {
    expect(DEFAULT_RETRY_POLICY.baseDelayMs).toBe(100);
    expect(DEFAULT_RETRY_POLICY.maxDelayMs).toBe(5000);
  });
});
