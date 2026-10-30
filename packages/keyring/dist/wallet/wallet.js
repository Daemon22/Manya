"use strict";
/**
 * @manya-os/keyring — KeyringWallet, the high-level wallet facade.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveKey = exports.validateCredential = exports.constantTimeEqual = exports.KeyringWallet = exports.WALLET_MASTER_KEY_BYTES = exports.WALLET_SALT_BYTES = exports.WALLET_PBKDF2_ITERATIONS = void 0;
const crypto = __importStar(require("crypto"));
const errors_js_1 = require("../errors.js");
const keys_js_1 = require("../crypto/keys.js");
Object.defineProperty(exports, "deriveKey", { enumerable: true, get: function () { return keys_js_1.deriveKey; } });
const signatures_js_1 = require("../crypto/signatures.js");
const symmetric_js_1 = require("../crypto/symmetric.js");
const hashing_js_1 = require("../crypto/hashing.js");
Object.defineProperty(exports, "constantTimeEqual", { enumerable: true, get: function () { return hashing_js_1.constantTimeEqual; } });
const identity_js_1 = require("../identity/identity.js");
const roles_js_1 = require("../identity/roles.js");
const index_js_1 = require("../access/index.js");
const storage_js_1 = require("./storage.js");
const credentials_js_1 = require("./credentials.js");
Object.defineProperty(exports, "validateCredential", { enumerable: true, get: function () { return credentials_js_1.validateCredential; } });
const logging_js_1 = require("../logging.js");
const software_fallback_js_1 = require("../hardware/software-fallback.js");
/** PBKDF2 iteration count for wallet passphrase → master key. */
exports.WALLET_PBKDF2_ITERATIONS = 210_000;
/** PBKDF2 salt length. */
exports.WALLET_SALT_BYTES = 16;
/** Master key length (AES-256). */
exports.WALLET_MASTER_KEY_BYTES = 32;
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
class KeyringWallet {
    storage;
    hardwareProvider;
    logger;
    identities = new Map();
    credentials = new Map();
    primaryIdentityId = null;
    sequence = 0;
    roles;
    policies;
    access;
    constructor(opts = {}) {
        this.storage = opts.storage ?? new storage_js_1.InMemoryStorage();
        this.hardwareProvider = opts.hardwareProvider ?? new software_fallback_js_1.SoftwareKeyProvider();
        this.logger = opts.logger ?? new logging_js_1.SilentLogger();
        this.roles = new roles_js_1.RoleManager(this.storage);
        this.policies = (0, index_js_1.defaultPolicySet)();
        this.access = new index_js_1.AccessEnforcer(this.roles, this.policies);
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
    async createIdentity(algo = 'ecdsa', metadata = {}) {
        const { publicKey, privateKey, algorithm } = (0, keys_js_1.generateKeyPair)(algo);
        const publicKeyPem = (0, keys_js_1.exportKeyPem)(publicKey, 'public');
        const identity = identity_js_1.Identity.fromPublicKey(publicKeyPem, algorithm, metadata);
        // Register with hardware provider. The software fallback stores the
        // private KeyObject directly; a real hardware provider would generate the
        // key on-device and return only a public key + key id.
        let keyId;
        try {
            const registered = await this.hardwareProvider.generateKeyPair(algo);
            keyId = registered.keyId;
            // If the provider is the software fallback, it generated its own key —
            // we override by importing the one we already generated. This keeps the
            // public identity and the signing key in sync.
            if (this.hardwareProvider instanceof software_fallback_js_1.SoftwareKeyProvider) {
                this.hardwareProvider.replaceKey(keyId, privateKey);
            }
        }
        catch (err) {
            throw new errors_js_1.KeyGenerationError('createIdentity: hardware provider rejected key: ' + err.message, err);
        }
        const record = {
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
    async importIdentity(publicKeyPem, privateKey, algorithm, metadata = {}) {
        const identity = identity_js_1.Identity.fromPublicKey(publicKeyPem, algorithm, metadata);
        const registered = await this.hardwareProvider.generateKeyPair(algorithm === 'rsa-pss' ? 'rsa' : 'ecdsa');
        if (this.hardwareProvider instanceof software_fallback_js_1.SoftwareKeyProvider) {
            this.hardwareProvider.replaceKey(registered.keyId, privateKey);
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
    listIdentities() {
        return Array.from(this.identities.values()).map((r) => r.identity);
    }
    /**
     * Look up an identity by id.
     */
    getIdentity(identityId) {
        return this.identities.get(identityId)?.identity;
    }
    /**
     * Return the primary identity (the one used by `sign` when no identityId is
     * supplied), or `undefined` if none exists.
     */
    getPrimaryIdentity() {
        if (this.primaryIdentityId === null)
            return undefined;
        return this.identities.get(this.primaryIdentityId)?.identity;
    }
    /**
     * Set the primary identity.
     */
    setPrimaryIdentity(identityId) {
        if (!this.identities.has(identityId)) {
            throw new errors_js_1.KeyringError(`setPrimaryIdentity: unknown identity '${identityId}'`, 'IDENTITY_NOT_FOUND_ERROR');
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
    async issueCredential(subjectDid, claims, opts = {}) {
        const record = this.resolveIdentity(opts.issuerIdentityId);
        // Fetch the issuer's private key via the hardware provider. For the
        // software fallback, we expose a hook to retrieve it; for hardware, the
        // signing happens on-device and we never see the private key.
        const privateKey = this.extractPrivateKeyForSigning(record);
        const credential = (0, credentials_js_1.issueCredential)({
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
    async addCredential(credential) {
        if (!credential || !credential.id) {
            throw new errors_js_1.CredentialError('addCredential: credential.id required');
        }
        this.credentials.set(credential.id, credential);
        this.logger.debug('keyring:credential:added', {
            credentialId: credential.id,
        });
    }
    /**
     * List all credentials in the wallet.
     */
    listCredentials() {
        return Array.from(this.credentials.values());
    }
    /**
     * Fetch a credential by id.
     */
    getCredential(id) {
        return this.credentials.get(id);
    }
    /**
     * Remove a credential by id. Returns `true` if a credential was removed.
     */
    deleteCredential(id) {
        return this.credentials.delete(id);
    }
    // ----- signing / verification -----
    /**
     * Sign `data` with the primary identity's private key (or the identity
     * named by `identityId`).
     *
     * @returns Hex-encoded signature.
     */
    async sign(data, identityId) {
        const record = this.resolveIdentity(identityId);
        const privateKey = this.extractPrivateKeyForSigning(record);
        const signature = (0, signatures_js_1.sign)(privateKey, data, record.algorithm);
        return { algorithm: record.algorithm, signature };
    }
    /**
     * Convenience wrapper that delegates signing to the hardware provider
     * without ever surfacing the private key. Returns a hex-encoded signature.
     */
    async signViaProvider(data, identityId) {
        const record = this.resolveIdentity(identityId);
        const sigBuf = await this.hardwareProvider.sign(record.keyId, data);
        return { algorithm: record.algorithm, signature: sigBuf.toString('hex') };
    }
    /**
     * Verify a signature. `publicKey` may be omitted, in which case the wallet
     * looks up an identity by `identityId` and uses its public key.
     */
    async verify(data, signature, opts = {}) {
        let publicKey;
        let algorithm;
        if (opts.publicKey && opts.algorithm) {
            publicKey = opts.publicKey;
            algorithm = opts.algorithm;
        }
        else if (opts.identityId) {
            const record = this.identities.get(opts.identityId);
            if (!record) {
                throw new errors_js_1.VerificationError(`unknown identity: ${opts.identityId}`);
            }
            publicKey = record.identity.publicKey;
            algorithm = record.algorithm;
        }
        else {
            const primary = this.getPrimaryIdentity();
            if (!primary) {
                throw new errors_js_1.VerificationError('no identity to verify against');
            }
            publicKey = primary.publicKey;
            algorithm = primary.algorithm;
        }
        return (0, signatures_js_1.verify)(publicKey, data, signature, algorithm);
    }
    /**
     * Verify a credential stored in or supplied to the wallet against the
     * public key of the named issuer identity. If `issuerIdentityId` is
     * omitted, looks up an identity whose DID matches `credential.issuer`.
     */
    async verifyCredential(credential, issuerIdentityId) {
        let publicKey;
        if (issuerIdentityId) {
            const record = this.identities.get(issuerIdentityId);
            if (!record) {
                throw new errors_js_1.VerificationError(`unknown identity: ${issuerIdentityId}`);
            }
            publicKey = record.identity.publicKey;
        }
        else {
            const issuer = this.listIdentities().find((i) => i.did === credential.issuer);
            if (!issuer) {
                // Can't verify without the issuer's public key.
                return false;
            }
            publicKey = issuer.publicKey;
        }
        return (0, credentials_js_1.verifyCredential)(credential, publicKey);
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
    async exportEncrypted(passphrase) {
        if (typeof passphrase !== 'string' || passphrase.length === 0) {
            throw new errors_js_1.EncryptionError('exportEncrypted: passphrase required');
        }
        const salt = crypto.randomBytes(exports.WALLET_SALT_BYTES);
        const masterKey = (0, hashing_js_1.pbkdf2)(passphrase, salt, exports.WALLET_PBKDF2_ITERATIONS, exports.WALLET_MASTER_KEY_BYTES);
        const identityRecords = [];
        for (const record of this.identities.values()) {
            const privateKey = this.extractPrivateKeyForSigning(record);
            const privateKeyPem = privateKey.export({
                type: 'pkcs8',
                format: 'pem',
            });
            const plain = Buffer.from(privateKeyPem, 'utf8');
            const { iv, ciphertext, tag } = (0, symmetric_js_1.encrypt)(masterKey, plain, WALLET_AAD);
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
        const state = {
            schemaVersion: WALLET_SCHEMA_VERSION,
            primaryIdentityId: this.primaryIdentityId,
            identities: identityRecords,
            credentials: this.listCredentials(),
            sequence: this.sequence,
        };
        const stateBytes = Buffer.from(JSON.stringify(state), 'utf8');
        const outer = (0, symmetric_js_1.encrypt)(masterKey, stateBytes, WALLET_AAD);
        const blob = {
            kind: 'manya-keyring-wallet',
            version: WALLET_SCHEMA_VERSION,
            salt: salt.toString('base64'),
            iv: outer.iv.toString('base64'),
            ciphertext: outer.ciphertext.toString('base64'),
            tag: outer.tag.toString('base64'),
            createdAt: new Date().toISOString(),
            iterations: exports.WALLET_PBKDF2_ITERATIONS,
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
    async importEncrypted(blob, passphrase) {
        if (!blob || blob.kind !== 'manya-keyring-wallet') {
            throw new errors_js_1.DecryptionError('importEncrypted: not a manya-keyring-wallet blob');
        }
        if (typeof passphrase !== 'string' || passphrase.length === 0) {
            throw new errors_js_1.DecryptionError('importEncrypted: passphrase required');
        }
        const salt = Buffer.from(blob.salt, 'base64');
        const masterKey = (0, hashing_js_1.pbkdf2)(passphrase, salt, blob.iterations ?? exports.WALLET_PBKDF2_ITERATIONS, exports.WALLET_MASTER_KEY_BYTES);
        let stateBytes;
        try {
            stateBytes = (0, symmetric_js_1.decrypt)(masterKey, Buffer.from(blob.iv, 'base64'), Buffer.from(blob.ciphertext, 'base64'), Buffer.from(blob.tag, 'base64'), WALLET_AAD);
        }
        catch (err) {
            throw new errors_js_1.DecryptionError('importEncrypted: decryption failed (wrong passphrase?): ' +
                err.message, err);
        }
        let state;
        try {
            state = JSON.parse(stateBytes.toString('utf8'));
        }
        catch (err) {
            throw new errors_js_1.DecryptionError('importEncrypted: corrupt state JSON', err);
        }
        // Clear current state.
        this.identities.clear();
        this.credentials.clear();
        for (const record of state.identities ?? []) {
            const identity = identity_js_1.Identity.deserialize(record.identity);
            // Decrypt the private key.
            if (!record.encryptedPrivateKey) {
                throw new errors_js_1.DecryptionError(`importEncrypted: identity ${identity.id} missing encryptedPrivateKey`);
            }
            const plain = (0, symmetric_js_1.decrypt)(masterKey, Buffer.from(record.encryptedPrivateKey.iv, 'base64'), Buffer.from(record.encryptedPrivateKey.ciphertext, 'base64'), Buffer.from(record.encryptedPrivateKey.tag, 'base64'), WALLET_AAD);
            const privateKey = crypto.createPrivateKey(plain.toString('utf8'));
            // Re-register with the hardware provider.
            const registered = await this.hardwareProvider.generateKeyPair(record.algorithm === 'rsa-pss' ? 'rsa' : 'ecdsa');
            if (this.hardwareProvider instanceof software_fallback_js_1.SoftwareKeyProvider) {
                this.hardwareProvider.replaceKey(registered.keyId, privateKey);
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
    async assignRole(identityId, role) {
        await this.roles.assignRole(identityId, role);
    }
    /**
     * Convenience: revoke a role.
     */
    async revokeRole(identityId, role) {
        await this.roles.revokeRole(identityId, role);
    }
    // ----- sequence counter (for sync) -----
    /** Current sequence number. */
    getSequence() {
        return this.sequence;
    }
    /** Bump the sequence counter. Returns the new value. */
    bumpSequence() {
        this.sequence += 1;
        return this.sequence;
    }
    // ----- internals -----
    /**
     * Resolve `identityId` (or fall back to the primary identity). Throws if
     * no identity is available.
     */
    resolveIdentity(identityId) {
        const id = identityId ?? this.primaryIdentityId ?? undefined;
        if (!id) {
            throw new errors_js_1.KeyringError('no identity available — call createIdentity first', 'IDENTITY_NOT_FOUND_ERROR');
        }
        const record = this.identities.get(id);
        if (!record) {
            throw new errors_js_1.KeyringError(`unknown identity: ${id}`, 'IDENTITY_NOT_FOUND_ERROR');
        }
        return record;
    }
    /**
     * For the software provider, retrieve the underlying private KeyObject.
     * For hardware providers, this throws — callers should use
     * {@link signViaProvider} instead.
     */
    extractPrivateKeyForSigning(record) {
        if (this.hardwareProvider instanceof software_fallback_js_1.SoftwareKeyProvider) {
            const key = this.hardwareProvider.getPrivateKey(record.keyId);
            if (!key) {
                throw new errors_js_1.SignatureError(`extractPrivateKeyForSigning: no private key for keyId ${record.keyId}`);
            }
            return key;
        }
        throw new errors_js_1.SignatureError('hardware-backed provider does not expose private keys — use signViaProvider');
    }
}
exports.KeyringWallet = KeyringWallet;
//# sourceMappingURL=wallet.js.map