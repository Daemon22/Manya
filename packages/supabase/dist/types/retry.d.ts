/**
 * @manya-os/supabase — retry utility for transient Supabase errors.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { RetryConfig } from './config.js';
import type { Logger } from './logging.js';
/**
 * Compute the delay in milliseconds for a given retry attempt using the
 * configured backoff strategy. Always uses exponential backoff.
 */
export declare function backoffDelay(config: RetryConfig, attempt: number): number;
/**
 * Execute an async operation with retry logic for transient Supabase errors.
 *
 * Retries when `isRetryable(err)` returns true, up to `config.maxAttempts`.
 * Non-retryable errors propagate immediately.
 *
 * @param fn - The async operation to execute.
 * @param config - Retry configuration.
 * @param logger - Logger for retry attempt information.
 * @param label - Human-readable label for log messages.
 * @returns The result of `fn` on success.
 * @throws The last error if all retry attempts are exhausted or a non-retryable error occurs.
 */
export declare function withRetry<T>(fn: () => Promise<T>, config: RetryConfig, logger: Logger, label: string): Promise<T>;
//# sourceMappingURL=retry.d.ts.map