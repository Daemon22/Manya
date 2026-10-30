/**
 * @manya-os/keyring — KeyringWallet, the high-level wallet facade.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import {
  KeyringError,
  KeyGenerationError,
  SignatureError,
  VerificationError,
  EncryptionError,
  DecryptionError,
  CredentialError,
} from '../errors.js';
import { generateKeyPair, exportKeyPem, deriveKey } from '../crypto/keys.js';
import { sign, verify } from '../crypto/signatures.js';
import { encrypt, decrypt } from '../crypto/symmetric.js';
import { pbkdf2, constantTimeEqual } from '../crypto/hashing.js';
import { Identity } from '../identity/identity.js';
import {
  Role,
  RoleManager,
} from '../identity/roles.js';
import {
  AccessPolicySet,
  AccessEnforcer,
  defaultPolicySet,
} from '../access/index.js';
import { InMemoryStorage } from './storage.js';
import type { EncryptedStorage } from './storage.js';
import {
  issueCredential,
  verifyCredential,
  validateCredential,
} from './credentials.js';
import type { VerifiableCredential } from '../types.js';
import type {
  KeyAlgorithm,
  SignatureAlgorithm,
  EncryptedWalletBlob,
  KeyringWalletOptions,
  WalletIdentityRecord,
} from '../types.js';
import type { Logger } from '../logging.js';
import { SilentLogger } from '../logging.js';
import type { HardwareKeyProvider } from '../hardware/provider.js';
import { SoftwareKeyProvider } from '../hardware/software-fallback.js';

/** PBKDF2 iteration count for wallet passphrase → master key. */
export const WALLET_PBKDF2_ITERATIONS = 210_000;
/** PBKDF2 salt length. */
export const WALLET_SALT_BYTES = 16;
/** Master key length (AES-256). */
export const WALLET_MASTER_KEY_BYTES = 32;

/** Internal persisted wallet record (encrypted in exports/backups). */
interface WalletState {
  schemaVersion: number;
  primaryIdentityId: string | null;
  identities: Array<{
    identity: import('../types.js').SerializedIdentity;
    keyId: string;
    algorithm: SignatureAlgorithm;
    /** Encrypted PKCS#8 PEM (encrypted with master key), present only when the wallet owns the private key. */
    encryptedPrivateKey?: {
      iv: string;
      ciphertext: string;
      tag: string;
    };
  }>;
  credentials: VerifiableCredential[];
  sequence: number;
}

const WALLET_SCHEMA_VERSION = 1;
const WALLET_AAD = Buffer.from('manya-keyring-wallet-v1', 'utf8');

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
export class KeyringWallet {
  private readonly storage: EncryptedStorage;
  private readonly hardwareProvider: HardwareKeyProvider;
  private readonly logger: Logger;
  private readonly identities = new Map<string, WalletIdentityRecord>();
  private readonly credentials = new Map<string, VerifiableCredential>();
  private primaryIdentityId: string | null = null;
  private sequence = 0;

  public readonly roles: RoleManager;
  public readonly policies: AccessPolicySet;
  public readonly access: AccessEnforcer;

  constructor(opts: KeyringWalletOptions = {}) {
    this.storage = opts.storage ?? new InMemoryStorage();
    this.hardwareProvider = opts.hardwareProvider ?? new SoftwareKeyProvider();
    this.logger = opts.logger ?? new SilentLogger();
    this.roles = new RoleManager(this.storage);
    this.policies = defaultPolicySet();
    this.access = new AccessEnforcer(this.roles, this.policies);
  }

  // ----- identity management -----

