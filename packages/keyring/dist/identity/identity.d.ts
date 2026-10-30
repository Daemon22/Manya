/**
 * @manya-os/keyring — Identity (sovereign, did:key-style).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import * as crypto from 'crypto';
import type { SerializedIdentity, SignatureAlgorithm } from '../types.js';
/**
 * Encode bytes as base58 (Bitcoin alphabet).
 * @internal
 */
export declare function base58Encode(input: Buffer): string;
/**
 * Derive a did:key-style DID from a public key + algorithm.
 *
 * The format is `did:key:z<base58(algo-prefix || key-material)>` where:
 * - `algo-prefix` is `0x85 0x1a` (custom marker for RSA-PSS) followed by
 *   `sha256(spki-der)`, OR `0x12 0x00` (multicodec secp256r1-pub) followed
 *   by the raw P-256 point bytes.
 *
 * The `z` prefix follows the multibase spec for base58btc. This is a
 * deterministic, stable derivation: the same key always produces the same DID.
 *
 * @param publicKey - Public KeyObject or PEM string.
 * @param algorithm - Signature algorithm.
 */
export declare function deriveDidKey(publicKey: crypto.KeyObject | string, algorithm: SignatureAlgorithm): string;
/**
 * A sovereign identity. Holds the *public* form of a keypair — never the
 * private key. The associated private key is held by a
 * {@link HardwareKeyProvider} and addressed by key id (see
 * {@link KeyringWallet}).
 */
export declare class Identity {
    /** UUID v4. */
    readonly id: string;
    /** did:key-style DID derived from the public key. */
    readonly did: string;
    /** SPKI PEM-encoded public key. */
    readonly publicKey: string;
    /** Signature algorithm. */
    readonly algorithm: SignatureAlgorithm;
    /** ISO-8601 creation timestamp. */
    readonly createdAt: string;
    /** Free-form public metadata (e.g. agent name, profile URL). */
    metadata: Record<string, unknown>;
    constructor(params: {
        id?: string;
        did: string;
        publicKey: string;
        algorithm: SignatureAlgorithm;
        createdAt?: string;
        metadata?: Record<string, unknown>;
    });
    /**
     * Construct an {@link Identity} from a PEM-encoded public key + algorithm.
     */
    static fromPublicKey(publicKeyPem: string, algorithm: SignatureAlgorithm, metadata?: Record<string, unknown>): Identity;
    /** Short hex fingerprint of the public key (SHA-256 of DER). */
    fingerprint(): string;
    /** Serialize to a plain object suitable for JSON. */
    serialize(): SerializedIdentity;
    /** Deserialize from a plain object. */
    static deserialize(data: SerializedIdentity): Identity;
    /** Equality by DID. */
    equals(other: Identity): boolean;
}
//# sourceMappingURL=identity.d.ts.map