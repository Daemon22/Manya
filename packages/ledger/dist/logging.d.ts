/**
 * @manya-os/ledger — structured logging with secret scrubbing.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
/**
 * Structured logger interface. Implementations must be safe to call from
 * cryptographic hot paths (i.e. they must not throw).
 */
export interface Logger {
    /** Log a debug message. */
    debug(msg: string, meta?: Record<string, unknown>): void;
    /** Log an informational message. */
    info(msg: string, meta?: Record<string, unknown>): void;
    /** Log a warning. */
    warn(msg: string, meta?: Record<string, unknown>): void;
    /** Log an error. */
    error(msg: string, meta?: Record<string, unknown>): void;
}
/** Log levels, ordered least to most severe. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
/**
 * Field names that are scrubbed from logged metadata. The check is
 * case-insensitive and matches by suffix, so `privateKey` is scrubbed
 * alongside `key` and `authorityKey`.
 */
export declare const SCRUBBED_FIELD_NAMES: readonly ["privateKey", "privateKeyPem", "publicKeyPem", "password", "passphrase", "token", "secret", "credential", "iv", "tag", "share", "nonce", "signature", "commitment", "macs", "machineId"];
/**
 * Returns `true` if a field name should be scrubbed.
 * @internal
 */
export declare function shouldScrubField(name: string): boolean;
/**
 * Deeply clone and scrub a metadata object. Returns a new object with secret
 * fields replaced by the literal string `[redacted]`. Buffers become
 * `[buffer:<length>]` unless the field is scrubbed.
 */
export declare function scrubMetadata(meta: unknown): unknown;
/**
 * A {@link Logger} that writes JSON to stdout/stderr with secret scrubbing.
 *
 * Errors are caught — logging must never crash the host process.
 */
export declare class ConsoleLogger implements Logger {
    private readonly level;
    private readonly levelRank;
    constructor(level?: LogLevel);
    /** @inheritdoc */
    debug(msg: string, meta?: Record<string, unknown>): void;
    /** @inheritdoc */
    info(msg: string, meta?: Record<string, unknown>): void;
    /** @inheritdoc */
    warn(msg: string, meta?: Record<string, unknown>): void;
    /** @inheritdoc */
    error(msg: string, meta?: Record<string, unknown>): void;
    private emit;
}
/**
 * A {@link Logger} that drops every message. Useful as a default in tests.
 */
export declare class SilentLogger implements Logger {
    debug(): void;
    info(): void;
    warn(): void;
    error(): void;
}
//# sourceMappingURL=logging.d.ts.map