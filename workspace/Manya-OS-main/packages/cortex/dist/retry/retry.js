"use strict";
/**
 * @manya-os/cortex — retry policy executor.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_RETRY_POLICY = void 0;
exports.backoffDelay = backoffDelay;
exports.isRetryable = isRetryable;
exports.withRetry = withRetry;
const errors_js_1 = require("../errors.js");
exports.DEFAULT_RETRY_POLICY = {
    maxAttempts: 3,
    backoff: 'exponential',
    baseDelayMs: 100,
    maxDelayMs: 5_000,
    retryableErrors: ['timeout', 'transient', 'busy', 'unavailable'],
};
/** Compute the delay before the next attempt. */
function backoffDelay(policy, attempt) {
    const n = Math.max(1, attempt);
    let delay;
    if (policy.backoff === 'fixed') {
        delay = policy.baseDelayMs;
    }
    else if (policy.backoff === 'linear') {
        delay = policy.baseDelayMs * n;
    }
    else {
        delay = policy.baseDelayMs * Math.pow(2, n - 1);
    }
    return Math.min(delay, policy.maxDelayMs);
}
/** Determine whether an error is retryable per policy. */
function isRetryable(policy, errorMessage) {
    if (!policy.retryableErrors || policy.retryableErrors.length === 0)
        return true;
    const lower = errorMessage.toLowerCase();
    return policy.retryableErrors.some(s => lower.includes(s.toLowerCase()));
}
/** Execute a function with retry policy. */
async function withRetry(fn, policy = exports.DEFAULT_RETRY_POLICY) {
    if (!fn || typeof fn !== 'function')
        throw new errors_js_1.RetryError('fn must be a function');
    let lastError;
    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt >= policy.maxAttempts)
                break;
            if (!isRetryable(policy, lastError.message))
                break;
            const delay = backoffDelay(policy, attempt);
            await sleep(delay);
        }
    }
    throw new errors_js_1.RetryError(`all ${policy.maxAttempts} attempts failed: ${lastError?.message ?? 'unknown error'}`, lastError);
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
//# sourceMappingURL=retry.js.map