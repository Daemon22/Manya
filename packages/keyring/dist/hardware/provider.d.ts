/**
 * @manya-os/keyring — hardware key provider interface.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { KeyAlgorithm, SignatureAlgorithm } from '../types.js';
/**
 * Result of {@link HardwareKeyProvider.generateKeyPair}.
 */
export interface GeneratedHardwareKey {
    /** Provider-specific key id. Used to address the key in subsequent calls. */
    keyId: string;
    /** SPKI PEM-encoded public key. */
    publicKeyPem: string;
    /** Resolved signature algorithm. */
    algorithm: SignatureAlgorithm;
}
/**
 * Pluggable interface for hardware-backed key storage (TPM, Secure Enclave,
 * WebAuthn, HSM, ...). A software fallback is provided by
 * {@link SoftwareKeyProvider}.
 *
 * Implementations must:
 * - Persist key material securely (no plaintext export of private keys).
 * - Throw {@link import('../errors.js').HardwareKeyError} on any failure.
 * - Be safe to call concurrently for distinct `keyId` values.
 */
export interface HardwareKeyProvider {
    /** Whether this provider is available on the current platform. */
    isAvailable(): boolean;
    /**
     * Generate a new key pair. The provider MUST store the private key
     * internally; only the public key is returned to the caller.
     *
     * @param algo - Key algorithm.
     * @param keyIdHint - Optional caller-supplied key id hint. Implementations
     *   may ignore this or use it as a hint.
     * @returns Public key + key id.
     */
    generateKeyPair(algo: KeyAlgorithm, keyIdHint?: string): Promise<GeneratedHardwareKey>;
    /**
     * Sign `data` with the private key referenced by `keyId`.
     * @returns Signature bytes.
     */
    sign(keyId: string, data: Buffer): Promise<Buffer>;
    /**
     * Verify a `signature` over `data` against the public key referenced by
     * `keyId`. Returns `false` for any signature mismatch (does not throw).
     */
    verify(keyId: string, data: Buffer, signature: Buffer): Promise<boolean>;
    /**
     * Optionally delete a key. Implementations may omit this method (e.g. for
     * keys locked to a hardware token that cannot be deleted in software).
     */
    deleteKey?(keyId: string): Promise<void>;
    /**
     * Optionally check whether a key id is known to this provider.
     */
    hasKey?(keyId: string): Promise<boolean>;
}
//# sourceMappingURL=provider.d.ts.map