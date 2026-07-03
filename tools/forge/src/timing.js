/**
 * Timing-safe comparison utilities for the Manya Forge tool.
 * Prevents timing side-channel attacks when comparing secrets.
 */

import { timingSafeEqual as cryptoTimingSafeEqual } from 'node:crypto';

/**
 * Timing-safe buffer comparison.
 * @param {Buffer} a - First buffer.
 * @param {Buffer} b - Second buffer.
 * @returns {boolean} True if buffers are identical.
 * @throws {Error} If buffers have different lengths.
 */
export function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    // Per crypto.timingSafeEqual contract — different lengths cannot be compared safely.
    // We still perform a constant-time dummy comparison to avoid leaking length info.
    const dummy = Buffer.alloc(a.length);
    cryptoTimingSafeEqual(dummy, dummy);
    return false;
  }
  return cryptoTimingSafeEqual(a, b);
}

/**
 * Timing-safe string comparison (converts to UTF-8 buffers first).
 * @param {string} a - First string.
 * @param {string} b - Second string.
 * @returns {boolean} True if strings are identical.
 */
export function timingSafeCompare(a, b) {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  return timingSafeEqual(bufA, bufB);
}
