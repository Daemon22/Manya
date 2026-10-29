/**
 * @manya-os/cortex — retry policy executor.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { RetryPolicy } from '../types.js';
import { RetryError } from '../errors.js';

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoff: 'exponential',
  baseDelayMs: 100,
  maxDelayMs: 5_000,
  retryableErrors: ['timeout', 'transient', 'busy', 'unavailable'],
};

/** Compute the delay before the next attempt. */
export function backoffDelay(policy: RetryPolicy, attempt: number): number {
  const n = Math.max(1, attempt);
  let delay: number;
  if (policy.backoff === 'fixed') {
    delay = policy.baseDelayMs;
  } else if (policy.backoff === 'linear') {
    delay = policy.baseDelayMs * n;
  } else {
    delay = policy.baseDelayMs * Math.pow(2, n - 1);
  }
  return Math.min(delay, policy.maxDelayMs);
}

/** Determine whether an error is retryable per policy. */
export function isRetryable(policy: RetryPolicy, errorMessage: string): boolean {
  if (!policy.retryableErrors || policy.retryableErrors.length === 0) return true;
  const lower = errorMessage.toLowerCase();
  return policy.retryableErrors.some(s => lower.includes(s.toLowerCase()));
}

/** Execute a function with retry policy. */
export async function withRetry<T>(fn: () => Promise<T>, policy: RetryPolicy = DEFAULT_RETRY_POLICY): Promise<T> {
  if (!fn || typeof fn !== 'function') throw new RetryError('fn must be a function');
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt >= policy.maxAttempts) break;
      if (!isRetryable(policy, lastError.message)) break;
      const delay = backoffDelay(policy, attempt);
      await sleep(delay);
    }
  }
  throw new RetryError(`all ${policy.maxAttempts} attempts failed: ${lastError?.message ?? 'unknown error'}`, lastError);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
