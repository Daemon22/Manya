/**
 * @manya-os/attest — hardware attestation provider interface + software fallback.
 *
 * A `HardwareAttestationProvider` produces a signed attestation quote using
 * hardware-rooted keys (TPM, Secure Enclave, HSM). The
 * `SoftwareAttestationProvider` is a fallback that signs with a local
 * software key — it provides NO hardware guarantees and is suitable only
 * for development, testing, and low-assurance deployments.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import * as crypto from 'crypto';
import type { AttestationQuote, SignatureAlgorithm } from '../types.js';
import { sha256 } from '../crypto/hashing.js';
import { HardwareValidator } from './validator.js';
/**
 * A pluggable hardware attestation provider.
 *
 * Implementations include:
 *   - {@link SoftwareAttestationProvider}: development / low-assurance fallback.
 *   - (Future) `TpmAttestationProvider`, `SecureEnclaveAttestationProvider`, etc.
 */
export interface HardwareAttestationProvider {
    /** Human-readable name (e.g. `software`, `tpm2-tss`). */
    readonly name: string;
    /** Whether this provider is available on the current host. */
    isAvailable(): boolean | Promise<boolean>;
    /**
     * Produce a signed attestation quote over `data`. The provider chooses
     * the signing algorithm and (optionally) binds hardware measurements
     * into the quote.
     *
     * @param data - Bytes to attest (typically the device fingerprint + nonce).
     * @param nonce - Verifier-supplied nonce for freshness.
     */
    attest(data: Buffer, nonce: string): Promise<AttestationQuote>;
    /**
     * Verify a quote produced by this provider. Implementations MUST verify
     * the signature against a known attestation key (which may be embedded
     * in the quote, in the case of TPM quote verification, or supplied out
     * of band for the software provider).
     *
     * @param quote - The quote to verify.
     * @param publicKey - Optional public key for software-provider quotes.
     */
    verifyQuote(quote: AttestationQuote, publicKey?: crypto.KeyObject | string): Promise<boolean>;
}
/**
 * Software-based attestation provider.
 *
 * Signs attestation quotes with a local (in-process) RSA-PSS or ECDSA P-256
 * key pair. This provides NO hardware guarantees — it exists for development,
 * testing, and low-assurance deployments where no TPM / Secure Enclave / TEE
 * is available.
 *
 * The signing key is generated lazily on first use, or can be supplied via
 * the constructor (useful for restoring a previously-persisted identity).
 */
export declare class SoftwareAttestationProvider implements HardwareAttestationProvider {
    readonly name = "software";
    private readonly publicKey;
    private readonly privateKey;
    private readonly algorithm;
    private readonly hardware;
    private cachedProbe;
    /**
     * @param opts - Optional configuration.
     * @param opts.algorithm - Key algorithm to generate. Defaults to `ecdsa`.
     * @param opts.privateKey - Pre-existing private key (PEM or KeyObject). If
     *   supplied, `opts.publicKey` must also be supplied.
     * @param opts.publicKey - Pre-existing public key (PEM or KeyObject).
     * @param opts.hardware - HardwareValidator instance (defaults to a new one).
     */
    constructor(opts?: {
        algorithm?: 'rsa' | 'ecdsa';
        privateKey?: crypto.KeyObject | string;
        publicKey?: crypto.KeyObject | string;
        hardware?: HardwareValidator;
    });
    /** @inheritdoc */
    isAvailable(): boolean;
    /**
     * Return the provider's public key (PEM). Useful for transmitting the
     * attestation key to a verifier out of band.
     */
    getPublicKeyPem(): string;
    /**
     * Return the SHA-256 fingerprint of the provider's public key.
     */
    getPublicKeyFingerprint(): string;
    /**
     * Return the signature algorithm used by this provider.
     */
    getAlgorithm(): SignatureAlgorithm;
    /** @inheritdoc */
    attest(data: Buffer, nonce: string): Promise<AttestationQuote>;
    /** @inheritdoc */
    verifyQuote(quote: AttestationQuote, publicKey?: crypto.KeyObject | string): Promise<boolean>;
}
/**
 * Compute the canonical signed bytes for an attestation quote (everything
 * except the `signature` field). The order MUST be stable across
 * implementations and Node versions.
 *
 * @internal
 */
export declare function canonicalQuoteBytes(quote: Omit<AttestationQuote, 'signature'>): Buffer;
/**
 * Stable JSON stringify with sorted keys.
 * @internal
 */
declare function stableStringify(value: unknown): string;
export declare const _internal: {
    canonicalQuoteBytes: typeof canonicalQuoteBytes;
    stableStringify: typeof stableStringify;
    sha256: typeof sha256;
};
export {};
//# sourceMappingURL=provider.d.ts.map