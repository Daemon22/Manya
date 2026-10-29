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
import type { AttestationQuote, HardwareProbe, SignatureAlgorithm } from '../types.js';
import { HardwareValidationError } from '../errors.js';
import { sign, verify } from '../crypto/signatures.js';
import { generateKeyPair, getKeyFingerprint, algorithmForKey, importKeyPem } from '../crypto/keys.js';
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
export class SoftwareAttestationProvider implements HardwareAttestationProvider {
  readonly name = 'software';
  private readonly publicKey: crypto.KeyObject;
  private readonly privateKey: crypto.KeyObject;
  private readonly algorithm: SignatureAlgorithm;
  private readonly hardware: HardwareValidator;
  private cachedProbe: HardwareProbe | null = null;

  /**
   * @param opts - Optional configuration.
   * @param opts.algorithm - Key algorithm to generate. Defaults to `ecdsa`.
   * @param opts.privateKey - Pre-existing private key (PEM or KeyObject). If
   *   supplied, `opts.publicKey` must also be supplied.
   * @param opts.publicKey - Pre-existing public key (PEM or KeyObject).
   * @param opts.hardware - HardwareValidator instance (defaults to a new one).
   */
  constructor(opts: {
    algorithm?: 'rsa' | 'ecdsa';
    privateKey?: crypto.KeyObject | string;
    publicKey?: crypto.KeyObject | string;
    hardware?: HardwareValidator;
  } = {}) {
    this.hardware = opts.hardware ?? new HardwareValidator();
    if (opts.privateKey && opts.publicKey) {
      // Import supplied keys via the typed importKeyPem helper.
      const pubKeyObj =
        typeof opts.publicKey === 'string'
          ? importKeyPem(opts.publicKey, 'public')
          : opts.publicKey;
      const privKeyObj =
        typeof opts.privateKey === 'string'
          ? importKeyPem(opts.privateKey, 'private')
          : opts.privateKey;
      this.publicKey = pubKeyObj;
      this.privateKey = privKeyObj;
      this.algorithm = algorithmForKey(privKeyObj);
    } else {
      const algo = opts.algorithm ?? 'ecdsa';
      const kp = generateKeyPair(algo);
      this.publicKey = kp.publicKey;
      this.privateKey = kp.privateKey;
      this.algorithm = kp.algorithm;
    }
  }

  /** @inheritdoc */
  isAvailable(): boolean {
    // The software provider is always available — that's the point.
    return true;
  }

  /**
   * Return the provider's public key (PEM). Useful for transmitting the
   * attestation key to a verifier out of band.
   */
  getPublicKeyPem(): string {
    return this.publicKey.export({ type: 'spki', format: 'pem' }).toString('utf8');
  }

  /**
   * Return the SHA-256 fingerprint of the provider's public key.
   */
  getPublicKeyFingerprint(): string {
    return getKeyFingerprint(this.publicKey);
  }

  /**
   * Return the signature algorithm used by this provider.
   */
  getAlgorithm(): SignatureAlgorithm {
    return this.algorithm;
  }

  /** @inheritdoc */
  async attest(data: Buffer, nonce: string): Promise<AttestationQuote> {
    if (!Buffer.isBuffer(data)) {
      throw new HardwareValidationError('attest: data must be a Buffer');
    }
    if (typeof nonce !== 'string' || nonce.length === 0) {
      throw new HardwareValidationError('attest: nonce must be a non-empty string');
    }
    // Probe hardware once and cache. Even though we sign with a software key,
    // we include the probe in the quote so the verifier can see that no
    // hardware root was available.
    if (!this.cachedProbe) {
      this.cachedProbe = this.hardware.probe();
    }
    const measurements: Record<string, string> = {
      // SHA-256 of the data being attested.
      dataHash: sha256(data).toString('hex'),
      // Provider name (so the verifier knows this is software-signed).
      provider: 'software',
      // Public key fingerprint (binding).
      publicKeyFingerprint: this.getPublicKeyFingerprint(),
    };
    const timestamp = new Date().toISOString();
    // Build the canonical quote bytes (without the signature field) and sign.
    const quoteWithoutSig: Omit<AttestationQuote, 'signature'> = {
      version: 1,
      deviceFingerprint: data.toString('utf8'),
      measurements,
      timestamp,
      nonce,
      algorithm: this.algorithm,
      hardware: this.cachedProbe,
    };
    const canonical = canonicalQuoteBytes(quoteWithoutSig);
    const signature = sign(this.privateKey, canonical, this.algorithm);
    const quote: AttestationQuote = {
      ...quoteWithoutSig,
      signature,
    };
    return quote;
  }

  /** @inheritdoc */
  async verifyQuote(
    quote: AttestationQuote,
    publicKey?: crypto.KeyObject | string
  ): Promise<boolean> {
    if (!quote || typeof quote !== 'object') return false;
    // Use the supplied public key (or fall back to our own — useful for
    // verifying our own quotes in tests).
    const pubKey = publicKey ?? this.publicKey;
    if (!quote.signature || !quote.algorithm) return false;
    const { signature, ...rest } = quote;
    const canonical = canonicalQuoteBytes(rest);
    try {
      return verify(pubKey, canonical, signature, quote.algorithm);
    } catch {
      return false;
    }
  }
}

/**
 * Compute the canonical signed bytes for an attestation quote (everything
 * except the `signature` field). The order MUST be stable across
 * implementations and Node versions.
 *
 * @internal
 */
export function canonicalQuoteBytes(quote: Omit<AttestationQuote, 'signature'>): Buffer {
  // Stable JSON: sorted keys, no whitespace.
  const stable = stableStringify(quote);
  return Buffer.from(stable, 'utf8');
}

/**
 * Stable JSON stringify with sorted keys.
 * @internal
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  if (Buffer.isBuffer(value)) {
    return JSON.stringify(value.toString('hex'));
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return '{' + keys
    .map((k) => JSON.stringify(k) + ':' + stableStringify((value as Record<string, unknown>)[k]))
    .join(',') + '}';
}

// Internal helpers re-exported for tests.
export const _internal = {
  canonicalQuoteBytes,
  stableStringify,
  sha256,
};
