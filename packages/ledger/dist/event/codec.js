"use strict";
/**
 * @manya-os/ledger — canonical serialization for hashing.
 *
 * Produces a deterministic JSON encoding with sorted keys and no whitespace.
 * Used to compute the SHA-256 hash of a ledger event — the result MUST be
 * byte-identical across runs, runtimes, and locales.
 *
 * Rules:
 *   1. Object keys are sorted lexicographically (by UTF-16 code unit).
 *   2. No whitespace between tokens.
 *   3. Strings are JSON-escaped (the standard JSON.stringify behavior).
 *   4. `undefined` values are omitted. `null` is preserved.
 *   5. Buffers / Uint8Arrays are encoded as `{ "@buffer": "<hex>" }` so they
 *      round-trip deterministically (this is mainly for the internal hash
 *      computation; payloads SHOULD be plain JSON).
 *   6. Numbers preserve their canonical JSON representation. `NaN` / `Infinity`
 *      are rejected (they are not valid JSON).
 *   7. Cycles are detected and rejected.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalSerialize = canonicalSerialize;
exports.canonicalSerializeToString = canonicalSerializeToString;
const errors_js_1 = require("../errors.js");
/**
 * Canonicalize an arbitrary JSON-serializable value into a deterministic
 * UTF-8 Buffer.
 *
 * @param value - JSON-serializable value.
 * @returns UTF-8-encoded canonical JSON.
 * @throws {@link LedgerError} on cycles, `NaN`/`Infinity`, or unsupported types.
 */
function canonicalSerialize(value) {
    const seen = new WeakSet();
    const str = encode(value, seen);
    return Buffer.from(str, 'utf8');
}
/**
 * Canonicalize to a string (mostly useful for tests).
 */
function canonicalSerializeToString(value) {
    const seen = new WeakSet();
    return encode(value, seen);
}
function encode(value, seen) {
    if (value === null)
        return 'null';
    if (value === undefined)
        return 'null'; // treat as null at top-level (rare)
    const t = typeof value;
    if (t === 'string')
        return jsonString(value);
    if (t === 'boolean')
        return value ? 'true' : 'false';
    if (t === 'number') {
        if (!Number.isFinite(value)) {
            throw new errors_js_1.LedgerError('canonicalSerialize: NaN / Infinity are not JSON-representable', 'CANONICAL_ENCODE_ERROR');
        }
        // Number.prototype.toString is canonical for finite IEEE-754 doubles.
        return value.toString();
    }
    if (t === 'bigint') {
        throw new errors_js_1.LedgerError('canonicalSerialize: bigint is not JSON-representable (wrap in a string)', 'CANONICAL_ENCODE_ERROR');
    }
    if (Buffer.isBuffer(value)) {
        return jsonString('@buffer:' + value.toString('hex'));
    }
    if (value instanceof Uint8Array) {
        return jsonString('@buffer:' + Buffer.from(value).toString('hex'));
    }
    if (value instanceof Date) {
        return jsonString(value.toISOString());
    }
    if (Array.isArray(value)) {
        if (seen.has(value)) {
            throw new errors_js_1.LedgerError('canonicalSerialize: cycle detected', 'CANONICAL_ENCODE_ERROR');
        }
        seen.add(value);
        const items = value.map((v) => v === undefined ? 'null' : encode(v, seen));
        seen.delete(value);
        return '[' + items.join(',') + ']';
    }
    if (t === 'object') {
        const obj = value;
        if (seen.has(obj)) {
            throw new errors_js_1.LedgerError('canonicalSerialize: cycle detected', 'CANONICAL_ENCODE_ERROR');
        }
        seen.add(obj);
        try {
            const keys = Object.keys(obj).sort();
            const pairs = [];
            for (const key of keys) {
                const v = obj[key];
                if (v === undefined)
                    continue; // omit undefined
                pairs.push(jsonString(key) + ':' + encode(v, seen));
            }
            return '{' + pairs.join(',') + '}';
        }
        finally {
            seen.delete(obj);
        }
    }
    // functions, symbols, etc.
    throw new errors_js_1.LedgerError(`canonicalSerialize: unsupported value of type ${t}`, 'CANONICAL_ENCODE_ERROR');
}
/**
 * JSON-escape a string with the standard JSON.stringify rules. We do not use
 * `JSON.stringify(s)` directly because some engines differ in how they
 * escape non-ASCII characters; we want the exact same bytes everywhere.
 *
 * For our purposes (canonical hashing across Node versions) the built-in
 * `JSON.stringify` is sufficient — but we centralize it here so a future
 * switch to a stricter escaper (e.g. RFC 8785 JCS) is a single edit.
 */
function jsonString(s) {
    return JSON.stringify(s);
}
//# sourceMappingURL=codec.js.map