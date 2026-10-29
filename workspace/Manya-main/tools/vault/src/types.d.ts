/**
 * Type declarations for @manya/vault
 */

/** A single vault entry. */
export interface VaultEntry {
  key: string;
  value: string | Buffer | Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  metadata: Record<string, unknown>;
}

/** A vault instance returned by create(). */
export interface VaultInstance {
  name: string;
  entries: Map<string, VaultEntry>;
  createdAt: string;
  version: number;
}

/** Options for put(). */
export interface PutOptions {
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/** Result of put() — entry metadata without the value. */
export interface PutResult {
  key: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  metadata: Record<string, unknown>;
}

/** Metadata returned by inspect() — entry info without the value. */
export interface InspectResult {
  key: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  metadata: Record<string, unknown>;
}

/** Metadata returned by open(). */
export interface OpenMetadata {
  name: string;
  createdAt: string;
  version: number;
  entryCount: number;
}

/** Result of open(). */
export interface OpenResult {
  vault: VaultInstance;
  metadata: OpenMetadata;
}

/**
 * Creates a new empty vault.
 * @param name - The vault name.
 * @throws {Error} If name is missing or not a string.
 */
export function create(name: string): VaultInstance;

/**
 * Stores a value in the vault.
 * @param vault - The vault instance.
 * @param key - The key to store under.
 * @param value - The value to store.
 * @param options - Storage options (tags, metadata).
 * @throws {Error} If vault is invalid or key is empty.
 */
export function put(
  vault: VaultInstance,
  key: string,
  value: string | Buffer | Record<string, unknown>,
  options?: PutOptions,
): PutResult;

/**
 * Retrieves a value from the vault.
 * @param vault - The vault instance.
 * @param key - The key to retrieve.
 * @returns The stored value, or undefined if not found.
 */
export function get(
  vault: VaultInstance,
  key: string,
): string | Buffer | Record<string, unknown> | undefined;

/**
 * Removes an entry from the vault.
 * @param vault - The vault instance.
 * @param key - The key to remove.
 * @returns True if the entry existed and was removed.
 */
export function del(vault: VaultInstance, key: string): boolean;

/**
 * Lists all keys in the vault.
 * @param vault - The vault instance.
 * @returns Array of keys.
 */
export function keys(vault: VaultInstance): string[];

/**
 * Checks if a key exists in the vault.
 * @param vault - The vault instance.
 * @param key - The key to check.
 */
export function has(vault: VaultInstance, key: string): boolean;

/**
 * Returns the number of entries in the vault.
 * @param vault - The vault instance.
 */
export function size(vault: VaultInstance): number;

/**
 * Seals (encrypts and serializes) the vault into a binary buffer.
 * Format: MAGIC(6) | VERSION(1) | SALT(16) | IV(12) | AUTH_TAG(16) | ENCRYPTED_DATA(var)
 * @param vault - The vault instance.
 * @param passphrase - Encryption passphrase (minimum 8 characters).
 * @throws {Error} If vault is invalid or passphrase is too short.
 */
export function seal(vault: VaultInstance, passphrase: string): Buffer;

/**
 * Opens (decrypts and deserializes) a sealed vault.
 * @param sealedBuffer - The sealed vault buffer.
 * @param passphrase - Decryption passphrase.
 * @throws {Error} If buffer is invalid, magic bytes mismatch, or decryption fails.
 */
export function open(sealedBuffer: Buffer, passphrase: string): OpenResult;

/**
 * Exports a vault entry's metadata (without the value) for listing purposes.
 * @param vault - The vault instance.
 * @param key - The key to inspect.
 * @returns Entry metadata or undefined if not found.
 */
export function inspect(vault: VaultInstance, key: string): InspectResult | undefined;

/**
 * Searches vault entries by tags.
 * @param vault - The vault instance.
 * @param tags - Tags to search for (matches any).
 * @returns Matching entries with values.
 * @throws {Error} If tags is not a non-empty array.
 */
export function search(vault: VaultInstance, tags: string[]): VaultEntry[];

/** Unified Vault API object. */
export const vault: {
  create: typeof create;
  put: typeof put;
  get: typeof get;
  del: typeof del;
  keys: typeof keys;
  has: typeof has;
  size: typeof size;
  seal: typeof seal;
  open: typeof open;
  inspect: typeof inspect;
  search: typeof search;
};

export default typeof vault;
