"use strict";
/**
 * @manya-os/keyring — encrypted storage backends.
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
exports.FileStorage = exports.InMemoryStorage = void 0;
exports.assertValidKey = assertValidKey;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const errors_js_1 = require("../errors.js");
/**
 * In-memory storage. Useful for tests and ephemeral wallets.
 */
class InMemoryStorage {
    map = new Map();
    /** @inheritdoc */
    async get(key) {
        const v = this.map.get(key);
        return v ? Buffer.from(v) : null;
    }
    /** @inheritdoc */
    async put(key, value) {
        if (!Buffer.isBuffer(value)) {
            throw new errors_js_1.StorageError('InMemoryStorage.put: value must be a Buffer');
        }
        // Defensive copy so external mutations don't leak.
        this.map.set(key, Buffer.from(value));
    }
    /** @inheritdoc */
    async delete(key) {
        this.map.delete(key);
    }
    /** @inheritdoc */
    async list(prefix) {
        const keys = Array.from(this.map.keys());
        if (!prefix)
            return keys.sort();
        return keys.filter((k) => k.startsWith(prefix)).sort();
    }
    /** Number of stored entries. */
    get size() {
        return this.map.size;
    }
    /** Remove all entries. */
    clear() {
        this.map.clear();
    }
}
exports.InMemoryStorage = InMemoryStorage;
/**
 * Validate a storage key. We allow alphanumerics, `:`, `_`, `-`, `.`.
 * The `:` separator is converted to a path separator on disk; `/` is not
 * allowed to keep the mapping bijective.
 * @internal
 */
function assertValidKey(key) {
    if (typeof key !== 'string' || key.length === 0) {
        throw new errors_js_1.StorageError('storage key must be a non-empty string');
    }
    if (key.length > 1024) {
        throw new errors_js_1.StorageError('storage key too long (>1024 chars)');
    }
    if (!/^[A-Za-z0-9:_\-.]+$/.test(key)) {
        throw new errors_js_1.StorageError(`storage key contains forbidden characters: '${key}'`);
    }
    if (key.includes('..')) {
        throw new errors_js_1.StorageError('storage key must not contain path-traversal sequences');
    }
}
/**
 * File-backed storage. Each key maps to a file under `dirPath`. Writes are
 * atomic (tmp file + rename).
 */
class FileStorage {
    dirPath;
    constructor(dirPath) {
        this.dirPath = dirPath;
        if (typeof dirPath !== 'string' || dirPath.length === 0) {
            throw new errors_js_1.StorageError('FileStorage: dirPath must be a non-empty string');
        }
    }
    /** Ensure the storage directory exists. Call once at startup. */
    async ensureInitialized() {
        try {
            await fs.mkdir(this.dirPath, { recursive: true });
        }
        catch (err) {
            throw new errors_js_1.StorageError(`FileStorage.init: mkdir failed: ${err.message}`, err);
        }
    }
    /** @inheritdoc */
    async get(key) {
        assertValidKey(key);
        const filePath = this.pathFor(key);
        try {
            return await fs.readFile(filePath);
        }
        catch (err) {
            const e = err;
            if (e && e.code === 'ENOENT')
                return null;
            throw new errors_js_1.StorageError(`FileStorage.get('${key}') failed: ${err.message}`, err);
        }
    }
    /** @inheritdoc */
    async put(key, value) {
        assertValidKey(key);
        if (!Buffer.isBuffer(value)) {
            throw new errors_js_1.StorageError('FileStorage.put: value must be a Buffer');
        }
        const filePath = this.pathFor(key);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        // Atomic write: write to temp file in the same directory, fsync, rename.
        const tmpPath = filePath + '.tmp.' + crypto.randomBytes(6).toString('hex');
        const fd = await fs.open(tmpPath, 'w');
        try {
            await fd.writeFile(value);
            try {
                await fd.sync();
            }
            catch {
                // fsync best-effort on some platforms; not fatal.
            }
        }
        finally {
            await fd.close();
        }
        try {
            await fs.rename(tmpPath, filePath);
        }
        catch (err) {
            try {
                await fs.unlink(tmpPath);
            }
            catch { /* ignore */ }
            throw new errors_js_1.StorageError(`FileStorage.put('${key}'): rename failed: ${err.message}`, err);
        }
    }
    /** @inheritdoc */
    async delete(key) {
        assertValidKey(key);
        const filePath = this.pathFor(key);
        try {
            await fs.unlink(filePath);
        }
        catch (err) {
            const e = err;
            if (e && e.code === 'ENOENT')
                return;
            throw new errors_js_1.StorageError(`FileStorage.delete('${key}') failed: ${err.message}`, err);
        }
    }
    /** @inheritdoc */
    async list(prefix) {
        const results = [];
        const stack = [this.dirPath];
        while (stack.length > 0) {
            const dir = stack.pop();
            let entries;
            try {
                entries = await fs.readdir(dir, { withFileTypes: true });
            }
            catch (err) {
                const e = err;
                if (e && e.code === 'ENOENT')
                    continue;
                throw new errors_js_1.StorageError(`FileStorage.list: readdir failed: ${err.message}`, err);
            }
            for (const entry of entries) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    stack.push(full);
                }
                else if (entry.isFile() && !entry.name.endsWith('.tmp')) {
                    // Convert back to a logical key. The on-disk path separator is
                    // mapped back to `:` to round-trip the original key.
                    const rel = path.relative(this.dirPath, full);
                    const key = rel.split(path.sep).join(':');
                    if (!prefix || key.startsWith(prefix)) {
                        results.push(key);
                    }
                }
            }
        }
        return results.sort();
    }
    /** Convert a logical key to a filesystem path. */
    pathFor(key) {
        // Replace ':' with '/' so that `manya:keyring:roles:abc` becomes
        // `manya/keyring/roles/abc` on disk.
        const parts = key.split(':').join('/').split('/');
        return path.join(this.dirPath, ...parts);
    }
}
exports.FileStorage = FileStorage;
//# sourceMappingURL=storage.js.map