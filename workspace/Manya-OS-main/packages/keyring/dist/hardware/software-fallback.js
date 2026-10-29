"use strict";
/**
 * @manya-os/keyring — software key provider (default fallback).
 *
 * Stores private keys in process memory. Suitable for development, tests,
 * and trusted environments where hardware-backed storage is unavailable.
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
exports.algorithmFor = exports.SoftwareKeyProvider = void 0;
const crypto = __importStar(require("crypto"));
const crypto_1 = require("crypto");
const errors_js_1 = require("../errors.js");
const keys_js_1 = require("../crypto/keys.js");
Object.defineProperty(exports, "algorithmFor", { enumerable: true, get: function () { return keys_js_1.algorithmFor; } });
const signatures_js_1 = require("../crypto/signatures.js");
/**
 * Software implementation of {@link HardwareKeyProvider}. Keys live in
 * process memory; they are never persisted to disk.
 */
class SoftwareKeyProvider {
    keys = new Map();
    /** @inheritdoc */
    isAvailable() {
        return true;
    }
    /** @inheritdoc */
    async generateKeyPair(algo, keyIdHint) {
        const { publicKey, privateKey, algorithm } = (0, keys_js_1.generateKeyPair)(algo);
        const keyId = keyIdHint ?? 'sw-' + (0, crypto_1.randomUUID)();
        if (this.keys.has(keyId)) {
            throw new errors_js_1.KeyGenerationError(`SoftwareKeyProvider.generateKeyPair: keyId '${keyId}' already exists`);
        }
        this.keys.set(keyId, { publicKey, privateKey, algorithm });
        return {
            keyId,
            publicKeyPem: (0, keys_js_1.exportKeyPem)(publicKey, 'public'),
            algorithm,
        };
    }
    /** @inheritdoc */
    async sign(keyId, data) {
        const entry = this.keys.get(keyId);
        if (!entry) {
            throw new errors_js_1.HardwareKeyError(`SoftwareKeyProvider.sign: unknown keyId '${keyId}'`);
        }
        const hex = (0, signatures_js_1.sign)(entry.privateKey, data, entry.algorithm);
        return Buffer.from(hex, 'hex');
    }
    /** @inheritdoc */
    async verify(keyId, data, signature) {
        const entry = this.keys.get(keyId);
        if (!entry) {
            throw new errors_js_1.HardwareKeyError(`SoftwareKeyProvider.verify: unknown keyId '${keyId}'`);
        }
        return (0, signatures_js_1.verify)(entry.publicKey, data, signature, entry.algorithm);
    }
    /** @inheritdoc */
    async deleteKey(keyId) {
        this.keys.delete(keyId);
    }
    /** @inheritdoc */
    async hasKey(keyId) {
        return this.keys.has(keyId);
    }
    // ----- software-specific helpers (used internally by the wallet) -----
    /**
     * Replace the private key stored under `keyId` with the given key. Also
     * derives the matching public key from the new private key so that
     * subsequent `verify` calls use the correct public key. Used by the wallet
     * to register an externally-generated keypair with the provider.
     * @internal
     */
    replaceKey(keyId, privateKey) {
        const entry = this.keys.get(keyId);
        if (!entry) {
            throw new errors_js_1.HardwareKeyError(`SoftwareKeyProvider.replaceKey: unknown keyId '${keyId}'`);
        }
        const publicKey = crypto.createPublicKey(privateKey);
        this.keys.set(keyId, { ...entry, privateKey, publicKey });
    }
    /**
     * Get the underlying private KeyObject for `keyId`. Only available on the
     * software provider — hardware providers never expose this.
     * @internal
     */
    getPrivateKey(keyId) {
        return this.keys.get(keyId)?.privateKey;
    }
    /**
     * Get the underlying public KeyObject for `keyId`.
     * @internal
     */
    getPublicKey(keyId) {
        return this.keys.get(keyId)?.publicKey;
    }
    /**
     * Get the algorithm for `keyId`.
     * @internal
     */
    getAlgorithm(keyId) {
        return this.keys.get(keyId)?.algorithm;
    }
    /** Number of keys currently held. */
    get size() {
        return this.keys.size;
    }
    /** Wipe all keys from memory. */
    clear() {
        this.keys.clear();
    }
    /**
     * Directly import an existing keypair under a chosen keyId. Returns the
     * keyId.
     */
    importExistingKey(publicKey, privateKey, algorithm, keyIdHint) {
        const keyId = keyIdHint ?? 'sw-' + (0, crypto_1.randomUUID)();
        if (this.keys.has(keyId)) {
            throw new errors_js_1.KeyGenerationError(`SoftwareKeyProvider.importExistingKey: keyId '${keyId}' already exists`);
        }
        this.keys.set(keyId, { publicKey, privateKey, algorithm });
        return keyId;
    }
}
exports.SoftwareKeyProvider = SoftwareKeyProvider;
//# sourceMappingURL=software-fallback.js.map