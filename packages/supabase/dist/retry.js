"use strict";
/**
 * @manya-os/supabase — retry utility for transient Supabase errors.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.backoffDelay = backoffDelay;
exports.withRetry = withRetry;
const errors_js_1 = require("./errors.js");
/**
 * Compute the delay in milliseconds for a given retry attempt using the
 * configured backoff strategy. Always uses exponential backoff.
 */
function backoffDelay(config, attempt) {
    const delay = config.baseDelayMs * Math.pow(2, attempt);
    return Math.min(delay, config.maxDelayMs);
}
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
async function withRetry(fn, config, logger, label) {
    let lastError;
    for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err;
            if (!(0, errors_js_1.isRetryable)(err) || attempt === config.maxAttempts - 1) {
                throw err;
            }
            const delay = backoffDelay(config, attempt);
            logger.warn(`${label} failed (attempt ${attempt + 1}/${config.maxAttempts}), retrying in ${delay}ms`, {
                error: err instanceof Error ? err.message : String(err),
                attempt: attempt + 1,
                delayMs: delay,
            });
            await sleep(delay);
        }
    }
    throw lastError;
}
/** Promise-based sleep. */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=retry.js.map