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
import type { SignatureAlgorithm, TimestampToken } from '../types.js';
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
export declare class LocalTimestampAuthority implements TimestampAuthority {
    private readonly privateKey;
    private readonly publicKey;
    private readonly algorithm;
    private readonly keyId;
    constructor(opts?: LocalTimestampAuthorityOptions);
    /** @inheritdoc */
    issue(commitment: Buffer | string): TimestampToken;
    /** @inheritdoc */
    getPublicKey(): crypto.KeyObject;
    /** @inheritdoc */
    getKeyId(): string;
    /** @inheritdoc */
    getAlgorithm(): SignatureAlgorithm;
}
/** Format version of {@link TimestampToken}s produced by this package. */
export declare const TIMESTAMP_TOKEN_VERSION = 1;
/**
 * Canonical bytes for a {@link TimestampToken}. Used by both
 * {@link LocalTimestampAuthority.issue} (signing) and {@link verifyTimestamp}
 * (verifying) to ensure both sides hash exactly the same bytes.
 *
 * @internal exported for tests.
 */
export declare function canonicalTimestampBytes(token: {
    version: number;
    commitment: string;
    issuedAt: string;
    authorityKeyId: string;
}): Buffer;
//# sourceMappingURL=authority.d.ts.map