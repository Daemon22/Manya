"use strict";
/**
 * @manya-os/keyring — encrypted backup format.
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
exports.BACKUP_VERSION = void 0;
exports.createBackup = createBackup;
exports.restoreBackup = restoreBackup;
const crypto = __importStar(require("crypto"));
const crypto_1 = require("crypto");
const errors_js_1 = require("../errors.js");
const symmetric_js_1 = require("../crypto/symmetric.js");
const hashing_js_1 = require("../crypto/hashing.js");
/** Backup format version. */
exports.BACKUP_VERSION = 1;
/** PBKDF2 iterations for backup passphrase → key. */
const BACKUP_PBKDF2_ITERATIONS = 210_000;
/** Salt length. */
const BACKUP_SALT_BYTES = 16;
/** Master key length (AES-256). */
const BACKUP_KEY_BYTES = 32;
const BACKUP_AAD = Buffer.from('manya-keyring-backup-v1', 'utf8');
/**
 * Create an encrypted backup of a wallet's public state (identities +
 * credentials). Private keys are excluded — use Shamir secret sharing
 * (see {@link shamirSplit}) for private-key recovery.
 *
 * @param wallet - Wallet to back up.
 * @param passphrase - User passphrase. Used to derive the encryption key
 *   via PBKDF2 (210k iterations, SHA-512).
 * @returns Encrypted backup blob (JSON-serializable).
 */
function createBackup(wallet, passphrase) {
    if (!wallet) {
        throw new errors_js_1.BackupError('createBackup: wallet required');
    }
    if (typeof passphrase !== 'string' || passphrase.length === 0) {
        throw new errors_js_1.BackupError('createBackup: passphrase required');
    }
    const identities = wallet.listIdentities().map((i) => i.serialize());
    const credentials = wallet.listCredentials();
    const primary = wallet.getPrimaryIdentity();
    const payload = {
        version: exports.BACKUP_VERSION,
        backupId: 'backup-' + (0, crypto_1.randomUUID)(),
        createdAt: new Date().toISOString(),
        primaryIdentityId: primary ? primary.id : null,
        identities,
        credentials,
    };
    const salt = crypto.randomBytes(BACKUP_SALT_BYTES);
    const key = (0, hashing_js_1.pbkdf2)(passphrase, salt, BACKUP_PBKDF2_ITERATIONS, BACKUP_KEY_BYTES);
    const plain = Buffer.from(JSON.stringify(payload), 'utf8');
    let enc;
    try {
        enc = (0, symmetric_js_1.encrypt)(key, plain, BACKUP_AAD);
    }
    catch (err) {
        if (err instanceof errors_js_1.EncryptionError)
            throw err;
        throw new errors_js_1.BackupError('createBackup: encryption failed: ' + err.message, err);
    }
    return {
        version: exports.BACKUP_VERSION,
        salt: salt.toString('base64'),
        iv: enc.iv.toString('base64'),
        ciphertext: enc.ciphertext.toString('base64'),
        tag: enc.tag.toString('base64'),
        createdAt: payload.createdAt,
        iterations: BACKUP_PBKDF2_ITERATIONS,
    };
}
/**
 * Restore (decrypt) an encrypted backup blob.
 *
 * Note: this returns the decrypted payload only — it does NOT mutate the
 * wallet. Use {@link KeyringWallet.addCredential} and friends to apply the
 * restored state.
 *
 * @param blob - Encrypted backup.
 * @param passphrase - Passphrase used at creation time.
 * @returns Decrypted payload.
 */
function restoreBackup(blob, passphrase) {
    if (!blob || typeof blob !== 'object') {
        throw new errors_js_1.BackupError('restoreBackup: blob required');
    }
    if (typeof passphrase !== 'string' || passphrase.length === 0) {
        throw new errors_js_1.BackupError('restoreBackup: passphrase required');
    }
    if (blob.version !== exports.BACKUP_VERSION) {
        throw new errors_js_1.BackupError(`restoreBackup: unsupported version ${blob.version}`);
    }
    const salt = Buffer.from(blob.salt, 'base64');
    const iterations = blob.iterations ?? BACKUP_PBKDF2_ITERATIONS;
    const key = (0, hashing_js_1.pbkdf2)(passphrase, salt, iterations, BACKUP_KEY_BYTES);
    let plain;
    try {
        plain = (0, symmetric_js_1.decrypt)(key, Buffer.from(blob.iv, 'base64'), Buffer.from(blob.ciphertext, 'base64'), Buffer.from(blob.tag, 'base64'), BACKUP_AAD);
    }
    catch (err) {
        if (err instanceof errors_js_1.DecryptionError) {
            throw new errors_js_1.BackupError('restoreBackup: decryption failed (wrong passphrase?): ' +
                err.message, err);
        }
        throw new errors_js_1.BackupError('restoreBackup: decryption failed: ' + err.message, err);
    }
    let payload;
    try {
        payload = JSON.parse(plain.toString('utf8'));
    }
    catch (err) {
        throw new errors_js_1.BackupError('restoreBackup: corrupt payload JSON', err);
    }
    if (!payload || payload.version !== exports.BACKUP_VERSION) {
        throw new errors_js_1.BackupError('restoreBackup: payload version mismatch');
    }
    return { payload };
}
//# sourceMappingURL=backup.js.map