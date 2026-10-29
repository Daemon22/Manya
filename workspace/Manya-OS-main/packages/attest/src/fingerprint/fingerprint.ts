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

import * as crypto from 'crypto';
import type { DeviceSignals, FingerprintComparison } from '../types.js';
import { FingerprintError } from '../errors.js';
import { sha256 } from '../crypto/hashing.js';
import { stableStringify } from './collector.js';

/**
 * The fields of {@link DeviceSignals} that contribute to the fingerprint hash
 * and to drift scoring. Order matters only for canonicalization.
 *
 * `machineId` is included when present.
 */
const FINGERPRINT_FIELDS = [
  'cpus',
  'arch',
  'platform',
  'hostname',
  'macs',
  'totalmem',
  'nodeVersion',
  'release',
  'machineId',
] as const;

/**
 * A stable device fingerprint.
 *
 * Construct with {@link DeviceFingerprint.fromSignals} or
 * {@link DeviceFingerprint.fromString}. The fingerprint is a 64-character hex
 * SHA-256 over the canonical JSON of {@link DeviceSignals}.
 */
export class DeviceFingerprint {
  /** 64-character hex SHA-256. */
  private readonly hash: string;
  /** Per-field hex hashes used for drift scoring. */
  private readonly perField: Record<string, string>;

  private constructor(hash: string, perField: Record<string, string>) {
    this.hash = hash;
    this.perField = perField;
  }

  /**
   * Build a fingerprint from collected device signals.
   * @param signals - The raw device signals.
   */
  static fromSignals(signals: DeviceSignals): DeviceFingerprint {
    if (!signals || typeof signals !== 'object') {
      throw new FingerprintError('fromSignals: signals must be a DeviceSignals object');
    }
    // Per-field hashes (used for drift scoring).
    const perField: Record<string, string> = {};
    const signalsRecord = signals as unknown as Record<string, unknown>;
    for (const field of FINGERPRINT_FIELDS) {
      const value = signalsRecord[field];
      if (value === undefined) continue;
      perField[field] = sha256(stableStringify(value)).toString('hex');
    }
    // The canonical form is a stable JSON of the signals, sorted by key.
    const canonical = stableStringify(signals);
    const hash = sha256(canonical).toString('hex');
    return new DeviceFingerprint(hash, perField);
  }

  /**
   * Build a fingerprint from an existing 64-character hex string (e.g. one
   * loaded from storage or transmitted over the wire).
   *
   * The returned fingerprint has NO per-field data, so {@link compare} will
   * fall back to all-or-nothing matching (drift = 0 on match, 1 otherwise).
   *
   * @param hash - 64-character hex string.
   */
  static fromString(hash: string): DeviceFingerprint {
    if (typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash)) {
      throw new FingerprintError(
        'fromString: expected 64-character hex string, got: ' + typeof hash
      );
    }
    return new DeviceFingerprint(hash, {});
  }

  /**
   * Return the 64-character hex hash. Same as implicit stringification.
   */
  toString(): string {
    return this.hash;
  }

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
  compare(other: DeviceFingerprint): FingerprintComparison {
    const a = Buffer.from(this.hash, 'hex');
    const b = Buffer.from(other.hash, 'hex');
    const match = a.length === b.length && safeEqual(a, b);

    // Drift scoring: fraction of per-field hashes that differ.
    const myFields = Object.keys(this.perField);
    const otherFields = Object.keys(other.perField);
    if (myFields.length === 0 || otherFields.length === 0) {
      // No per-field data — fall back to all-or-nothing.
      return { match, drift: match ? 0 : 1 };
    }
    const allFields = Array.from(new Set([...myFields, ...otherFields]));
    if (allFields.length === 0) {
      return { match, drift: match ? 0 : 1 };
    }
    let differing = 0;
    for (const field of allFields) {
      const mine = this.perField[field];
      const theirs = other.perField[field];
      if (!mine || !theirs) {
        // Field only present on one side — counts as differing.
        differing++;
        continue;
      }
      const ma = Buffer.from(mine, 'hex');
      const mb = Buffer.from(theirs, 'hex');
      if (!safeEqual(ma, mb)) differing++;
    }
    const drift = differing / allFields.length;
    return { match, drift };
  }

  /**
   * Return `true` iff `other` is byte-equal to this fingerprint (constant-time).
   */
  equals(other: DeviceFingerprint): boolean {
    return this.compare(other).match;
  }

  /**
   * Return the underlying hex hash. Useful for storage / serialization.
   */
  valueOf(): string {
    return this.hash;
  }
}

/**
 * Constant-time Buffer compare. Returns false if lengths differ.
 * @internal
 */
function safeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
