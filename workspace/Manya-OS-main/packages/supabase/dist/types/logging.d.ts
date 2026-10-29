/**
 * @manya-os/supabase — structured logger.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
/** Log levels in ascending severity. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
/** Structured logger interface matching @manya-os/memory and @manya-os/ledger. */
export interface Logger {
    debug(msg: string, meta?: Record<string, unknown>): void;
    info(msg: string, meta?: Record<string, unknown>): void;
    warn(msg: string, meta?: Record<string, unknown>): void;
    error(msg: string, meta?: Record<string, unknown>): void;
}
/** Console-based structured logger with level filtering. */
export declare class ConsoleLogger implements Logger {
    private readonly level;
    private readonly weight;
    constructor(level?: LogLevel);
    debug(msg: string, meta?: Record<string, unknown>): void;
    info(msg: string, meta?: Record<string, unknown>): void;
    warn(msg: string, meta?: Record<string, unknown>): void;
    error(msg: string, meta?: Record<string, unknown>): void;
}
/** No-op logger for silent mode and tests. */
export declare class SilentLogger implements Logger {
    debug(): void;
    info(): void;
    warn(): void;
    error(): void;
}
/** Factory that creates the appropriate logger. */
export declare function createLogger(level?: LogLevel, logger?: Logger): Logger;
//# sourceMappingURL=logging.d.ts.map