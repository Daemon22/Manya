/**
 * Key derivation utilities for the Manya Forge tool.
 * Uses PBKDF2 with SHA-256 for deterministic key derivation from passphrases.
 */

import { pbkdf2Sync, pbkdf2, randomBytes } from 'node:crypto';

const DEFAULT_ITERATIONS = 600_000;
const KEY_LENGTH = 32; // 256-bit key
const SALT_LENGTH = 16; // 128-bit salt
const DIGEST = 'sha256';

/**
 * Derives a cryptographic key pair from a passphrase (synchronous).
 * @param {string} passphrase - The input passphrase.
 * @param {Buffer} [salt] - Optional salt (16 bytes). Generated randomly if omitted.
 * @param {number} [iterations] - PBKDF2 iteration count. Defaults to 600 000.
 * @returns {{ key: Buffer, salt: Buffer, iterations: number, derivedAt: string }}
 */
export function deriveKeyPair(passphrase, salt, iterations = DEFAULT_ITERATIONS) {
  const usedSalt = salt ?? randomBytes(SALT_LENGTH);
  const key = pbkdf2Sync(passphrase, usedSalt, iterations, KEY_LENGTH, DIGEST);
  return {
    key,
    salt: usedSalt,
    iterations,
    derivedAt: new Date().toISOString(),
  };
}

/**
 * Derives a cryptographic key pair from a passphrase (asynchronous).
 * @param {string} passphrase - The input passphrase.
 * @param {Buffer} [salt] - Optional salt (16 bytes). Generated randomly if omitted.
 * @param {number} [iterations] - PBKDF2 iteration count. Defaults to 600 000.
 * @returns {Promise<{ key: Buffer, salt: Buffer, iterations: number, derivedAt: string }>}
 */
export function deriveKeyPairAsync(passphrase, salt, iterations = DEFAULT_ITERATIONS) {
  const usedSalt = salt ?? randomBytes(SALT_LENGTH);
  return new Promise((resolve, reject) => {
    pbkdf2(passphrase, usedSalt, iterations, KEY_LENGTH, DIGEST, (err, key) => {
      if (err) return reject(err);
      resolve({
        key,
        salt: usedSalt,
        iterations,
        derivedAt: new Date().toISOString(),
      });
    });
  });
}

/**
 * Rotates a key by deriving both the old and new keys from the same salt.
 * Useful for re-encrypting data when a passphrase changes.
 * @param {string} oldPassphrase - The current passphrase.
 * @param {string} newPassphrase - The new passphrase.
 * @param {Buffer} salt - The shared salt to derive both keys from.
 * @param {number} [iterations] - PBKDF2 iteration count. Defaults to 600 000.
 * @returns {{ oldKey: Buffer, newKey: Buffer, salt: Buffer }}
 */
export function rotateKey(oldPassphrase, newPassphrase, salt, iterations = DEFAULT_ITERATIONS) {
  const oldKey = pbkdf2Sync(oldPassphrase, salt, iterations, KEY_LENGTH, DIGEST);
  const newKey = pbkdf2Sync(newPassphrase, salt, iterations, KEY_LENGTH, DIGEST);
  return { oldKey, newKey, salt };
}
