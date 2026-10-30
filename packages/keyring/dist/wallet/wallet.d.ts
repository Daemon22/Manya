/**
 * @manya-os/keyring — KeyringWallet, the high-level wallet facade.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import * as crypto from 'crypto';
import { deriveKey } from '../crypto/keys.js';
import { constantTimeEqual } from '../crypto/hashing.js';
import { Identity } from '../identity/identity.js';
import { Role, RoleManager } from '../identity/roles.js';
import { AccessPolicySet, AccessEnforcer } from '../access/index.js';
import { validateCredential } from './credentials.js';
import type { VerifiableCredential } from '../types.js';
import type { KeyAlgorithm, SignatureAlgorithm, EncryptedWalletBlob, KeyringWalletOptions } from '../types.js';
/** PBKDF2 iteration count for wallet passphrase → master key. */
export declare const WALLET_PBKDF2_ITERATIONS = 210000;
/** PBKDF2 salt length. */
export declare const WALLET_SALT_BYTES = 16;
/** Master key length (AES-256). */
export declare const WALLET_MASTER_KEY_BYTES = 32;
/**
 * The sovereign identity and credential wallet.
 *
 * Holds:
 * - A set of {@link Identity} records (public form) paired with hardware key
 *   ids. The actual private key material lives in the {@link HardwareKeyProvider}.
 * - A set of {@link VerifiableCredential} records.
 * - A {@link RoleManager} and {@link AccessEnforcer} for RBAC.
 *
 * All sensitive operations (sign, exportEncrypted, etc.) can be gated by the
 * enforcer by passing an `actorIdentityId` argument.
 */
export declare class KeyringWallet {
    private readonly storage;
    private readonly hardwareProvider;
    private readonly logger;
    private readonly identities;
    private readonly credentials;
    private primaryIdentityId;
    private sequence;
    readonly roles: RoleManager;
    readonly policies: AccessPolicySet;
    readonly access: AccessEnforcer;
    constructor(opts?: KeyringWalletOptions);
    /**
     * Create a new identity and register it as the primary identity if no
     * other primary exists.
     *
     * @param algo - `'rsa'` (RSA-PSS 3072) or `'ecdsa'` (P-256).
     * @param metadata - Optional public metadata.
     * @returns The new Identity (public form).
     */
    createIdentity(algo?: KeyAlgorithm, metadata?: Record<string, unknown>): Promise<Identity>;
    /**
     * Import an existing public identity + private key into the wallet.
     */
    importIdentity(publicKeyPem: string, privateKey: crypto.KeyObject, algorithm: SignatureAlgorithm, metadata?: Record<string, unknown>): Promise<Identity>;
    /**
     * Return all identities (public form).
     */
    listIdentities(): Identity[];
    /**
     * Look up an identity by id.
     */
    getIdentity(identityId: string): Identity | undefined;
    /**
     * Return the primary identity (the one used by `sign` when no identityId is
     * supplied), or `undefined` if none exists.
     */
    getPrimaryIdentity(): Identity | undefined;
    /**
     * Set the primary identity.
     */
    setPrimaryIdentity(identityId: string): void;
    /**
     * Issue a credential signed by the wallet's primary identity (or the
     * identity named by `issuerIdentityId`).
     *
     * The credential is stored in the wallet after issuance.
     */
    issueCredential(subjectDid: string, claims: Record<string, unknown>, opts?: {
        issuerIdentityId?: string;
        expiresAt?: string;
        id?: string;
    }): Promise<VerifiableCredential>;
    /**
     * Add an externally-issued credential to the wallet.
     */
    addCredential(credential: VerifiableCredential): Promise<void>;
    /**
     * List all credentials in the wallet.
     */
    listCredentials(): VerifiableCredential[];
    /**
     * Fetch a credential by id.
     */
    getCredential(id: string): VerifiableCredential | undefined;
    /**
     * Remove a credential by id. Returns `true` if a credential was removed.
     */
    deleteCredential(id: string): boolean;
    /**
     * Sign `data` with the primary identity's private key (or the identity
     * named by `identityId`).
     *
     * @returns Hex-encoded signature.
     */
    sign(data: Buffer, identityId?: string): Promise<{
        algorithm: SignatureAlgorithm;
        signature: string;
    }>;
    /**
     * Convenience wrapper that delegates signing to the hardware provider
     * without ever surfacing the private key. Returns a hex-encoded signature.
     */
    signViaProvider(data: Buffer, identityId?: string): Promise<{
        algorithm: SignatureAlgorithm;
        signature: string;
    }>;
    /**
     * Verify a signature. `publicKey` may be omitted, in which case the wallet
     * looks up an identity by `identityId` and uses its public key.
     */
    verify(data: Buffer, signature: Buffer | string, opts?: {
        identityId?: string;
        publicKey?: crypto.KeyObject | string;
        algorithm?: SignatureAlgorithm;
    }): Promise<boolean>;
    /**
     * Verify a credential stored in or supplied to the wallet against the
     * public key of the named issuer identity. If `issuerIdentityId` is
     * omitted, looks up an identity whose DID matches `credential.issuer`.
     */
    verifyCredential(credential: VerifiableCredential, issuerIdentityId?: string): Promise<boolean>;
    /**
     * Export an encrypted wallet blob containing identities, credentials, and
     * the encrypted private keys.
     *
     * The master key is derived from `passphrase` via PBKDF2 (210k iterations,
     * SHA-512). The private keys are individually encrypted with the master
     * key via AES-256-GCM, then the entire state blob is encrypted again.
     *
     * @returns Encrypted wallet blob (JSON-serializable).
     */
    exportEncrypted(passphrase: string): Promise<EncryptedWalletBlob>;
    /**
     * Import an encrypted wallet blob produced by {@link exportEncrypted}.
     *
     * Replaces the wallet's current state.
     */
    importEncrypted(blob: EncryptedWalletBlob, passphrase: string): Promise<void>;
    /**
     * Convenience: assign a role to an identity and return it.
     */
    assignRole(identityId: string, role: Role): Promise<void>;
    /**
     * Convenience: revoke a role.
     */
    revokeRole(identityId: string, role: Role): Promise<void>;
    /** Current sequence number. */
    getSequence(): number;
    /** Bump the sequence counter. Returns the new value. */
    bumpSequence(): number;
    /**
     * Resolve `identityId` (or fall back to the primary identity). Throws if
     * no identity is available.
     */
    private resolveIdentity;
    /**
     * For the software provider, retrieve the underlying private KeyObject.
     * For hardware providers, this throws — callers should use
     * {@link signViaProvider} instead.
     */
    private extractPrivateKeyForSigning;
}
/**
 * Constant-time comparison helper re-exported from the wallet module for
 * consumer convenience (e.g. comparing two wallet blob fingerprints).
 */
export { constantTimeEqual };
/**
 * Re-export `validateCredential` so wallet consumers have one import.
 */
export { validateCredential };
/** Re-export the deriveKey helper so callers can derive subkeys from the wallet master key. */
export { deriveKey };
//# sourceMappingURL=wallet.d.ts.map