/**
 * @manya/contracts — structured logging (mirrors @manya/keyring pattern).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
export interface Logger {
    debug(msg: string, meta?: Record<string, unknown>): void;
    info(msg: string, meta?: Record<string, unknown>): void;
    warn(msg: string, meta?: Record<string, unknown>): void;
    error(msg: string, meta?: Record<string, unknown>): void;
}
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
/** Field names that are scrubbed from log metadata before emission. */
export declare const SCRUBBED_FIELD_NAMES: readonly ["secret", "token", "apiKey", "password", "authorization", "privateKey", "accessToken", "refreshToken"];
/** Returns `true` if a field name should be scrubbed from logs. */
export declare function shouldScrubField(name: string): boolean;
/** Deeply scrubs sensitive fields from log metadata. */
export declare function scrubMetadata(meta: unknown): unknown;
/** Logger that emits JSON lines to stdout/stderr with secret scrubbing. */
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