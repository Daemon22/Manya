"use strict";
/**
 * @manya-os/contracts — structured logging (mirrors @manya-os/keyring pattern).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SilentLogger = exports.ConsoleLogger = exports.SCRUBBED_FIELD_NAMES = void 0;
exports.shouldScrubField = shouldScrubField;
exports.scrubMetadata = scrubMetadata;
const LEVEL_RANK = {
    debug: 10, info: 20, warn: 30, error: 40, silent: 100,
};
/** Field names that are scrubbed from log metadata before emission. */
exports.SCRUBBED_FIELD_NAMES = [
    'secret', 'token', 'apiKey', 'password', 'authorization',
    'privateKey', 'accessToken', 'refreshToken',
];
/** Returns `true` if a field name should be scrubbed from logs. */
function shouldScrubField(name) {
    const lower = name.toLowerCase();
    for (const needle of exports.SCRUBBED_FIELD_NAMES) {
        const nl = needle.toLowerCase();
        if (lower === nl)
            return true;
        if (lower.endsWith('_' + nl))
            return true;
    }
    return false;
}
/** Deeply scrubs sensitive fields from log metadata. */
function scrubMetadata(meta) {
    if (meta === null || meta === undefined)
        return meta;
    if (typeof meta !== 'object')
        return meta;
    if (Buffer.isBuffer(meta))
        return `[buffer:${meta.length}]`;
    if (meta instanceof Date)
        return meta.toISOString();
    if (Array.isArray(meta))
        return meta.map(scrubMetadata);
    const out = {};
    for (const [k, v] of Object.entries(meta)) {
        out[k] = shouldScrubField(k) ? '[redacted]' : scrubMetadata(v);
    }
    return out;
}
/** Logger that emits JSON lines to stdout/stderr with secret scrubbing. */
class ConsoleLogger {
    level;
    levelRank;
    constructor(level = 'info') {
        this.level = level;
        this.levelRank = LEVEL_RANK[level] ?? LEVEL_RANK.info;
    }
    debug(msg, meta) { this.emit('debug', msg, meta); }
    info(msg, meta) { this.emit('info', msg, meta); }
    warn(msg, meta) { this.emit('warn', msg, meta); }
    error(msg, meta) { this.emit('error', msg, meta); }
    emit(level, msg, meta) {
        try {
            if (LEVEL_RANK[level] < this.levelRank)
                return;
            const entry = { level, msg, ts: new Date().toISOString(), ...(meta ? { meta: scrubMetadata(meta) } : {}) };
            const line = JSON.stringify(entry);
            if (level === 'error' || level === 'warn')
                process.stderr.write(line + '\n');
            else
                process.stdout.write(line + '\n');
        }
        catch { /* never throw */ }
    }
}
exports.ConsoleLogger = ConsoleLogger;
/** Logger that discards everything. */
class SilentLogger {
    debug() { }
    info() { }
    warn() { }
    error() { }
}
exports.SilentLogger = SilentLogger;
//# sourceMappingURL=logging.js.map