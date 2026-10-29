/**
 * @manya-os/ledger — chain verification.
 *
 * Verifies the cryptographic integrity of a sequence of ledger events:
 *   1. Each event's `prevHash` MUST equal the previous event's `hash`.
 *   2. Each event's `hash` MUST match a fresh recompute over its signing fields.
 *   3. (Optional) Each event's signature MUST verify against the supplied
 *      `actor → publicKey` map.
 *   4. (Optional, default on) Timestamps MUST be monotonically non-decreasing.
 *   5. (Optional, default on) Sequence numbers MUST be contiguous
 *      (1, 2, 3, ...).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

import type * as crypto from 'crypto';
import type {
  ChainVerification,
  LedgerEvent,
  VerifyChainOptions,
} from '../types.js';
import { computeEventHash, GENESIS_PREV_HASH } from '../event/event.js';
import { verifyEventSignature } from '../event/event.js';

/**
 * Verify the cryptographic integrity of a chain of events.
 *
 * @param events - Events to verify (in chain order).
 * @param opts - Verification options.
 * @returns A {@link ChainVerification} describing the first broken event
 *          (if any) and the reason.
 */
export function verifyChain(
  events: LedgerEvent[],
  opts: VerifyChainOptions = {}
): ChainVerification {
  if (!Array.isArray(events)) {
    return {
      valid: false,
      firstBrokenIndex: undefined,
      reason: 'verifyChain: events must be an array',
    };
  }
  if (events.length === 0) {
    return { valid: true };
  }
  const {
    publicKeys,
    requireSignatures = false,
    checkTimestamps = true,
    checkSeqContiguity = true,
  } = opts;

  let prevHash: string = GENESIS_PREV_HASH;
  let prevTs: number | undefined = undefined;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (!ev || typeof ev !== 'object') {
      return {
        valid: false,
        firstBrokenIndex: i,
        reason: `event ${i}: not a LedgerEvent object`,
      };
    }

    // 1. Sequence contiguity.
    if (checkSeqContiguity && ev.seq !== i + 1) {
      return {
        valid: false,
        firstBrokenIndex: i,
        reason: `event ${i}: expected seq=${i + 1}, got seq=${ev.seq}`,
      };
    }

    // 2. prevHash linkage.
    if (ev.prevHash !== prevHash) {
      return {
        valid: false,
        firstBrokenIndex: i,
        reason: `event ${i}: prevHash does not chain to previous event's hash`,
      };
    }

    // 3. Recompute hash.
    let recomputed: string;
    try {
      recomputed = computeEventHash({
        id: ev.id,
        seq: ev.seq,
        type: ev.type,
        actor: ev.actor,
        payload: ev.payload,
        timestamp: ev.timestamp,
        prevHash: ev.prevHash,
      });
    } catch (err) {
      return {
        valid: false,
        firstBrokenIndex: i,
        reason: `event ${i}: cannot recompute hash: ${(err as Error).message}`,
      };
    }
    if (recomputed !== ev.hash) {
      return {
        valid: false,
        firstBrokenIndex: i,
        reason: `event ${i}: hash mismatch (stored=${ev.hash}, recomputed=${recomputed})`,
      };
    }

    // 4. Timestamp monotonicity.
    if (checkTimestamps) {
      let ts: number;
      try {
        ts = Date.parse(ev.timestamp);
      } catch {
        ts = NaN;
      }
      if (Number.isNaN(ts)) {
        return {
          valid: false,
          firstBrokenIndex: i,
          reason: `event ${i}: timestamp is not a valid ISO-8601 string`,
        };
      }
      if (prevTs !== undefined && ts < prevTs) {
        return {
          valid: false,
          firstBrokenIndex: i,
          reason: `event ${i}: timestamp ${ev.timestamp} is before previous event's timestamp`,
        };
      }
      prevTs = ts;
    }

    // 5. Signature verification.
    if (requireSignatures && !ev.signature) {
      return {
        valid: false,
        firstBrokenIndex: i,
        reason: `event ${i}: signature required but missing`,
      };
    }
    if (publicKeys && ev.actor in publicKeys) {
      const pub = publicKeys[ev.actor];
      if (ev.signature) {
        let ok: boolean;
        try {
          ok = verifyEventSignature(ev, pub as crypto.KeyObject | string, false);
        } catch (err) {
          return {
            valid: false,
            firstBrokenIndex: i,
            reason: `event ${i}: signature verification threw: ${(err as Error).message}`,
          };
        }
        if (!ok) {
          return {
            valid: false,
            firstBrokenIndex: i,
            reason: `event ${i}: signature does not verify against actor's public key`,
          };
        }
      } else if (requireSignatures) {
        return {
          valid: false,
          firstBrokenIndex: i,
          reason: `event ${i}: signature required but missing`,
        };
      }
    } else if (requireSignatures && !publicKeys) {
      // requireSignatures is true but no publicKeys map supplied; we already
      // checked the presence of a signature above, so just continue.
    }

    prevHash = ev.hash;
  }

  return { valid: true };
}
