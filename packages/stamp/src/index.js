/**
 * Manya Stamp — Tamper-proof timestamping, audit trails, and provenance chains.
 * Everything Connected. Everyone Unified.
 */

import { stamp, verify } from './stamp.js';
import { chainEntry, buildChain, verifyChain } from './chain.js';
import { audit, buildTrail, verifyTrail } from './audit.js';

/**
 * Unified Stamp API object.
 */
export const stampApi = {
  stamp,
  verify,
  chain: buildChain,
  chainEntry,
  verifyChain,
  audit,
  buildTrail,
  verifyTrail,
};

export {
  stamp,
  verify,
  chainEntry,
  buildChain,
  verifyChain,
  audit,
  buildTrail,
  verifyTrail,
};

export default stampApi;
