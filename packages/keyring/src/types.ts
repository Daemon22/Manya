/**
 * @manya-os/keyring — shared type definitions.
 *
 * These types are part of the public API surface and must remain stable across
 * minor versions. Internal-only types live alongside their owning modules.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type * as crypto from 'crypto';

/**
 * Supported key algorithms. `rsa` produces 3072-bit RSA-PSS keys;
 * `ecdsa` produces ECDSA keys over the NIST P-256 curve.
 */
export type KeyAlgorithm = 'rsa' | 'ecdsa';

/**
 * Supported signature algorithms. Maps 1:1 to {@link KeyAlgorithm}.
 * - `rsa-pss` — RSA-PSS with SHA-256 and salt length equal to the digest.
 * - `ecdsa-p256` — ECDSA over NIST P-256 with SHA-256.
 */
export type SignatureAlgorithm = 'rsa-pss' | 'ecdsa-p256';

/**
 * Result of an AES-256-GCM encryption operation. The IV is fresh per call,
 * 96 bits long, and must be transmitted alongside the ciphertext and tag.
 */
export interface EncryptionResult {
  /** 12-byte random initialization vector. */
  iv: Buffer;
  /** Ciphertext (same length as plaintext). */
  ciphertext: Buffer;
  /** 16-byte GCM authentication tag. */
  tag: Buffer;
}

/**
 * A serialized public identity. This form is safe to share across devices,
 * store in sync bundles, and emit in audit logs. Private keys never appear
 * here.
 */
export interface SerializedIdentity {
  /** UUID v4 identifier. */
  id: string;
  /** did:key-style DID derived from the public key. */
  did: string;
  /** SPKI-encoded public key in PEM format. */
  publicKey: string;
  /** Signature algorithm used by this identity. */
  algorithm: SignatureAlgorithm;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** Free-form public metadata. */
  metadata: Record<string, unknown>;
}

/**
 * Public-proof portion of a {@link VerifiableCredential}.
 */
export interface CredentialProof {
  /** Proof type, e.g. `manya:ecdsa-p256:2024`. */
  type: string;
  /** ISO-8601 timestamp when the proof was created. */
  created: string;
  /** DID of the verification method (the issuer's did:key). */
  verificationMethod: string;
  /** Hex-encoded signature over the canonical credential bytes. */
  proofValue: string;
  /** Signature algorithm used. */
  algorithm: SignatureAlgorithm;
}

/**
 * A verifiable credential following a W3C-style shape.
 */
export interface VerifiableCredential {
  /** UUID v4 identifier. */
  id: string;
  /** DID of the issuer. */
  issuer: string;
  /** DID of the subject. */
  subject: string;
  /** Arbitrary claims asserted by the issuer about the subject. */
  claims: Record<string, unknown>;
  /** ISO-8601 issuance timestamp. */
  issuedAt: string;
  /** Optional ISO-8601 expiry timestamp. */
  expiresAt?: string;
  /** Cryptographic proof over the credential (excluding `proof`). */
  proof: CredentialProof;
}

/**
 * Encrypted backup blob. Suitable for JSON serialization. The salt, IV, and
 * tag are all base64-encoded.
 */
export interface EncryptedBackup {
  /** Backup format version. */
  version: number;
  /** Base64-encoded PBKDF2 salt. */
  salt: string;
  /** Base64-encoded AES-256-GCM IV. */
  iv: string;
  /** Base64-encoded AES-256-GCM ciphertext. */
  ciphertext: string;
  /** Base64-encoded AES-256-GCM auth tag. */
  tag: string;
  /** ISO-8601 timestamp when the backup was created. */
  createdAt: string;
  /** PBKDF2 iteration count used to derive the encryption key. */
  iterations: number;
}

/**
 * Encrypted wallet blob produced by {@link KeyringWallet.exportEncrypted}.
 * Same shape as {@link EncryptedBackup} but semantically distinct — a wallet
 * export includes identity + credential state plus the encrypted private key.
 */
export interface EncryptedWalletBlob extends EncryptedBackup {
  /** Marker indicating this is a wallet export. */
  kind: 'manya-keyring-wallet';
}

/**
 * A signed sync bundle transmitted between devices.
 */