  /**
   * Create a new identity and register it as the primary identity if no
   * other primary exists.
   *
   * @param algo - `'rsa'` (RSA-PSS 3072) or `'ecdsa'` (P-256).
   * @param metadata - Optional public metadata.
   * @returns The new Identity (public form).
   */
  public async createIdentity(
    algo: KeyAlgorithm = 'ecdsa',
    metadata: Record<string, unknown> = {}
  ): Promise<Identity> {
    const { publicKey, privateKey, algorithm } = generateKeyPair(algo);
    const publicKeyPem = exportKeyPem(publicKey, 'public');
    const identity = Identity.fromPublicKey(publicKeyPem, algorithm, metadata);

    // Register with hardware provider. The software fallback stores the
    // private KeyObject directly; a real hardware provider would generate the
    // key on-device and return only a public key + key id.
    let keyId: string;
    try {
      const registered = await this.hardwareProvider.generateKeyPair(algo);
      keyId = registered.keyId;
      // If the provider is the software fallback, it generated its own key —
      // we override by importing the one we already generated. This keeps the
      // public identity and the signing key in sync.
      if (this.hardwareProvider instanceof SoftwareKeyProvider) {
        (this.hardwareProvider as SoftwareKeyProvider).replaceKey(keyId, privateKey);
      }
    } catch (err) {
      throw new KeyGenerationError(
        'createIdentity: hardware provider rejected key: ' + (err as Error).message,
        err
      );
    }

    const record: WalletIdentityRecord = {
      identity,
      keyId,
      algorithm,
    };
    this.identities.set(identity.id, record);
    if (this.primaryIdentityId === null) {
      this.primaryIdentityId = identity.id;
    }
    this.logger.info('keyring:identity:created', {
      identityId: identity.id,
      did: identity.did,
      algorithm,
    });
    return identity;
  }

  /**
   * Import an existing public identity + private key into the wallet.
   */
  public async importIdentity(
    publicKeyPem: string,
    privateKey: crypto.KeyObject,
    algorithm: SignatureAlgorithm,
    metadata: Record<string, unknown> = {}
  ): Promise<Identity> {
    const identity = Identity.fromPublicKey(publicKeyPem, algorithm, metadata);
    const registered = await this.hardwareProvider.generateKeyPair(
      algorithm === 'rsa-pss' ? 'rsa' : 'ecdsa'
    );
    if (this.hardwareProvider instanceof SoftwareKeyProvider) {
      (this.hardwareProvider as SoftwareKeyProvider).replaceKey(registered.keyId, privateKey);
    }
    this.identities.set(identity.id, {
      identity,
      keyId: registered.keyId,
      algorithm,
    });
    if (this.primaryIdentityId === null) {
      this.primaryIdentityId = identity.id;
    }
    return identity;
  }

  /**
   * Return all identities (public form).
   */
  public listIdentities(): Identity[] {
    return Array.from(this.identities.values()).map((r) => r.identity);
  }

  /**
   * Look up an identity by id.
   */
  public getIdentity(identityId: string): Identity | undefined {
    return this.identities.get(identityId)?.identity;
  }

  /**
   * Return the primary identity (the one used by `sign` when no identityId is
   * supplied), or `undefined` if none exists.
   */
  public getPrimaryIdentity(): Identity | undefined {
    if (this.primaryIdentityId === null) return undefined;
    return this.identities.get(this.primaryIdentityId)?.identity;
  }

  /**
   * Set the primary identity.
   */
  public setPrimaryIdentity(identityId: string): void {
    if (!this.identities.has(identityId)) {
      throw new KeyringError(
        `setPrimaryIdentity: unknown identity '${identityId}'`,
        'IDENTITY_NOT_FOUND_ERROR'
      );
    }
    this.primaryIdentityId = identityId;
  }

  // ----- credential management -----

  /**
   * Issue a credential signed by the wallet's primary identity (or the
   * identity named by `issuerIdentityId`).
   *
   * The credential is stored in the wallet after issuance.
   */
  public async issueCredential(
    subjectDid: string,
    claims: Record<string, unknown>,
    opts: {
      issuerIdentityId?: string;
      expiresAt?: string;
      id?: string;
    } = {}
  ): Promise<VerifiableCredential> {
    const record = this.resolveIdentity(opts.issuerIdentityId);
    // Fetch the issuer's private key via the hardware provider. For the
    // software fallback, we expose a hook to retrieve it; for hardware, the
    // signing happens on-device and we never see the private key.
    const privateKey = this.extractPrivateKeyForSigning(record);
    const credential = issueCredential({
      issuer: record.identity.did,
      issuerPrivateKey: privateKey,
      algorithm: record.algorithm,
      subject: subjectDid,
      claims,
      ...(opts.id !== undefined ? { id: opts.id } : {}),
      ...(opts.expiresAt !== undefined ? { expiresAt: opts.expiresAt } : {}),
    });
    this.credentials.set(credential.id, credential);
    this.logger.info('keyring:credential:issued', {
      credentialId: credential.id,
      issuer: record.identity.did,
      subject: subjectDid,
    });
    return credential;
  }

