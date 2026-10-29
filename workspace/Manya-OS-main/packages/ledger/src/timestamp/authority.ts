/**
 * @manya-os/ledger — timestamp authority interface + local implementation.
 *
 * A {@link TimestampAuthority} signs {@link TimestampToken}s over arbitrary
 * commitments. {@link LocalTimestampAuthority} uses a locally-generated
 * ECDSA P-256 (or RSA-PSS) keypair.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

import type * as crypto from 'crypto';
import { TimestampError } from '../errors.js';
import type { SignatureAlgorithm, TimestampToken } from '../types.js';
import { getKeyId, sign, generateKeyPair } from '../crypto/keys.js';

/**
 * A timestamp authority issues signed {@link TimestampToken}s over
 * commitments. The interface is deliberately minimal so that callers can
 * plug in an RFC 3161 TSA, a remote signing service, or a local keypair.
 */
export interface TimestampAuthority {
  /** Issue a signed timestamp token over `commitment`. */
  issue(commitment: Buffer | string): TimestampToken;
  /** Public key used to verify tokens issued by this authority. */
  getPublicKey(): crypto.KeyObject;
  /** Key id (hex SHA-256 of the SPKI DER). */
  getKeyId(): string;
  /** Signature algorithm used by this authority. */
  getAlgorithm(): SignatureAlgorithm;
}

/** Options for {@link LocalTimestampAuthority}. */
export interface LocalTimestampAuthorityOptions {
  /**
   * Pre-existing keypair (e.g. restored from storage). If omitted, a fresh
   * ECDSA P-256 keypair is generated.
   */
  keypair?: {
    publicKey: crypto.KeyObject;
    privateKey: crypto.KeyObject;
    algorithm: SignatureAlgorithm;
  };
}

/**
 * A {@link TimestampAuthority} backed by a local keypair.
 *
 * Suitable for development, single-node deployments, and tests. For
 * production multi-node deployments, implement {@link TimestampAuthority}
 * against a remote TSA (RFC 3161) or an HSM-backed signer.
 */
export class LocalTimestampAuthority implements TimestampAuthority {
  private readonly privateKey: crypto.KeyObject;
  private readonly publicKey: crypto.KeyObject;
  private readonly algorithm: SignatureAlgorithm;
  private readonly keyId: string;

  constructor(opts: LocalTimestampAuthorityOptions = {}) {
    if (opts.keypair) {
      this.privateKey = opts.keypair.privateKey;
      this.publicKey = opts.keypair.publicKey;
      this.algorithm = opts.keypair.algorithm;
    } else {
      const kp = generateKeyPair('ecdsa');
      this.privateKey = kp.privateKey;
      this.publicKey = kp.publicKey;
      this.algorithm = kp.algorithm;
    }
    try {
      this.keyId = getKeyId(this.publicKey);
    } catch (err) {
      throw new TimestampError(
        'LocalTimestampAuthority: cannot compute key id: ' + (err as Error).message,
        err
      );
    }
  }

  /** @inheritdoc */
  issue(commitment: Buffer | string): TimestampToken {
    if (Buffer.isBuffer(commitment)) {
      if (commitment.length === 0) {
        throw new TimestampError('issue: commitment must be non-empty');
      }
    } else if (typeof commitment === 'string') {
      if (commitment.length === 0) {
        throw new TimestampError('issue: commitment must be non-empty');
      }
    } else {
      throw new TimestampError('issue: commitment must be a Buffer or hex string');
    }
    const commitmentHex = Buffer.isBuffer(commitment)
      ? commitment.toString('hex')
      : commitment;
    const issuedAt = new Date().toISOString();
    // Canonical signed bytes: version || commitmentHex || issuedAt || keyId.
    const canonical = Buffer.from(
      `${TIMESTAMP_TOKEN_VERSION}|${commitmentHex}|${issuedAt}|${this.keyId}`,
      'utf8'
    );
    let signature: string;
    try {
      signature = sign(this.privateKey, canonical, this.algorithm);
    } catch (err) {
      throw new TimestampError(
        'issue: signing failed: ' + (err as Error).message,
        err
      );
    }
    return {
      version: TIMESTAMP_TOKEN_VERSION,
      commitment: commitmentHex,
      issuedAt,
      signature,
      algorithm: this.algorithm,
      authorityKeyId: this.keyId,
    };
  }

  /** @inheritdoc */
  getPublicKey(): crypto.KeyObject {
    return this.publicKey;
  }

  /** @inheritdoc */
  getKeyId(): string {
    return this.keyId;
  }

  /** @inheritdoc */
  getAlgorithm(): SignatureAlgorithm {
    return this.algorithm;
  }
}

/** Format version of {@link TimestampToken}s produced by this package. */
export const TIMESTAMP_TOKEN_VERSION = 1;

/**
 * Canonical bytes for a {@link TimestampToken}. Used by both
 * {@link LocalTimestampAuthority.issue} (signing) and {@link verifyTimestamp}
 * (verifying) to ensure both sides hash exactly the same bytes.
 *
 * @internal exported for tests.
 */
export function canonicalTimestampBytes(token: {
  version: number;
  commitment: string;
  issuedAt: string;
  authorityKeyId: string;
}): Buffer {
  return Buffer.from(
    `${token.version}|${token.commitment}|${token.issuedAt}|${token.authorityKeyId}`,
    'utf8'
  );
}
