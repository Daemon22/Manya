/**
 * @manya-os/cortex — retry policy executor.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { RetryPolicy } from '../types.js';
export declare const DEFAULT_RETRY_POLICY: RetryPolicy;
/** Compute the delay before the next attempt. */
export declare function backoffDelay(policy: RetryPolicy, attempt: number): number;
/** Determine whether an error is retryable per policy. */
export declare function isRetryable(policy: RetryPolicy, errorMessage: string): boolean;
/** Execute a function with retry policy. */
export declare function withRetry<T>(fn: () => Promise<T>, policy?: RetryPolicy): Promise<T>;
//# sourceMappingURL=retry.d.ts.map