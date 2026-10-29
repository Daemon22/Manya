/**
 * @manya-os/attest — cryptographic nonce store with TTL.
 *
 * Single-use nonces prevent replay attacks: a verifier issues a nonce, the
 * prover must echo it back signed, and the verifier consumes (invalidates)
 * the nonce after a successful or failed attempt.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
/** Default nonce TTL: 5 minutes. */
export declare const DEFAULT_NONCE_TTL_MS: number;
/** Default nonce byte length: 32 (256 bits). */
export declare const DEFAULT_NONCE_BYTES = 32;
/**
 * Options for {@link NonceStore.issue}.
 */
export interface NonceIssueOptions {
    /** TTL in milliseconds. Defaults to {@link DEFAULT_NONCE_TTL_MS}. */
    ttlMs?: number;
    /** Number of random bytes. Defaults to {@link DEFAULT_NONCE_BYTES}. */
    bytes?: number;
}
/**
 * A single-use nonce store with TTL expiry.
 *
 * - `issue()` returns a fresh, unique nonce.
 * - `consume(nonce)` validates that the nonce exists, is unconsumed, and is
 *   not expired; if so, marks it consumed and returns `true`. Otherwise
 *   returns `false` (or throws on malformed input).
 * - `cleanup()` removes expired records.
 *
 * This implementation is in-memory and process-local. Distributed deployments
 * should replace it with a shared store (Redis, etc.) with the same interface.
 */
export declare class NonceStore {
    private readonly records;
    private readonly defaultTtlMs;
    private readonly defaultBytes;
    /**
     * @param defaultTtlMs - Default TTL applied to issued nonces.
     * @param defaultBytes - Default byte length for issued nonces.
     */
    constructor(defaultTtlMs?: number, defaultBytes?: number);
    /**
     * Issue a fresh single-use nonce.
     *
     * The nonce is returned as a hex string. It is guaranteed unique within
     * this store (collisions are detected and regenerated).
     *
     * @param opts - Optional issue parameters.
     */
    issue(opts?: NonceIssueOptions): string;
    /**
     * Consume (invalidate) a nonce. Returns `true` if the nonce was valid and
     * unconsumed; returns `false` if the nonce was unknown, already consumed,
     * or expired.
     *
     * Single-use semantics: a successful consume marks the nonce as consumed
     * and it can NEVER be consumed again.
     *
     * @param nonce - The nonce to consume.
     * @param opts.skipConsumeOnExpiry - If true, expired nonces are NOT marked
     *   consumed (they'll be cleaned up by `cleanup()`). Default false.
     */
    consume(nonce: string, opts?: {
        skipConsumeOnExpiry?: boolean;
    }): boolean;
    /**
     * Check whether a nonce is currently valid (present, unconsumed, unexpired).
     * Does NOT consume the nonce.
     */
    isValid(nonce: string): boolean;
    /**
     * Remove expired (and consumed) records. Returns the number of records
     * removed.
     */
    cleanup(): number;
    /**
     * Return the number of currently-tracked (non-expired, unconsumed) nonces.
     */
    size(): number;
    /**
     * Clear all records (useful in tests).
     */
    clear(): void;
}
//# sourceMappingURL=nonce.d.ts.map