/**
 * @manya-os/attest — attestation quote format + (de)serialization.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { AttestationQuote } from '../types.js';
/** Current attestation quote format version. */
export declare const ATTESTATION_QUOTE_VERSION = 1;
/**
 * Validate the shape of an {@link AttestationQuote}. Throws {@link AttestationError}
 * on any structural problem; returns silently on success.
 *
 * @param quote - The quote to validate.
 */
export declare function validateQuote(quote: unknown): asserts quote is AttestationQuote;
/**
 * Serialize an {@link AttestationQuote} to a UTF-8 buffer of stable JSON.
 *
 * Stable JSON means: object keys sorted lexicographically, no insignificant
 * whitespace. This makes the serialized form canonical and reproducible.
 *
 * @param quote - The quote to serialize.
 * @returns UTF-8 buffer of stable JSON.
 */
export declare function serializeQuote(quote: AttestationQuote): Buffer;
/**
 * Deserialize an {@link AttestationQuote} from a UTF-8 buffer of stable JSON.
 *
 * @param buf - UTF-8 buffer (e.g. produced by {@link serializeQuote}).
 * @returns The parsed quote.
 */
export declare function deserializeQuote(buf: Buffer | string): AttestationQuote;
/**
 * Stable JSON stringify with sorted keys. Identical to the canonicalization
 * used by the signature path — quotes serialize the same way they sign.
 *
 * @internal
 */
export declare function stableStringify(value: unknown): string;
//# sourceMappingURL=quote.d.ts.map