/**
 * @manya/weave — structured logging (mirrors @manya/keyring pattern).
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
export declare const SCRUBBED_FIELD_NAMES: readonly ["token", "secret", "apiKey", "password", "credentials", "cookie"];
export declare function shouldScrubField(name: string): boolean;
export declare function scrubMetadata(meta: unknown): unknown;
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
export declare class SilentLogger implements Logger {
    debug(): void;
    info(): void;
    warn(): void;
    error(): void;
}
//# sourceMappingURL=logging.d.ts.map