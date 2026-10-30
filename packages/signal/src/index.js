/**
 * Manya Signal — Secure encrypted message envelopes with cryptographic signatures.
 * Everything Connected. Everyone Unified.
 */

import {
  compose, seal, open, sign, verifySignature,
  hmac, verifyHmac, generateSigningKeys,
} from './envelope.js';

/**
 * Unified Signal API object.
 * @type {{ compose: typeof compose, seal: typeof seal, open: typeof open, sign: typeof sign, verifySignature: typeof verifySignature, hmac: typeof hmac, verifyHmac: typeof verifyHmac, generateSigningKeys: typeof generateSigningKeys }}
 */
export const signal = {
  compose,
  seal,
  open,
  sign,
  verifySignature,
  hmac,
  verifyHmac,
  generateSigningKeys,
};

export {
  compose, seal, open, sign, verifySignature,
  hmac, verifyHmac, generateSigningKeys,
};

export default signal;
