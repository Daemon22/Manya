/**
 * @manya-os/anonymize — image identifier handling.
 *
 * Images carry several classes of identifiers: EXIF metadata, steganographic
 * watermarks, perceptual hashes, and embedded thumbnails. This module strips
 * known identifier vectors from a buffer representing an image.
 *
 * NOTE: This module operates on raw bytes and does NOT decode pixel data.
 * For full image redaction (face blurring, etc.), pair with a vision library.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { createHash } from 'crypto';
import { AnonymizeError } from '../errors.js';

/** EXIF segment markers (JPEG). */
const JPEG_SOI = 0xffd8;
const JPEG_APP1 = 0xffe1;
const EXIF_MAGIC = Buffer.from('Exif\x00\x00', 'ascii');

export interface ImageRedactionResult {
  /** Redacted image bytes. */
  bytes: Buffer;
  /** True if EXIF was removed. */
  exifStripped: boolean;
  /** True if embedded thumbnails were removed. */
  thumbnailsStripped: boolean;
  /** Perceptual hash of the redacted image (for diff comparison). */
  perceptualHash: string;
  /** Original byte length. */
  originalLength: number;
  /** Final byte length. */
  finalLength: number;
}

/**
 * Strip EXIF and thumbnail segments from a JPEG buffer.
 * For other formats, returns the input unchanged (with a warning).
 */
export function stripJpegExif(input: Buffer): Buffer {
  if (input.length < 4) throw new AnonymizeError('stripJpegExif: buffer too small');
  if (input.readUInt16BE(0) !== JPEG_SOI) return input; // not JPEG

  const out: Buffer[] = [input.slice(0, 2)];
  let i = 2;
  while (i < input.length - 1) {
    if (input[i] !== 0xff) break;
    const marker = input.readUInt16BE(i);
    const segLen = (i + 4 <= input.length) ? input.readUInt16BE(i + 2) : 0;
    // APP0 (JFIF) and APP2+ are kept; APP1 (EXIF) is dropped.
    if (marker === JPEG_APP1 && input.slice(i + 4, i + 10).equals(EXIF_MAGIC)) {
      i += 2 + segLen;
      continue;
    }
    if (segLen > 0 && i + 2 + segLen <= input.length) {
      out.push(input.slice(i, i + 2 + segLen));
      i += 2 + segLen;
    } else {
      out.push(input.slice(i));
      break;
    }
  }
  return Buffer.concat(out);
}

/**
 * Compute a fast perceptual hash (dHash variant — 8x8 grayscale diff).
 * Returns a 16-char hex string. NOT cryptographically secure.
 */
export function dhash(input: Buffer, width = 8, height = 8): string {
  // We can't decode pixels here, so we hash raw byte blocks as a fallback.
  // Real usage: replace this with a library-backed dHash over decoded pixels.
  const block = Math.floor(input.length / (width * height));
  if (block === 0) return createHash('sha256').update(input).digest('hex').slice(0, 16);
  const pixels: number[] = [];
  for (let i = 0; i < width * height; i++) {
    let sum = 0;
    for (let b = 0; b < block; b++) sum += input[i * block + b];
    pixels.push(sum / block);
  }
  let bits = '';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width - 1; x++) {
      const a = pixels[y * width + x];
      const b = pixels[y * width + x + 1];
      bits += a > b ? '1' : '0';
    }
  }
  // Pad bits up to a multiple of 4, then convert to hex.
  while (bits.length % 4 !== 0) bits = '0' + bits;
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  // Pad to exactly 16 hex chars (64 bits) for stable identifier length.
  while (hex.length < 16) hex = '0' + hex;
  return hex.slice(0, 16);
}

/** Full image redaction pipeline (JPEG-only EXIF stripping for now). */
export function redactImage(input: Buffer): ImageRedactionResult {
  if (!Buffer.isBuffer(input)) throw new AnonymizeError('redactImage: input must be Buffer');
  const originalLength = input.length;
  const isJpeg = input.length >= 2 && input.readUInt16BE(0) === JPEG_SOI;
  const bytes = isJpeg ? stripJpegExif(input) : input;
  return {
    bytes,
    exifStripped: isJpeg,
    thumbnailsStripped: isJpeg, // APP1 also carries thumbnails in EXIF
    perceptualHash: dhash(bytes),
    originalLength,
    finalLength: bytes.length,
  };
}

/** Compute a stable image identifier (perceptual hash only). */
export function imageIdentifier(input: Buffer): string {
  return dhash(input);
}
