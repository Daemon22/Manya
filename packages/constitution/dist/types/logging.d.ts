/**
 * @manya/constitution — structured logging (mirrors @manya/keyring pattern).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
/** Logger interface used throughout @manya/constitution. */
export interface Logger {
    debug(msg: string, meta?: Record<string, unknown>): void;
    info(msg: string, meta?: Record<string, unknown>): void;
    warn(msg: string, meta?: Record<string, unknown>): void;
    error(msg: string, meta?: Record<string, unknown>): void;
}
/** Severity levels supported by the logger. `'silent'` emits nothing. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
/** Field names that are always redacted when scrubbing log metadata. */
export declare const SCRUBBED_FIELD_NAMES: readonly ["taxId", "secret", "token", "apiKey", "password"];
/** Returns true when `name` matches a scrubbed field (case-insensitive, suffix-aware). */
export declare function shouldScrubField(name: string): boolean;
/** Recursively scrubs sensitive fields from `meta`, returning a safe copy. */
export declare function scrubMetadata(meta: unknown): unknown;
/** Logger that writes JSON lines to stdout/stderr. */
export declare class ConsoleLogger implements Logger {
    private readonly level;
    private readonly levelRank;
    constructor(level?: LogLevel);
    debug(msg: string, meta?: Record<string, unknown>): void;
    info(msg: string, meta?: Record<string, unknown>): void;
    warn(msg: string, meta?: Record<string, unknown>): void;
    error(msg: string, meta?: Record<string, unknown>): void;
    private emit;
}
/** Logger that discards everything. */
export declare class SilentLogger implements Logger {
    debug(): void;
    info(): void;
    warn(): void;
    error(): void;
}
//# sourceMappingURL=logging.d.ts.map