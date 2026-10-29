/**
 * @manya-os/ledger — shared type definitions.
 *
 * These types are part of the public API surface and must remain stable across
 * minor versions. Internal-only types live alongside their owning modules.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

import type * as crypto from 'crypto';

/**
 * Free-form payload attached to a ledger event. Must be JSON-serializable.
 *
 * Top-level keys must be stable (the canonical-serialization step sorts keys
 * deterministically, but the payload MUST round-trip through JSON).
 */
export type EventPayload = Record<string, unknown>;

/**
 * Free-form metadata attached to a ledger event. Must be JSON-serializable.
 *
 * Unlike {@link EventPayload} (the semantic content of the event), `metadata`
 * carries auxiliary bookkeeping (correlation ids, trace ids, source ip, etc.)
 * that does not contribute to the event's identity but should travel with it.
 */
export type EventMetadata = Record<string, unknown>;

/**
 * A single immutable entry in the audit ledger.
 *
 * `hash` is computed over the canonical serialization of
 * `{ id, seq, type, actor, payload, timestamp, prevHash }` (metadata and the
 * signature itself are deliberately excluded so the hash is stable regardless
 * of when the event is signed).
 */
export interface LedgerEvent {
  /** Stable unique event identifier (UUID v4 by default). */
  id: string;
  /** 1-based sequence number within the chain. */
  seq: number;
  /** Event type (e.g. `'user.created'`, `'config.updated'`). */
  type: string;
  /** Free-form identity of the actor that produced the event. */
  actor: string;
  /** Event payload (JSON-serializable). */
  payload: EventPayload;
  /** ISO-8601 timestamp (millisecond precision). */
  timestamp: string;
  /** Hex SHA-256 of the previous event's `hash` (zero hex for the genesis event). */
  prevHash: string;
  /** Hex SHA-256 of the canonical serialization of this event's signing fields. */
  hash: string;
  /** Optional hex-encoded signature over the event hash. */
  signature?: string;
  /** Optional signature algorithm. Inferred from the signing key when omitted. */
  signatureAlgorithm?: SignatureAlgorithm;
  /** Optional auxiliary metadata (does NOT contribute to `hash`). */
  metadata?: EventMetadata;
}

/**
 * Signature algorithm. Mirrors the algorithms supported by the local crypto
 * module: ECDSA over NIST P-256 (default) and RSA-PSS with SHA-256.
 */
export type SignatureAlgorithm = 'ecdsa-p256' | 'rsa-pss';

/**
 * Key algorithm for {@link generateKeyPair}. `ecdsa` (NIST P-256) is the
 * default and recommended for new ledgers because of its compact signatures.
 */
export type KeyAlgorithm = 'ecdsa' | 'rsa';

/**
 * Options accepted by {@link createEvent}.
 */
export interface CreateEventOptions {
  /** Explicit event id. Defaults to a fresh UUID v4. */
  id?: string;
  /** Event type (required). */
  type: string;
  /** Actor (required). */
  actor: string;
  /** Event payload (required, JSON-serializable). */
  payload: EventPayload;
  /** ISO-8601 timestamp. Defaults to `new Date().toISOString()`. */
  timestamp?: string;
  /** Hex hash of the previous event. Defaults to all-zeros (genesis). */
  prevHash?: string;
  /** Sequence number. Defaults to 1 (callers usually pass `chain.length() + 1`). */
  seq?: number;
  /** Optional metadata (does NOT contribute to `hash`). */
  metadata?: EventMetadata;
}

/**
 * Verification result returned by {@link verifyChain}.
 */
export interface ChainVerification {
  /** Whether the chain is fully valid. */
  valid: boolean;
  /** Index of the first broken event, if any. */
  firstBrokenIndex?: number;
  /** Human-readable reason for the failure. */
  reason?: string;
}

/**
 * Options for {@link verifyChain}.
 */
export interface VerifyChainOptions {
  /**
   * Optional map of `actor → publicKey` (KeyObject or PEM string) used to
   * verify event signatures. If provided, every signed event MUST verify;
   * unsigned events are skipped (set {@link requireSignatures} to reject them).
   */
  publicKeys?: Record<string, crypto.KeyObject | string>;
  /** Whether every event MUST be signed. Defaults to `false`. */
  requireSignatures?: boolean;
  /** Whether timestamps MUST be monotonically non-decreasing. Defaults to `true`. */
  checkTimestamps?: boolean;
  /** Whether sequence numbers MUST be contiguous (1, 2, 3, ...). Defaults to `true`. */
  checkSeqContiguity?: boolean;
}

/**
 * A single step in a Merkle inclusion proof.
 */
export interface MerkleProofStep {
  /** Sibling hash. */
  hash: Buffer;
  /** Whether the sibling is on the left (`0`) or right (`1`) of the path. */
  side: 'left' | 'right';
}

/**
 * Merkle inclusion proof for a leaf.
 */
export interface MerkleProof {
  /** The leaf index the proof is for. */
  index: number;
  /** Sibling hashes from the leaf level up to (but not including) the root. */
  siblings: MerkleProofStep[];
}

/**
 * Commitment produced by {@link commit} and revealed by {@link reveal}.
 */
export interface Commitment {
  /** SHA-256(value || nonce). */
  commitment: Buffer;
  /** Random 32-byte nonce. */
  nonce: Buffer;
}

/**
 * A signed timestamp token issued by a {@link TimestampAuthority}.
 */
export interface TimestampToken {
  /** Token format version. */
  version: number;
  /** Hex-encoded commitment being timestamped. */
  commitment: string;
  /** ISO-8601 issuance timestamp. */
  issuedAt: string;
  /** Hex-encoded signature over the canonical token bytes. */
  signature: string;
  /** Signature algorithm used by the authority. */
  algorithm: SignatureAlgorithm;
  /** Hex SHA-256 fingerprint of the authority's public key. */
  authorityKeyId: string;
}

/** Re-export to keep `crypto` types accessible to consumers. */
export type { KeyObject } from 'crypto';

// ----- collaboration attribution types -----

/**
 * Payload for a collaboration attribution event.
 * Recorded in the ledger when instances collaborate, providing full
 * provenance for every data exchange.
 */
export interface CollaborationAttributionPayload {
  /** The type of collaboration. */
  collaborationType: 'sync' | 'query' | 'grant' | 'handshake';
  /** Source instance id. */
  sourceInstanceId: string;
  /** Target instance id. */
  targetInstanceId: string;
  /** Capability grant id used for this collaboration, if any. */
  grantId?: string;
  /** Number of records exchanged. */
  recordCount: number;
  /** Types of records exchanged. */
  recordTypes: string[];
  /** Epoch ms when the collaboration started. */
  startedAt: number;
  /** Epoch ms when the collaboration completed. */
  completedAt: number;
  /** Whether the collaboration succeeded. */
  success: boolean;
  /** Error message if the collaboration failed. */
  error?: string;
  /** Arbitrary metadata about the collaboration. */
  metadata?: Record<string, unknown>;
}
