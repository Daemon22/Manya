"use strict";
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCredential = exports.issueCredential = exports.assertValidKey = exports.FileStorage = exports.InMemoryStorage = exports.WALLET_MASTER_KEY_BYTES = exports.WALLET_SALT_BYTES = exports.WALLET_PBKDF2_ITERATIONS = exports.KeyringWallet = exports.CapabilityGrantManager = exports.AccessEnforcer = exports.matchResource = exports.defaultPolicySet = exports.AccessPolicySet = exports.newRoleAssignmentId = exports.parseRole = exports.ALL_ROLES = exports.RoleManager = exports.Role = exports.base58Encode = exports.deriveDidKey = exports.Identity = exports.proofTypeFor = exports.verify = exports.sign = exports.DEFAULT_EC_CURVE = exports.DEFAULT_RSA_EXPONENT = exports.DEFAULT_RSA_MODULUS = exports.algorithmFor = exports.getKeyFingerprint = exports.exportKeyPem = exports.importKeyPem = exports.deriveKey = exports.generateKeyPair = exports.AES_GCM_TAG_BYTES = exports.AES_GCM_IV_BYTES = exports.AES_256_KEY_BYTES = exports.decrypt = exports.encrypt = exports.constantTimeEqual = exports.pbkdf2 = exports.hkdf = exports.hmac = exports.sha512 = exports.sha256 = exports.SCRUBBED_FIELD_NAMES = exports.shouldScrubField = exports.scrubMetadata = exports.SilentLogger = exports.ConsoleLogger = void 0;
exports.checkAccess = exports.grantAccess = exports.verifyMessage = exports.signMessage = exports.openKeyring = exports.sealKeyring = exports.retrieveSecret = exports.storeSecret = exports.createKeyring = exports.keyring = exports.SoftwareKeyProvider = exports.buildBundleFromParts = exports.MultiDeviceSync = exports.BACKUP_VERSION = exports.restoreBackup = exports.createBackup = exports.gfEval = exports.gfDiv = exports.gfMul = exports.verifySharesConsistent = exports.shamirCombine = exports.shamirSplit = exports.canonicalCredentialBytes = exports.validateCredential = void 0;
// ----- types & errors -----
__exportStar(require("./types.js"), exports);
__exportStar(require("./errors.js"), exports);
// ----- logging -----
var logging_js_1 = require("./logging.js");
Object.defineProperty(exports, "ConsoleLogger", { enumerable: true, get: function () { return logging_js_1.ConsoleLogger; } });
Object.defineProperty(exports, "SilentLogger", { enumerable: true, get: function () { return logging_js_1.SilentLogger; } });
Object.defineProperty(exports, "scrubMetadata", { enumerable: true, get: function () { return logging_js_1.scrubMetadata; } });
Object.defineProperty(exports, "shouldScrubField", { enumerable: true, get: function () { return logging_js_1.shouldScrubField; } });
Object.defineProperty(exports, "SCRUBBED_FIELD_NAMES", { enumerable: true, get: function () { return logging_js_1.SCRUBBED_FIELD_NAMES; } });
// ----- crypto -----
var hashing_js_1 = require("./crypto/hashing.js");
Object.defineProperty(exports, "sha256", { enumerable: true, get: function () { return hashing_js_1.sha256; } });
Object.defineProperty(exports, "sha512", { enumerable: true, get: function () { return hashing_js_1.sha512; } });
Object.defineProperty(exports, "hmac", { enumerable: true, get: function () { return hashing_js_1.hmac; } });
Object.defineProperty(exports, "hkdf", { enumerable: true, get: function () { return hashing_js_1.hkdf; } });
Object.defineProperty(exports, "pbkdf2", { enumerable: true, get: function () { return hashing_js_1.pbkdf2; } });
Object.defineProperty(exports, "constantTimeEqual", { enumerable: true, get: function () { return hashing_js_1.constantTimeEqual; } });
var symmetric_js_1 = require("./crypto/symmetric.js");
Object.defineProperty(exports, "encrypt", { enumerable: true, get: function () { return symmetric_js_1.encrypt; } });
Object.defineProperty(exports, "decrypt", { enumerable: true, get: function () { return symmetric_js_1.decrypt; } });
Object.defineProperty(exports, "AES_256_KEY_BYTES", { enumerable: true, get: function () { return symmetric_js_1.AES_256_KEY_BYTES; } });
Object.defineProperty(exports, "AES_GCM_IV_BYTES", { enumerable: true, get: function () { return symmetric_js_1.AES_GCM_IV_BYTES; } });
Object.defineProperty(exports, "AES_GCM_TAG_BYTES", { enumerable: true, get: function () { return symmetric_js_1.AES_GCM_TAG_BYTES; } });
var keys_js_1 = require("./crypto/keys.js");
Object.defineProperty(exports, "generateKeyPair", { enumerable: true, get: function () { return keys_js_1.generateKeyPair; } });
Object.defineProperty(exports, "deriveKey", { enumerable: true, get: function () { return keys_js_1.deriveKey; } });
Object.defineProperty(exports, "importKeyPem", { enumerable: true, get: function () { return keys_js_1.importKeyPem; } });
Object.defineProperty(exports, "exportKeyPem", { enumerable: true, get: function () { return keys_js_1.exportKeyPem; } });
Object.defineProperty(exports, "getKeyFingerprint", { enumerable: true, get: function () { return keys_js_1.getKeyFingerprint; } });
Object.defineProperty(exports, "algorithmFor", { enumerable: true, get: function () { return keys_js_1.algorithmFor; } });
Object.defineProperty(exports, "DEFAULT_RSA_MODULUS", { enumerable: true, get: function () { return keys_js_1.DEFAULT_RSA_MODULUS; } });
Object.defineProperty(exports, "DEFAULT_RSA_EXPONENT", { enumerable: true, get: function () { return keys_js_1.DEFAULT_RSA_EXPONENT; } });
Object.defineProperty(exports, "DEFAULT_EC_CURVE", { enumerable: true, get: function () { return keys_js_1.DEFAULT_EC_CURVE; } });
var signatures_js_1 = require("./crypto/signatures.js");
Object.defineProperty(exports, "sign", { enumerable: true, get: function () { return signatures_js_1.sign; } });
Object.defineProperty(exports, "verify", { enumerable: true, get: function () { return signatures_js_1.verify; } });
Object.defineProperty(exports, "proofTypeFor", { enumerable: true, get: function () { return signatures_js_1.proofTypeFor; } });
// ----- identity -----
var identity_js_1 = require("./identity/identity.js");
Object.defineProperty(exports, "Identity", { enumerable: true, get: function () { return identity_js_1.Identity; } });
Object.defineProperty(exports, "deriveDidKey", { enumerable: true, get: function () { return identity_js_1.deriveDidKey; } });
Object.defineProperty(exports, "base58Encode", { enumerable: true, get: function () { return identity_js_1.base58Encode; } });
var roles_js_1 = require("./identity/roles.js");
Object.defineProperty(exports, "Role", { enumerable: true, get: function () { return roles_js_1.Role; } });
Object.defineProperty(exports, "RoleManager", { enumerable: true, get: function () { return roles_js_1.RoleManager; } });
Object.defineProperty(exports, "ALL_ROLES", { enumerable: true, get: function () { return roles_js_1.ALL_ROLES; } });
Object.defineProperty(exports, "parseRole", { enumerable: true, get: function () { return roles_js_1.parseRole; } });
Object.defineProperty(exports, "newRoleAssignmentId", { enumerable: true, get: function () { return roles_js_1.newRoleAssignmentId; } });
// ----- access -----
var policy_js_1 = require("./access/policy.js");
Object.defineProperty(exports, "AccessPolicySet", { enumerable: true, get: function () { return policy_js_1.AccessPolicySet; } });
Object.defineProperty(exports, "defaultPolicySet", { enumerable: true, get: function () { return policy_js_1.defaultPolicySet; } });
Object.defineProperty(exports, "matchResource", { enumerable: true, get: function () { return policy_js_1.matchResource; } });
var enforcer_js_1 = require("./access/enforcer.js");
Object.defineProperty(exports, "AccessEnforcer", { enumerable: true, get: function () { return enforcer_js_1.AccessEnforcer; } });
var grants_js_1 = require("./access/grants.js");
Object.defineProperty(exports, "CapabilityGrantManager", { enumerable: true, get: function () { return grants_js_1.CapabilityGrantManager; } });
// ----- wallet -----
var wallet_js_1 = require("./wallet/wallet.js");
Object.defineProperty(exports, "KeyringWallet", { enumerable: true, get: function () { return wallet_js_1.KeyringWallet; } });
Object.defineProperty(exports, "WALLET_PBKDF2_ITERATIONS", { enumerable: true, get: function () { return wallet_js_1.WALLET_PBKDF2_ITERATIONS; } });
Object.defineProperty(exports, "WALLET_SALT_BYTES", { enumerable: true, get: function () { return wallet_js_1.WALLET_SALT_BYTES; } });
Object.defineProperty(exports, "WALLET_MASTER_KEY_BYTES", { enumerable: true, get: function () { return wallet_js_1.WALLET_MASTER_KEY_BYTES; } });
var storage_js_1 = require("./wallet/storage.js");
Object.defineProperty(exports, "InMemoryStorage", { enumerable: true, get: function () { return storage_js_1.InMemoryStorage; } });
Object.defineProperty(exports, "FileStorage", { enumerable: true, get: function () { return storage_js_1.FileStorage; } });
Object.defineProperty(exports, "assertValidKey", { enumerable: true, get: function () { return storage_js_1.assertValidKey; } });
var credentials_js_1 = require("./wallet/credentials.js");
Object.defineProperty(exports, "issueCredential", { enumerable: true, get: function () { return credentials_js_1.issueCredential; } });
Object.defineProperty(exports, "verifyCredential", { enumerable: true, get: function () { return credentials_js_1.verifyCredential; } });
Object.defineProperty(exports, "validateCredential", { enumerable: true, get: function () { return credentials_js_1.validateCredential; } });
Object.defineProperty(exports, "canonicalCredentialBytes", { enumerable: true, get: function () { return credentials_js_1.canonicalCredentialBytes; } });
// ----- recovery -----
var recovery_js_1 = require("./recovery/recovery.js");
Object.defineProperty(exports, "shamirSplit", { enumerable: true, get: function () { return recovery_js_1.shamirSplit; } });
Object.defineProperty(exports, "shamirCombine", { enumerable: true, get: function () { return recovery_js_1.shamirCombine; } });
Object.defineProperty(exports, "verifySharesConsistent", { enumerable: true, get: function () { return recovery_js_1.verifySharesConsistent; } });
Object.defineProperty(exports, "gfMul", { enumerable: true, get: function () { return recovery_js_1.gfMul; } });
Object.defineProperty(exports, "gfDiv", { enumerable: true, get: function () { return recovery_js_1.gfDiv; } });
Object.defineProperty(exports, "gfEval", { enumerable: true, get: function () { return recovery_js_1.gfEval; } });
var backup_js_1 = require("./recovery/backup.js");
Object.defineProperty(exports, "createBackup", { enumerable: true, get: function () { return backup_js_1.createBackup; } });
Object.defineProperty(exports, "restoreBackup", { enumerable: true, get: function () { return backup_js_1.restoreBackup; } });
Object.defineProperty(exports, "BACKUP_VERSION", { enumerable: true, get: function () { return backup_js_1.BACKUP_VERSION; } });
// ----- sync -----
var multi_device_js_1 = require("./sync/multi-device.js");
Object.defineProperty(exports, "MultiDeviceSync", { enumerable: true, get: function () { return multi_device_js_1.MultiDeviceSync; } });
Object.defineProperty(exports, "buildBundleFromParts", { enumerable: true, get: function () { return multi_device_js_1.buildBundleFromParts; } });
var software_fallback_js_1 = require("./hardware/software-fallback.js");
Object.defineProperty(exports, "SoftwareKeyProvider", { enumerable: true, get: function () { return software_fallback_js_1.SoftwareKeyProvider; } });
// ----- tool-grade facade (composition surface for telepathy/agents) -----
var facade_js_1 = require("./facade.js");
Object.defineProperty(exports, "keyring", { enumerable: true, get: function () { return facade_js_1.keyring; } });
Object.defineProperty(exports, "createKeyring", { enumerable: true, get: function () { return facade_js_1.createKeyring; } });
Object.defineProperty(exports, "storeSecret", { enumerable: true, get: function () { return facade_js_1.storeSecret; } });
Object.defineProperty(exports, "retrieveSecret", { enumerable: true, get: function () { return facade_js_1.retrieveSecret; } });
Object.defineProperty(exports, "sealKeyring", { enumerable: true, get: function () { return facade_js_1.sealKeyring; } });
Object.defineProperty(exports, "openKeyring", { enumerable: true, get: function () { return facade_js_1.openKeyring; } });
Object.defineProperty(exports, "signMessage", { enumerable: true, get: function () { return facade_js_1.signMessage; } });
Object.defineProperty(exports, "verifyMessage", { enumerable: true, get: function () { return facade_js_1.verifyMessage; } });
Object.defineProperty(exports, "grantAccess", { enumerable: true, get: function () { return facade_js_1.grantAccess; } });
Object.defineProperty(exports, "checkAccess", { enumerable: true, get: function () { return facade_js_1.checkAccess; } });
//# sourceMappingURL=index.js.map