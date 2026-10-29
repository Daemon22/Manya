/**
 * @manya-os/memory — payload compression (simple dictionary-based).
 *
 * NOTE: This is a simple structural compressor for JSON-serializable
 * payloads. For binary payloads, use Node's zlib externally.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { gzipSync, gunzipSync } from 'zlib';
import { MemoryError } from '../errors.js';

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
export function compress(payload: unknown): CompressedPayload {
  if (payload === undefined) throw new MemoryError('compress: payload is undefined');
  const json = JSON.stringify(payload);
  const originalBuf = Buffer.from(json, 'utf8');
  const compressed = gzipSync(originalBuf);
  return {
    algorithm: 'gzip+json',
    data: compressed.toString('base64'),
    originalLength: originalBuf.length,
    compressedLength: compressed.length,
  };
}

/** Decompress a payload previously compressed by `compress`. */
export function decompress<T = unknown>(c: CompressedPayload): T {
  if (!c || c.algorithm !== 'gzip+json') throw new MemoryError('decompress: unsupported algorithm');
  const buf = Buffer.from(c.data, 'base64');
  const json = gunzipSync(buf).toString('utf8');
  return JSON.parse(json) as T;
}

/** Compression ratio in [0,1] — lower is better. */
export function ratio(c: CompressedPayload): number {
  if (c.originalLength === 0) return 1;
  return c.compressedLength / c.originalLength;
}
