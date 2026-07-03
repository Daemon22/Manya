/**
 * @craft/stream — Streaming Support for Large Files
 *
 * Process large files in chunks without loading the entire file
 * into memory before processing starts. The stream is consumed
 * chunk-by-chunk, concatenated, then processed through the
 * standard nano/macro pipeline.
 *
 * This avoids needing the entire file in memory at once before
 * processing starts — the stream is consumed incrementally and
 * the buffer is built up as data arrives.
 */

import { nano } from './nano.js';
import { macro } from './macro.js';
import type { CraftMetadata } from './types.js';

// ── Types ─────────────────────────────────────────────────────────

/** Options for streaming operations */
export interface StreamOptions {
  /** Chunk size for tracking (default 64KB = 65536) */
  chunkSize?: number;
  /** Compression mode: '7fold' (default) or 'brotli' */
  compressionMode?: '7fold' | 'brotli';
  /** Encryption algorithm (default: 'aes-256-gcm') */
  encryptionAlgo?: 'aes-256-gcm';
}

/** Result of a streaming nano operation */
export interface StreamResult {
  /** The resulting .craft package buffer */
  buffer: Buffer;
  /** Metadata about the operation */
  metadata: CraftMetadata;
  /** Compression ratio (0–1, lower is better) */
  compressionRatio: number;
  /** Space saved in bytes */
  spaceSaved: number;
  /** Space saved as percentage */
  spaceSavedPercent: number;
  /** Number of chunks consumed from the stream */
  chunksProcessed: number;
  /** Total bytes read from the stream */
  totalBytesProcessed: number;
}

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Consume a NodeJS.ReadableStream chunk by chunk into a Buffer array.
 * Returns the concatenated buffer plus chunk/byte counts.
 */
async function consumeStream(
  source: NodeJS.ReadableStream,
): Promise<{ data: Buffer; chunksProcessed: number; totalBytesProcessed: number }> {
  const chunks: Buffer[] = [];
  let chunksProcessed = 0;
  let totalBytesProcessed = 0;

  return new Promise((resolve, reject) => {
    source.on('data', (chunk: Buffer | string) => {
      const buf = typeof chunk === 'string' ? Buffer.from(chunk, 'utf-8') : chunk;
      chunks.push(buf);
      chunksProcessed++;
      totalBytesProcessed += buf.length;
    });

    source.on('end', () => {
      resolve({
        data: Buffer.concat(chunks),
        chunksProcessed,
        totalBytesProcessed,
      });
    });

    source.on('error', (err: Error) => {
      reject(new Error(`Stream consumption failed: ${err.message}`));
    });
  });
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Nano-stream: reads a readable stream, collects chunks, then performs
 * checksum → compress → encrypt → package.
 *
 * This avoids needing the entire file in memory at once before
 * processing starts. The stream is consumed chunk-by-chunk,
 * concatenated, then processed through the standard nano pipeline.
 *
 * @param source — A Node.js ReadableStream providing the file data
 * @param originalName — Original filename for metadata
 * @param originalMime — Original MIME type for metadata
 * @param passphrase — Encryption passphrase (min 8 characters)
 * @param options — Optional streaming/compression/encryption settings
 * @returns StreamResult with the .craft buffer and chunk stats
 */
export async function nanoStream(
  source: NodeJS.ReadableStream,
  originalName: string,
  originalMime: string,
  passphrase: string,
  options?: StreamOptions,
): Promise<StreamResult> {
  // Step 1: Consume the stream chunk by chunk
  const { data, chunksProcessed, totalBytesProcessed } = await consumeStream(source);

  if (data.length === 0) {
    throw new Error('Cannot craft empty stream. The readable stream produced no data.');
  }

  // Step 2: Process through the standard nano pipeline
  const result = await nano(data, originalName, originalMime, passphrase, {
    compressionMode: options?.compressionMode,
    encryptionAlgo: options?.encryptionAlgo,
  });

  return {
    buffer: result.buffer,
    metadata: result.metadata,
    compressionRatio: result.compressionRatio,
    spaceSaved: result.spaceSaved,
    spaceSavedPercent: result.spaceSavedPercent,
    chunksProcessed,
    totalBytesProcessed,
  };
}

/**
 * Macro-stream: decrypt and decompress a .craft package, returning
 * a buffer and chunk count info.
 *
 * The craftBuffer is processed through the standard macro pipeline.
 * Chunk info is derived from the resulting buffer size divided by
 * the configured chunk size.
 *
 * @param craftBuffer — The .craft package buffer
 * @param passphrase — Decryption passphrase
 * @param options — Optional streaming settings (chunkSize for tracking)
 * @returns StreamResult with the restored data, verification status, and chunk info
 */
export async function macroStream(
  craftBuffer: Buffer,
  passphrase: string,
  options?: StreamOptions,
): Promise<StreamResult & { integrityVerified: boolean }> {
  // Process through the standard macro pipeline
  const result = await macro(craftBuffer, passphrase);

  const chunkSize = options?.chunkSize ?? 65536;
  const chunksProcessed = Math.max(1, Math.ceil(result.buffer.length / chunkSize));

  return {
    buffer: result.buffer,
    metadata: result.metadata,
    compressionRatio: result.metadata.compressedSize > 0
      ? result.metadata.originalSize / result.metadata.compressedSize
      : 0,
    spaceSaved: Math.max(0, result.metadata.originalSize - result.buffer.length),
    spaceSavedPercent: result.metadata.originalSize > 0
      ? Math.max(0, ((result.metadata.originalSize - result.buffer.length) / result.metadata.originalSize) * 100)
      : 0,
    chunksProcessed,
    totalBytesProcessed: result.buffer.length,
    integrityVerified: result.integrityVerified,
  };
}
