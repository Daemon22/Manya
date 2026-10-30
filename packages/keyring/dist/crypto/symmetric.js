"use strict";
/**
 * @manya-os/keyring — symmetric encryption (AES-256-GCM).
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
exports.AES_GCM_TAG_BYTES = exports.AES_GCM_IV_BYTES = exports.AES_256_KEY_BYTES = void 0;
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto = __importStar(require("crypto"));
const errors_js_1 = require("../errors.js");
/** AES-256-GCM key length in bytes. */
exports.AES_256_KEY_BYTES = 32;
/** AES-256-GCM IV length in bytes (96 bits per NIST SP 800-38D). */
exports.AES_GCM_IV_BYTES = 12;
/** AES-256-GCM authentication-tag length in bytes. */
exports.AES_GCM_TAG_BYTES = 16;
/**
 * Encrypt `plaintext` with AES-256-GCM using a fresh random 96-bit IV.
 *
 * @param key - 32-byte key.
 * @param plaintext - Bytes to encrypt.
 * @param aad - Optional additional authenticated data.
 * @returns IV, ciphertext, and tag.
 * @throws {@link EncryptionError} if `key` is not 32 bytes or encryption fails.
 */
function encrypt(key, plaintext, aad) {
    if (!Buffer.isBuffer(key) || key.length !== exports.AES_256_KEY_BYTES) {
        throw new errors_js_1.EncryptionError(`AES-256-GCM requires a 32-byte key (got ${key?.length ?? 0})`);
    }
    if (!Buffer.isBuffer(plaintext)) {
        throw new errors_js_1.EncryptionError('plaintext must be a Buffer');
    }
    try {
        const iv = crypto.randomBytes(exports.AES_GCM_IV_BYTES);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, {
            authTagLength: exports.AES_GCM_TAG_BYTES,
        });
        if (aad && aad.length > 0) {
            cipher.setAAD(aad);
        }
        const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        const tag = cipher.getAuthTag();
        return { iv, ciphertext, tag };
    }
    catch (err) {
        if (err instanceof errors_js_1.EncryptionError)
            throw err;
        throw new errors_js_1.EncryptionError('aes-256-gcm encrypt failed: ' + err.message, err);
    }
}
/**
 * Decrypt an AES-256-GCM ciphertext.
 *
 * @param key - 32-byte key.
 * @param iv - 12-byte IV used at encryption time.
 * @param ciphertext - Ciphertext bytes.
 * @param tag - 16-byte authentication tag.
 * @param aad - Optional additional authenticated data (must match encryption).
 * @returns Plaintext.
 * @throws {@link DecryptionError} if the key is malformed, the auth tag does
 *   not validate, or any low-level crypto error occurs.
 */
function decrypt(key, iv, ciphertext, tag, aad) {
    if (!Buffer.isBuffer(key) || key.length !== exports.AES_256_KEY_BYTES) {
        throw new errors_js_1.DecryptionError(`AES-256-GCM requires a 32-byte key (got ${key?.length ?? 0})`);
    }
    if (!Buffer.isBuffer(iv) || iv.length !== exports.AES_GCM_IV_BYTES) {
        throw new errors_js_1.DecryptionError(`IV must be ${exports.AES_GCM_IV_BYTES} bytes`);
    }
    if (!Buffer.isBuffer(tag) || tag.length !== exports.AES_GCM_TAG_BYTES) {
        throw new errors_js_1.DecryptionError(`tag must be ${exports.AES_GCM_TAG_BYTES} bytes`);
    }
    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, {
            authTagLength: exports.AES_GCM_TAG_BYTES,
        });
        decipher.setAuthTag(tag);
        if (aad && aad.length > 0) {
            decipher.setAAD(aad);
        }
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    }
    catch (err) {
        if (err instanceof errors_js_1.DecryptionError)
            throw err;
        throw new errors_js_1.DecryptionError('aes-256-gcm decrypt failed: ' + err.message, err);
    }
}
//# sourceMappingURL=symmetric.js.map