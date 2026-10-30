/**
 * @manya-os/attest — remote barrel export.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

export {
  ATTESTATION_QUOTE_VERSION,
  serializeQuote,
  deserializeQuote,
  validateQuote,
  stableStringify,
} from './quote.js';
export {
  produceAttestation,
  verifyAttestation,
  produceAndSerializeAttestation,
  deserializeAndVerifyAttestation,
  DEFAULT_ATTESTATION_FRESHNESS_MS,
} from './attestation.js';
