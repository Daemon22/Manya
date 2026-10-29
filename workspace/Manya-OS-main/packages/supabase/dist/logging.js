"use strict";
/**
 * @manya-os/supabase — structured logger.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SilentLogger = exports.ConsoleLogger = void 0;
exports.createLogger = createLogger;
const LEVEL_WEIGHT = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    silent: 4,
};
/** Keys that must never appear in log output. */
const SENSITIVE_KEYS = new Set([
    'serviceRoleKey', 'service_role', 'anonKey', 'anon_key',
    'authorization', 'password', 'secret', 'token', 'key',
]);
/** Recursively redact sensitive values in a meta object. */
function redact(meta) {
    const out = {};
    for (const [k, v] of Object.entries(meta)) {
        if (SENSITIVE_KEYS.has(k.toLowerCase()) || SENSITIVE_KEYS.has(k)) {
            out[k] = '[REDACTED]';
        }
        else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
            out[k] = redact(v);
        }
        else {
            out[k] = v;
        }
    }
    return out;
}
/** Console-based structured logger with level filtering. */
class ConsoleLogger {
    level;
    weight;
    constructor(level = 'info') {
        this.level = level;
        this.weight = LEVEL_WEIGHT[level] ?? 1;
    }
    debug(msg, meta) {
        if (this.weight <= LEVEL_WEIGHT.debug) {
            console.debug(`[supabase:debug] ${msg}`, meta ? redact(meta) : '');
        }
    }
    info(msg, meta) {
        if (this.weight <= LEVEL_WEIGHT.info) {
            console.info(`[supabase:info] ${msg}`, meta ? redact(meta) : '');
        }
    }
    warn(msg, meta) {
        if (this.weight <= LEVEL_WEIGHT.warn) {
            console.warn(`[supabase:warn] ${msg}`, meta ? redact(meta) : '');
        }
    }
    error(msg, meta) {
        if (this.weight <= LEVEL_WEIGHT.error) {
            console.error(`[supabase:error] ${msg}`, meta ? redact(meta) : '');
        }
    }
}
exports.ConsoleLogger = ConsoleLogger;
/** No-op logger for silent mode and tests. */
class SilentLogger {
    debug() { }
    info() { }
    warn() { }
    error() { }
}
exports.SilentLogger = SilentLogger;
/** Factory that creates the appropriate logger. */
function createLogger(level, logger) {
    if (logger)
        return logger;
    if (level === 'silent')
        return new SilentLogger();
    return new ConsoleLogger(level ?? 'info');
}
//# sourceMappingURL=logging.js.map