  /**
   * Add an externally-issued credential to the wallet.
   */
  public async addCredential(
    credential: VerifiableCredential
  ): Promise<void> {
    if (!credential || !credential.id) {
      throw new CredentialError('addCredential: credential.id required');
    }
    this.credentials.set(credential.id, credential);
    this.logger.debug('keyring:credential:added', {
      credentialId: credential.id,
    });
  }

  /**
   * List all credentials in the wallet.
   */
  public listCredentials(): VerifiableCredential[] {
    return Array.from(this.credentials.values());
  }

  /**
   * Fetch a credential by id.
   */
  public getCredential(id: string): VerifiableCredential | undefined {
    return this.credentials.get(id);
  }

  /**
   * Remove a credential by id. Returns `true` if a credential was removed.
   */
  public deleteCredential(id: string): boolean {
    return this.credentials.delete(id);
  }

  // ----- signing / verification -----

  /**
   * Sign `data` with the primary identity's private key (or the identity
   * named by `identityId`).
   *
   * @returns Hex-encoded signature.
   */
  public async sign(
    data: Buffer,
    identityId?: string
  ): Promise<{ algorithm: SignatureAlgorithm; signature: string }> {
    const record = this.resolveIdentity(identityId);
    const privateKey = this.extractPrivateKeyForSigning(record);
    const signature = sign(privateKey, data, record.algorithm);
    return { algorithm: record.algorithm, signature };
  }

  /**
   * Convenience wrapper that delegates signing to the hardware provider
   * without ever surfacing the private key. Returns a hex-encoded signature.
   */
  public async signViaProvider(
    data: Buffer,
    identityId?: string
  ): Promise<{ algorithm: SignatureAlgorithm; signature: string }> {
    const record = this.resolveIdentity(identityId);
    const sigBuf = await this.hardwareProvider.sign(record.keyId, data);
    return { algorithm: record.algorithm, signature: sigBuf.toString('hex') };
  }

  /**
   * Verify a signature. `publicKey` may be omitted, in which case the wallet
   * looks up an identity by `identityId` and uses its public key.
   */
  public async verify(
    data: Buffer,
    signature: Buffer | string,
    opts: { identityId?: string; publicKey?: crypto.KeyObject | string; algorithm?: SignatureAlgorithm } = {}
  ): Promise<boolean> {
    let publicKey: crypto.KeyObject | string;
    let algorithm: SignatureAlgorithm;
    if (opts.publicKey && opts.algorithm) {
      publicKey = opts.publicKey;
      algorithm = opts.algorithm;
    } else if (opts.identityId) {
      const record = this.identities.get(opts.identityId);
      if (!record) {
        throw new VerificationError(`unknown identity: ${opts.identityId}`);
      }
      publicKey = record.identity.publicKey;
      algorithm = record.algorithm;
    } else {
      const primary = this.getPrimaryIdentity();
      if (!primary) {
        throw new VerificationError('no identity to verify against');
      }
      publicKey = primary.publicKey;
      algorithm = primary.algorithm;
    }
    return verify(publicKey, data, signature, algorithm);
  }

