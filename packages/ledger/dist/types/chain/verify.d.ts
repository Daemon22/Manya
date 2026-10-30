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
import type { ChainVerification, LedgerEvent, VerifyChainOptions } from '../types.js';
/**
 * Verify the cryptographic integrity of a chain of events.
 *
 * @param events - Events to verify (in chain order).
 * @param opts - Verification options.
 * @returns A {@link ChainVerification} describing the first broken event
 *          (if any) and the reason.
 */
export declare function verifyChain(events: LedgerEvent[], opts?: VerifyChainOptions): ChainVerification;
//# sourceMappingURL=verify.d.ts.map