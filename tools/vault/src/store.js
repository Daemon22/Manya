/**
 * Encrypted key-value store for the Manya Vault tool.
 * Provides secure storage for secrets, config, and credentials.
 */

import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes, createHash } from 'node:crypto';

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 600000;
const KEY_LENGTH = 32;
const VAULT_MAGIC = 'VAULT1';

/**
 * Derives a 256-bit key from a passphrase using PBKDF2-SHA256.
 * @param {string} passphrase - The passphrase (minimum 8 characters).
 * @param {Buffer} [salt] - Optional salt (16 bytes).
 * @returns {{ key: Buffer, salt: Buffer }}
 */
function deriveKey(passphrase, salt) {
  if (!passphrase || passphrase.length < 8) {
    throw new Error('Passphrase must be at least 8 characters');
  }
  const usedSalt = salt || randomBytes(SALT_LENGTH);
  const key = pbkdf2Sync(passphrase, usedSalt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  return { key, salt: usedSalt };
}

/**
 * Creates a new empty vault.
 * @param {string} name - The vault name.
 * @returns {{ name: string, entries: Map, createdAt: string, version: number }}
 */
export function create(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Vault name is required');
  }
  return {
    name,
    entries: new Map(),
    createdAt: new Date().toISOString(),
    version: 1,
  };
}

/**
 * Stores a value in the vault.
 * @param {object} vault - The vault instance.
 * @param {string} key - The key to store under.
 * @param {string|Buffer|object} value - The value to store.
 * @param {object} [options] - Storage options.
 * @param {string[]} [options.tags] - Tags for organization.
 * @param {object} [options.metadata] - Additional metadata.
 * @returns {{ key: string, createdAt: string, updatedAt: string, tags: string[], metadata: object }}
 */
export function put(vault, key, value, options = {}) {
  if (!vault || !(vault.entries instanceof Map)) {
    throw new Error('Invalid vault instance');
  }
  if (!key || typeof key !== 'string') {
    throw new Error('Key must be a non-empty string');
  }
  const existing = vault.entries.get(key);
  const entry = {
    key,
    value: typeof value === 'object' && !Buffer.isBuffer(value) ? JSON.parse(JSON.stringify(value)) : value,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: options.tags || existing?.tags || [],
    metadata: options.metadata || existing?.metadata || {},
  };
  vault.entries.set(key, entry);
  return { key: entry.key, createdAt: entry.createdAt, updatedAt: entry.updatedAt, tags: entry.tags, metadata: entry.metadata };
}

/**
 * Retrieves a value from the vault.
 * @param {object} vault - The vault instance.
 * @param {string} key - The key to retrieve.
 * @returns {string|Buffer|object|undefined} The stored value, or undefined if not found.
 */
export function get(vault, key) {
  if (!vault || !(vault.entries instanceof Map)) {
    throw new Error('Invalid vault instance');
  }
  const entry = vault.entries.get(key);
  return entry ? entry.value : undefined;
}

/**
 * Removes an entry from the vault.
 * @param {object} vault - The vault instance.
 * @param {string} key - The key to remove.
 * @returns {boolean} True if the entry existed and was removed.
 */
export function del(vault, key) {
  if (!vault || !(vault.entries instanceof Map)) {
    throw new Error('Invalid vault instance');
  }
  return vault.entries.delete(key);
}

/**
 * Lists all keys in the vault.
 * @param {object} vault - The vault instance.
 * @returns {string[]} Array of keys.
 */
export function keys(vault) {
  if (!vault || !(vault.entries instanceof Map)) {
    throw new Error('Invalid vault instance');
  }
  return [...vault.entries.keys()];
}

/**
 * Checks if a key exists in the vault.
 * @param {object} vault - The vault instance.
 * @param {string} key - The key to check.
 * @returns {boolean}
 */
export function has(vault, key) {
  if (!vault || !(vault.entries instanceof Map)) {
    throw new Error('Invalid vault instance');
  }
  return vault.entries.has(key);
}

/**
 * Returns the number of entries in the vault.
 * @param {object} vault - The vault instance.
 * @returns {number}
 */
export function size(vault) {
  if (!vault || !(vault.entries instanceof Map)) {
    throw new Error('Invalid vault instance');
  }
  return vault.entries.size;
}

