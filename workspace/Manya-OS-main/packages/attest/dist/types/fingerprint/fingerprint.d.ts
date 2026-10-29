/**
 * @manya-os/attest — device fingerprint.
 *
 * A `DeviceFingerprint` is a stable SHA-256 hash over a canonical
 * representation of {@link DeviceSignals}. Two fingerprints can be compared
 * for exact match and for a "drift" score that quantifies how dissimilar the
 * underlying signals are (useful for detecting partial hardware changes).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { DeviceSignals, FingerprintComparison } from '../types.js';
/**
 * A stable device fingerprint.
 *
 * Construct with {@link DeviceFingerprint.fromSignals} or
 * {@link DeviceFingerprint.fromString}. The fingerprint is a 64-character hex
 * SHA-256 over the canonical JSON of {@link DeviceSignals}.
 */
export declare class DeviceFingerprint {
    /** 64-character hex SHA-256. */
    private readonly hash;
    /** Per-field hex hashes used for drift scoring. */
    private readonly perField;
    private constructor();
    /**
     * Build a fingerprint from collected device signals.
     * @param signals - The raw device signals.
     */
    static fromSignals(signals: DeviceSignals): DeviceFingerprint;
    /**
     * Build a fingerprint from an existing 64-character hex string (e.g. one
     * loaded from storage or transmitted over the wire).
     *
     * The returned fingerprint has NO per-field data, so {@link compare} will
     * fall back to all-or-nothing matching (drift = 0 on match, 1 otherwise).
     *
     * @param hash - 64-character hex string.
     */
    static fromString(hash: string): DeviceFingerprint;
    /**
     * Return the 64-character hex hash. Same as implicit stringification.
     */
    toString(): string;
    /**
     * Compare this fingerprint to another.
     *
     * Returns `{ match, drift }` where:
     * - `match` is `true` iff the two hashes are byte-equal (constant-time).
     * - `drift` is the fraction of per-field hashes that differ, in `[0, 1]`.
     *   When per-field data is unavailable (e.g. one side was loaded via
     *   {@link fromString}), drift is `0` on match and `1` otherwise.
     *
     * Comparison uses `crypto.timingSafeEqual` to avoid early-exit leaks.
     *
     * @param other - The fingerprint to compare against.
     */
    compare(other: DeviceFingerprint): FingerprintComparison;
    /**
     * Return `true` iff `other` is byte-equal to this fingerprint (constant-time).
     */
    equals(other: DeviceFingerprint): boolean;
    /**
     * Return the underlying hex hash. Useful for storage / serialization.
     */
    valueOf(): string;
}
//# sourceMappingURL=fingerprint.d.ts.map