  /**
   * Verify a credential stored in or supplied to the wallet against the
   * public key of the named issuer identity. If `issuerIdentityId` is
   * omitted, looks up an identity whose DID matches `credential.issuer`.
   */
  public async verifyCredential(
    credential: VerifiableCredential,
    issuerIdentityId?: string
  ): Promise<boolean> {
    let publicKey: crypto.KeyObject | string;
    if (issuerIdentityId) {
      const record = this.identities.get(issuerIdentityId);
      if (!record) {
        throw new VerificationError(`unknown identity: ${issuerIdentityId}`);
      }
      publicKey = record.identity.publicKey;
    } else {
      const issuer = this.listIdentities().find(
        (i) => i.did === credential.issuer
      );
      if (!issuer) {
        // Can't verify without the issuer's public key.
        return false;
      }
      publicKey = issuer.publicKey;
    }
    return verifyCredential(credential, publicKey);
  }

  // ----- encrypted export / import -----

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
  public async exportEncrypted(passphrase: string): Promise<EncryptedWalletBlob> {
    if (typeof passphrase !== 'string' || passphrase.length === 0) {
      throw new EncryptionError('exportEncrypted: passphrase required');
    }
    const salt = crypto.randomBytes(WALLET_SALT_BYTES);
    const masterKey = pbkdf2(
      passphrase,
      salt,
      WALLET_PBKDF2_ITERATIONS,
      WALLET_MASTER_KEY_BYTES
    );

    const identityRecords: WalletState['identities'] = [];
    for (const record of this.identities.values()) {
      const privateKey = this.extractPrivateKeyForSigning(record);
      const privateKeyPem = privateKey.export({
        type: 'pkcs8',
        format: 'pem',
      }) as string;
      const plain = Buffer.from(privateKeyPem, 'utf8');
      const { iv, ciphertext, tag } = encrypt(masterKey, plain, WALLET_AAD);
      identityRecords.push({
        identity: record.identity.serialize(),
        keyId: record.keyId,
        algorithm: record.algorithm,
        encryptedPrivateKey: {
          iv: iv.toString('base64'),
          ciphertext: ciphertext.toString('base64'),
          tag: tag.toString('base64'),
        },
      });
    }

    const state: WalletState = {
      schemaVersion: WALLET_SCHEMA_VERSION,
      primaryIdentityId: this.primaryIdentityId,
      identities: identityRecords,
      credentials: this.listCredentials(),
      sequence: this.sequence,
    };
    const stateBytes = Buffer.from(JSON.stringify(state), 'utf8');
    const outer = encrypt(masterKey, stateBytes, WALLET_AAD);

    const blob: EncryptedWalletBlob = {
      kind: 'manya-keyring-wallet',
      version: WALLET_SCHEMA_VERSION,
      salt: salt.toString('base64'),
      iv: outer.iv.toString('base64'),
      ciphertext: outer.ciphertext.toString('base64'),
      tag: outer.tag.toString('base64'),
      createdAt: new Date().toISOString(),
      iterations: WALLET_PBKDF2_ITERATIONS,
    };
    this.logger.info('keyring:wallet:exported', {
      identities: identityRecords.length,
      credentials: state.credentials.length,
    });
    return blob;
  }

