"use strict";
/**
 * @manya-os/memory — payload compression (simple dictionary-based).
 *
 * NOTE: This is a simple structural compressor for JSON-serializable
 * payloads. For binary payloads, use Node's zlib externally.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.compress = compress;
exports.decompress = decompress;
exports.ratio = ratio;
const zlib_1 = require("zlib");
const errors_js_1 = require("../errors.js");
/** Compress any JSON-serializable payload. */
function compress(payload) {
    if (payload === undefined)
        throw new errors_js_1.MemoryError('compress: payload is undefined');
    const json = JSON.stringify(payload);
    const originalBuf = Buffer.from(json, 'utf8');
    const compressed = (0, zlib_1.gzipSync)(originalBuf);
    return {
        algorithm: 'gzip+json',
        data: compressed.toString('base64'),
        originalLength: originalBuf.length,
        compressedLength: compressed.length,
    };
}
/** Decompress a payload previously compressed by `compress`. */
function decompress(c) {
    if (!c || c.algorithm !== 'gzip+json')
        throw new errors_js_1.MemoryError('decompress: unsupported algorithm');
    const buf = Buffer.from(c.data, 'base64');
    const json = (0, zlib_1.gunzipSync)(buf).toString('utf8');
    return JSON.parse(json);
}
/** Compression ratio in [0,1] — lower is better. */
function ratio(c) {
    if (c.originalLength === 0)
        return 1;
    return c.compressedLength / c.originalLength;
}
//# sourceMappingURL=compress.js.map