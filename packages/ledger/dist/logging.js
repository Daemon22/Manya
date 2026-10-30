"use strict";
/**
 * @manya-os/ledger — structured logging with secret scrubbing.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SilentLogger = exports.ConsoleLogger = exports.SCRUBBED_FIELD_NAMES = void 0;
exports.shouldScrubField = shouldScrubField;
exports.scrubMetadata = scrubMetadata;
const LEVEL_RANK = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
    silent: 100,
};
/**
 * Field names that are scrubbed from logged metadata. The check is
 * case-insensitive and matches by suffix, so `privateKey` is scrubbed
 * alongside `key` and `authorityKey`.
 */
exports.SCRUBBED_FIELD_NAMES = [
    'privateKey',
    'privateKeyPem',
    'publicKeyPem',
    'password',
    'passphrase',
    'token',
    'secret',
    'credential',
    'iv',
    'tag',
    'share',
    'nonce',
    'signature',
    'commitment',
    'macs',
    'machineId',
];
const SCRUB_REGEX = new RegExp('(?:' + exports.SCRUBBED_FIELD_NAMES.map((n) => n.toLowerCase()).join('|') + ')$', 'i');
/**
 * Returns `true` if a field name should be scrubbed.
 * @internal
 */
function shouldScrubField(name) {
    if (typeof name !== 'string')
        return false;
    const lower = name.toLowerCase();
    for (const needle of exports.SCRUBBED_FIELD_NAMES) {
        const nl = needle.toLowerCase();
        if (lower === nl)
            return true;
        if (lower.endsWith('_' + nl))
            return true;
        if (lower.endsWith(nl) && lower.length > nl.length) {
            // camelCase boundary, e.g. "sessionToken"
            const prevChar = name[name.length - nl.length - 1];
            if (prevChar && /[A-Z]/.test(prevChar))
                return true;
        }
    }
    return SCRUB_REGEX.test(name);
}
/**
 * Deeply clone and scrub a metadata object. Returns a new object with secret
 * fields replaced by the literal string `[redacted]`. Buffers become
 * `[buffer:<length>]` unless the field is scrubbed.
 */
function scrubMetadata(meta) {
    if (meta === null || meta === undefined)
        return meta;
    if (typeof meta !== 'object')
        return meta;
    if (Buffer.isBuffer(meta))
        return `[buffer:${meta.length}]`;
    if (meta instanceof Uint8Array)
        return `[uint8array:${meta.length}]`;
    if (meta instanceof Date)
        return meta.toISOString();
    if (Array.isArray(meta)) {
        return meta.map((v) => scrubMetadata(v));
    }
    const out = {};
    for (const [key, value] of Object.entries(meta)) {
        if (shouldScrubField(key)) {
            out[key] = '[redacted]';
        }
        else {
            out[key] = scrubMetadata(value);
        }
    }
    return out;
}
/**
 * A {@link Logger} that writes JSON to stdout/stderr with secret scrubbing.
 *
 * Errors are caught — logging must never crash the host process.
 */
class ConsoleLogger {
    level;
    levelRank;
    constructor(level = 'info') {
        this.level = level;
        this.levelRank = LEVEL_RANK[level] ?? LEVEL_RANK.info;
    }
    /** @inheritdoc */
    debug(msg, meta) {
        this.emit('debug', msg, meta);
    }
    /** @inheritdoc */
    info(msg, meta) {
        this.emit('info', msg, meta);
    }
    /** @inheritdoc */
    warn(msg, meta) {
        this.emit('warn', msg, meta);
    }
    /** @inheritdoc */
    error(msg, meta) {
        this.emit('error', msg, meta);
    }
    emit(level, msg, meta) {
        try {
            if (LEVEL_RANK[level] < this.levelRank)
                return;
            const entry = {
                level,
                msg,
                ts: new Date().toISOString(),
                ...(meta ? { meta: scrubMetadata(meta) } : {}),
            };
            const line = JSON.stringify(entry);
            if (level === 'error' || level === 'warn') {
                process.stderr.write(line + '\n');
            }
            else {
                process.stdout.write(line + '\n');
            }
        }
        catch {
            // Swallow — logging must never throw.
        }
    }
}
exports.ConsoleLogger = ConsoleLogger;
/**
 * A {@link Logger} that drops every message. Useful as a default in tests.
 */
class SilentLogger {
    debug() { }
    info() { }
    warn() { }
    error() { }
}
exports.SilentLogger = SilentLogger;
//# sourceMappingURL=logging.js.map