export interface SyncBundle {
  /** Bundle format version. */
  version: number;
  /** DID of the source device's identity. */
  sourceDid: string;
  /** ISO-8601 bundle creation timestamp. */
  timestamp: string;
  /** Monotonically-increasing sequence number. */
  sequence: number;
  /** Public identity of the source device. */
  identity: SerializedIdentity;
  /** Credentials known to the source device at bundle creation time. */
  credentials: VerifiableCredential[];
  /** Cryptographic proof (signature) over the canonical bundle bytes. */
  proof: {
    type: string;
    algorithm: SignatureAlgorithm;
    value: string;
  };
}

/**
 * Result of applying a sync bundle to a target wallet.
 */
export interface SyncApplyResult {
  /** Credential IDs that were newly added or updated. */
  applied: string[];
  /** Credential IDs where the incoming bundle conflicts with local state. */
  conflicts: string[];
  /** Credential IDs that were skipped because local state was newer. */
  skipped: string[];
}

/**
 * Result of an access-enforcement check.
 */
export interface EnforcementResult {
  /** Whether the action is allowed. */
  allowed: boolean;
  /** Human-readable reason for the decision. */
  reason: string;
  /** Matched policy resource, if any. */
  resource?: string;
  /** Matched policy action, if any. */
  action?: string;
  /** Whether the decision was influenced by a capability grant. */
  grantUsed?: string;
}

// ----- capability grants -----

/**
 * A scoped, time-boxed capability grant. Grants allow a specific subject
 * to perform a specific action on a specific resource for a limited time.
 * Grants are the ONLY mechanism for cross-instance capability delegation.
 */
export interface CapabilityGrant {
  /** Unique grant id (UUID v4). */
  id: string;
  /** DID of the authority that issued this grant. */
  grantor: string;
  /** DID of the subject receiving the grant. */
  grantee: string;
  /** Resource pattern the grant covers (supports wildcards). */
  resource: string;
  /** Actions the grant covers. */
  actions: string[];
  /** ISO-8601 timestamp when the grant becomes active. */
  validFrom: string;
  /** ISO-8601 timestamp when the grant expires. */
  validUntil: string;
  /** Optional maximum number of times this grant can be used. */
  maxUses?: number;
  /** Number of times this grant has been used so far. */
  useCount: number;
  /** Whether this grant has been revoked. */
  revoked: boolean;
  /** ISO-8601 timestamp when the grant was revoked, if applicable. */
  revokedAt?: string;
  /** Optional metadata about why the grant was issued. */
  metadata?: Record<string, unknown>;
}

/**
 * A record of a grant revocation event.
 */
export interface GrantRevocation {
  /** The grant id that was revoked. */
  grantId: string;
  /** ISO-8601 timestamp when the revocation occurred. */
  revokedAt: string;
  /** DID of the party that revoked the grant. */
  revokedBy: string;
  /** Reason for the revocation. */
  reason?: string;
}

/**
 * Optional constructor options for {@link KeyringWallet}.
 */
export interface KeyringWalletOptions {
  /** Persistent storage backend. If omitted, an in-memory store is used. */
  storage?: import('./wallet/storage.js').EncryptedStorage;
  /** Hardware (or software-fallback) key provider. Defaults to {@link SoftwareKeyProvider}. */
  hardwareProvider?: import('./hardware/provider.js').HardwareKeyProvider;
  /** Structured logger. Defaults to a silent {@link ConsoleLogger}. */
  logger?: import('./logging.js').Logger;
}

/**
 * Internal record associating a public {@link Identity} with its hardware key
 * id and signature algorithm. Not exported publicly.
 */
export interface WalletIdentityRecord {
  identity: import('./identity/identity.js').Identity;
  keyId: string;
  algorithm: SignatureAlgorithm;
}

/** Opaque key handle returned by {@link import('./crypto/keys.js').generateKeyPair}. */
export interface GeneratedKeyMaterial {
  publicKey: crypto.KeyObject;
  privateKey: crypto.KeyObject;
  algorithm: SignatureAlgorithm;
}

/** Re-export to keep `crypto` types accessible to consumers. */
export type { KeyObject } from 'crypto';
