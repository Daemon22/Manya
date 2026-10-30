/**
 * @manya-os/memory — payload compression (simple dictionary-based).
 *
 * NOTE: This is a simple structural compressor for JSON-serializable
 * payloads. For binary payloads, use Node's zlib externally.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
export interface CompressedPayload {
    algorithm: 'gzip+json';
    /** Base64 of gzipped JSON. */
    data: string;
    /** Original byte length (for ratio metrics). */
    originalLength: number;
    /** Compressed byte length. */
    compressedLength: number;
}
/** Compress any JSON-serializable payload. */
export declare function compress(payload: unknown): CompressedPayload;
/** Decompress a payload previously compressed by `compress`. */
export declare function decompress<T = unknown>(c: CompressedPayload): T;
/** Compression ratio in [0,1] — lower is better. */
export declare function ratio(c: CompressedPayload): number;
//# sourceMappingURL=compress.d.ts.map