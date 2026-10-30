/**
 * @manya-os/ledger — canonical serialization for hashing.
 *
 * Produces a deterministic JSON encoding with sorted keys and no whitespace.
 * Used to compute the SHA-256 hash of a ledger event — the result MUST be
 * byte-identical across runs, runtimes, and locales.
 *
 * Rules:
 *   1. Object keys are sorted lexicographically (by UTF-16 code unit).
 *   2. No whitespace between tokens.
 *   3. Strings are JSON-escaped (the standard JSON.stringify behavior).
 *   4. `undefined` values are omitted. `null` is preserved.
 *   5. Buffers / Uint8Arrays are encoded as `{ "@buffer": "<hex>" }` so they
 *      round-trip deterministically (this is mainly for the internal hash
 *      computation; payloads SHOULD be plain JSON).
 *   6. Numbers preserve their canonical JSON representation. `NaN` / `Infinity`
 *      are rejected (they are not valid JSON).
 *   7. Cycles are detected and rejected.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
/**
 * Canonicalize an arbitrary JSON-serializable value into a deterministic
 * UTF-8 Buffer.
 *
 * @param value - JSON-serializable value.
 * @returns UTF-8-encoded canonical JSON.
 * @throws {@link LedgerError} on cycles, `NaN`/`Infinity`, or unsupported types.
 */
export declare function canonicalSerialize(value: unknown): Buffer;
/**
 * Canonicalize to a string (mostly useful for tests).
 */
export declare function canonicalSerializeToString(value: unknown): string;
//# sourceMappingURL=codec.d.ts.map