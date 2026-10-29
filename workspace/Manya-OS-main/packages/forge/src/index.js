/**
 * Manya Forge — Key derivation, passphrase strength analysis, and cryptographic key management.
 * Everything Connected. Everyone Unified.
 */

import { scorePassphrase } from './strength.js';
import { deriveKeyPair, deriveKeyPairAsync, rotateKey } from './derive.js';
import { hash, hashWithSalt } from './hash.js';
import { timingSafeEqual, timingSafeCompare } from './timing.js';

/**
 * Unified Forge API object.
 * @type {{ strength: typeof scorePassphrase, derive: typeof deriveKeyPair, deriveAsync: typeof deriveKeyPairAsync, rotateKey: typeof rotateKey, hash: typeof hash, hashWithSalt: typeof hashWithSalt, timingSafeEqual: typeof timingSafeEqual, timingSafeCompare: typeof timingSafeCompare }}
 */
export const forge = {
  strength: scorePassphrase,
  derive: deriveKeyPair,
  deriveAsync: deriveKeyPairAsync,
  rotateKey,
  hash,
  hashWithSalt,
  timingSafeEqual,
  timingSafeCompare,
};

export {
  scorePassphrase,
  deriveKeyPair,
  deriveKeyPairAsync,
  rotateKey,
  hash,
  hashWithSalt,
  timingSafeEqual,
  timingSafeCompare,
};

export default forge;