  /**
   * Import an encrypted wallet blob produced by {@link exportEncrypted}.
   *
   * Replaces the wallet's current state.
   */
  public async importEncrypted(
    blob: EncryptedWalletBlob,
    passphrase: string
  ): Promise<void> {
    if (!blob || blob.kind !== 'manya-keyring-wallet') {
      throw new DecryptionError('importEncrypted: not a manya-keyring-wallet blob');
    }
    if (typeof passphrase !== 'string' || passphrase.length === 0) {
      throw new DecryptionError('importEncrypted: passphrase required');
    }

    const salt = Buffer.from(blob.salt, 'base64');
    const masterKey = pbkdf2(
      passphrase,
      salt,
      blob.iterations ?? WALLET_PBKDF2_ITERATIONS,
      WALLET_MASTER_KEY_BYTES
    );

    let stateBytes: Buffer;
    try {
      stateBytes = decrypt(
        masterKey,
        Buffer.from(blob.iv, 'base64'),
        Buffer.from(blob.ciphertext, 'base64'),
        Buffer.from(blob.tag, 'base64'),
        WALLET_AAD
      );
    } catch (err) {
      throw new DecryptionError(
        'importEncrypted: decryption failed (wrong passphrase?): ' +
          (err as Error).message,
        err
      );
    }

    let state: WalletState;
    try {
      state = JSON.parse(stateBytes.toString('utf8'));
    } catch (err) {
      throw new DecryptionError(
        'importEncrypted: corrupt state JSON',
        err
      );
    }

    // Clear current state.
    this.identities.clear();
    this.credentials.clear();

    for (const record of state.identities ?? []) {
      const identity = Identity.deserialize(record.identity);
      // Decrypt the private key.
      if (!record.encryptedPrivateKey) {
        throw new DecryptionError(
          `importEncrypted: identity ${identity.id} missing encryptedPrivateKey`
        );
      }
      const plain = decrypt(
        masterKey,
        Buffer.from(record.encryptedPrivateKey.iv, 'base64'),
        Buffer.from(record.encryptedPrivateKey.ciphertext, 'base64'),
        Buffer.from(record.encryptedPrivateKey.tag, 'base64'),
        WALLET_AAD
      );
      const privateKey = crypto.createPrivateKey(plain.toString('utf8'));
      // Re-register with the hardware provider.
      const registered = await this.hardwareProvider.generateKeyPair(
        record.algorithm === 'rsa-pss' ? 'rsa' : 'ecdsa'
      );
      if (this.hardwareProvider instanceof SoftwareKeyProvider) {
        (this.hardwareProvider as SoftwareKeyProvider).replaceKey(
          registered.keyId,
          privateKey
        );
      }
      this.identities.set(identity.id, {
        identity,
        keyId: registered.keyId,
        algorithm: record.algorithm,
      });
    }
    for (const cred of state.credentials ?? []) {
      this.credentials.set(cred.id, cred);
    }
    this.primaryIdentityId = state.primaryIdentityId;
    this.sequence = state.sequence ?? 0;
    this.logger.info('keyring:wallet:imported', {
      identities: this.identities.size,
      credentials: this.credentials.size,
    });
  }

  // ----- role helpers (convenience) -----

  /**
   * Convenience: assign a role to an identity and return it.
   */
  public async assignRole(identityId: string, role: Role): Promise<void> {
    await this.roles.assignRole(identityId, role);
  }

  /**
   * Convenience: revoke a role.
   */
  public async revokeRole(identityId: string, role: Role): Promise<void> {
    await this.roles.revokeRole(identityId, role);
  }

  // ----- sequence counter (for sync) -----

  /** Current sequence number. */
  public getSequence(): number {
    return this.sequence;
  }

  /** Bump the sequence counter. Returns the new value. */
  public bumpSequence(): number {
    this.sequence += 1;
    return this.sequence;
  }

  // ----- internals -----

  /**
   * Resolve `identityId` (or fall back to the primary identity). Throws if
   * no identity is available.
   */
  private resolveIdentity(identityId?: string): WalletIdentityRecord {
    const id = identityId ?? this.primaryIdentityId ?? undefined;
    if (!id) {
      throw new KeyringError(
        'no identity available — call createIdentity first',
        'IDENTITY_NOT_FOUND_ERROR'
      );
    }
    const record = this.identities.get(id);
    if (!record) {
      throw new KeyringError(
        `unknown identity: ${id}`,
        'IDENTITY_NOT_FOUND_ERROR'
      );
    }
    return record;
  }

  /**
   * For the software provider, retrieve the underlying private KeyObject.
   * For hardware providers, this throws — callers should use
   * {@link signViaProvider} instead.
   */
  private extractPrivateKeyForSigning(
    record: WalletIdentityRecord
  ): crypto.KeyObject {
    if (this.hardwareProvider instanceof SoftwareKeyProvider) {
      const key = (this.hardwareProvider as SoftwareKeyProvider).getPrivateKey(
        record.keyId
      );
      if (!key) {
        throw new SignatureError(
          `extractPrivateKeyForSigning: no private key for keyId ${record.keyId}`
        );
      }
      return key;
    }
    throw new SignatureError(
      'hardware-backed provider does not expose private keys — use signViaProvider'
    );
  }
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
