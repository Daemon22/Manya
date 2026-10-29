/**
 * @manya-os/keyring — sovereign identity and credential wallet.
 *
 * Public API surface for @manya-os/keyring. Everything exported here is part of
 * the stable, semver-bound public API.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
export * from './types.js';
export * from './errors.js';
export { Logger, LogLevel, ConsoleLogger, SilentLogger, scrubMetadata, shouldScrubField, SCRUBBED_FIELD_NAMES, } from './logging.js';
export { sha256, sha512, hmac, hkdf, pbkdf2, constantTimeEqual, } from './crypto/hashing.js';
export { encrypt, decrypt, AES_256_KEY_BYTES, AES_GCM_IV_BYTES, AES_GCM_TAG_BYTES, } from './crypto/symmetric.js';
export { generateKeyPair, deriveKey, importKeyPem, exportKeyPem, getKeyFingerprint, algorithmFor, DEFAULT_RSA_MODULUS, DEFAULT_RSA_EXPONENT, DEFAULT_EC_CURVE, } from './crypto/keys.js';
export type { GenerateKeyPairOptions, GeneratedKeyPair, } from './crypto/keys.js';
export { sign, verify, proofTypeFor, } from './crypto/signatures.js';
export { Identity, deriveDidKey, base58Encode } from './identity/identity.js';
export { Role, RoleManager, ALL_ROLES, parseRole, newRoleAssignmentId, } from './identity/roles.js';
export { AccessPolicySet, defaultPolicySet, matchResource, } from './access/policy.js';
export type { AccessPolicy } from './access/policy.js';
export { AccessEnforcer } from './access/enforcer.js';
export { CapabilityGrantManager } from './access/grants.js';
export { KeyringWallet, WALLET_PBKDF2_ITERATIONS, WALLET_SALT_BYTES, WALLET_MASTER_KEY_BYTES, } from './wallet/wallet.js';
export { InMemoryStorage, FileStorage, assertValidKey, } from './wallet/storage.js';
export type { EncryptedStorage } from './wallet/storage.js';
export { issueCredential, verifyCredential, validateCredential, canonicalCredentialBytes, } from './wallet/credentials.js';
export { shamirSplit, shamirCombine, verifySharesConsistent, gfMul, gfDiv, gfEval, } from './recovery/recovery.js';
export { createBackup, restoreBackup, BACKUP_VERSION, } from './recovery/backup.js';
export type { EncryptedBackup, BackupPayload, RestoredBackup, } from './recovery/backup.js';
export { MultiDeviceSync, buildBundleFromParts } from './sync/multi-device.js';
export type { HardwareKeyProvider, GeneratedHardwareKey, } from './hardware/provider.js';
export { SoftwareKeyProvider } from './hardware/software-fallback.js';
export { keyring, createKeyring, storeSecret, retrieveSecret, sealKeyring, openKeyring, signMessage, verifyMessage, grantAccess, checkAccess, } from './facade.js';
export type { FacadeKeyring } from './facade.js';
//# sourceMappingURL=index.d.ts.map