/**
 * Seals (encrypts and serializes) the vault into a binary buffer.
 * Format: MAGIC(6) | VERSION(1) | SALT(16) | IV(12) | AUTH_TAG(16) | ENCRYPTED_DATA(var)
 * @param {object} vault - The vault instance.
 * @param {string} passphrase - Encryption passphrase (minimum 8 characters).
 * @returns {Buffer} The sealed vault buffer.
 */
export function seal(vault, passphrase) {
  if (!vault || !(vault.entries instanceof Map)) {
    throw new Error('Invalid vault instance');
  }
  // Serialize entries to JSON
  const serializable = {
    name: vault.name,
    createdAt: vault.createdAt,
    version: vault.version,
    entries: [...vault.entries.entries()].map(([k, v]) => ({
      key: k,
      value: v.value,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      tags: v.tags,
      metadata: v.metadata,
    })),
  };
  const payload = Buffer.from(JSON.stringify(serializable), 'utf8');
  const { key, salt } = deriveKey(passphrase);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Build the sealed buffer
  const magic = Buffer.from(VAULT_MAGIC, 'utf8');
  const version = Buffer.from([vault.version]);
  return Buffer.concat([magic, version, salt, iv, authTag, encrypted]);
}

/**
 * Opens (decrypts and deserializes) a sealed vault.
 * @param {Buffer} sealedBuffer - The sealed vault buffer.
 * @param {string} passphrase - Decryption passphrase.
 * @returns {{ vault: object, metadata: { name: string, createdAt: string, version: number, entryCount: number } }}
 */
export function open(sealedBuffer, passphrase) {
  if (!Buffer.isBuffer(sealedBuffer) || sealedBuffer.length < VAULT_MAGIC.length + 1 + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid sealed vault buffer');
  }
  let offset = 0;
  const magic = sealedBuffer.subarray(offset, offset + VAULT_MAGIC.length).toString('utf8');
  offset += VAULT_MAGIC.length;
  if (magic !== VAULT_MAGIC) {
    throw new Error('Invalid vault magic bytes');
  }
  const version = sealedBuffer[offset];
  offset += 1;
  const salt = sealedBuffer.subarray(offset, offset + SALT_LENGTH);
  offset += SALT_LENGTH;
  const iv = sealedBuffer.subarray(offset, offset + IV_LENGTH);
  offset += IV_LENGTH;
  const authTag = sealedBuffer.subarray(offset, offset + AUTH_TAG_LENGTH);
  offset += AUTH_TAG_LENGTH;
  const encrypted = sealedBuffer.subarray(offset);
  const { key } = deriveKey(passphrase, salt);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted;
  try {
    decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  } catch (e) {
    throw new Error('Failed to decrypt vault: wrong passphrase or corrupted data');
  }
  const data = JSON.parse(decrypted.toString('utf8'));
  const vault = {
    name: data.name,
    entries: new Map(data.entries.map(e => [e.key, e])),
    createdAt: data.createdAt,
    version: data.version || version,
  };
  return {
    vault,
    metadata: {
      name: vault.name,
      createdAt: vault.createdAt,
      version: vault.version,
      entryCount: vault.entries.size,
    },
  };
}

/**
 * Exports a vault entry's metadata (without the value) for listing purposes.
 * @param {object} vault - The vault instance.
 * @param {string} key - The key to inspect.
 * @returns {object|undefined} Entry metadata or undefined.
 */
export function inspect(vault, key) {
  if (!vault || !(vault.entries instanceof Map)) {
    throw new Error('Invalid vault instance');
  }
  const entry = vault.entries.get(key);
  if (!entry) return undefined;
  return {
    key: entry.key,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    tags: entry.tags,
    metadata: entry.metadata,
  };
}

/**
 * Searches vault entries by tags.
 * @param {object} vault - The vault instance.
 * @param {string[]} tags - Tags to search for (matches any).
 * @returns {Array} Matching entries with values.
 */
export function search(vault, tags) {
  if (!vault || !(vault.entries instanceof Map)) {
    throw new Error('Invalid vault instance');
  }
  if (!Array.isArray(tags) || tags.length === 0) {
    throw new Error('Tags must be a non-empty array');
  }
  const results = [];
  for (const [, entry] of vault.entries) {
    if (entry.tags.some(t => tags.includes(t))) {
      results.push(entry);
    }
  }
  return results;
}
