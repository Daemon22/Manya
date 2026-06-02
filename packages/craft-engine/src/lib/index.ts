/**
 * CRAFT — Nano/Macro Encryption & Compression Engine
 *
 * 7-Fold Encryption Pipeline:
 *   1. Brotli Compression (Q11)
 *   2. Delta Encoding
 *   3. Move-to-Front
 *   4. Run-Length Encoding
 *   5. Byte-Pair Encoding
 *   6. AES-256-GCM Encryption
 *   7. SHA-256 Integrity
 */

// Primary Operations
export { nano } from './nano';
export { macro, peekMetadata } from './macro';

// 7-Fold Compression Engine
export { compress7, decompress7 } from './compress7';
export type { Compress7Result, CompressionStrategy } from './compress7';

// Codec Layer
export { compress, decompress, encrypt, encryptAsync, decrypt, decryptAsync, deriveKey, deriveKeyAsync } from './codec';
export type { EncryptResult } from './codec';

// Integrity Layer
export { checksum, verify } from './integrity';

// Types
export type {
  CraftMetadata,
  NanoResult,
  MacroResult,
  NanoOptions,
  CompressionMode,
} from './types';
export {
  CRAFT_MAGIC,
  CRAFT_VERSION,
  SALT_LENGTH,
  IV_LENGTH,
  AUTH_TAG_LENGTH,
  PBKDF2_ITERATIONS,
  AES_KEY_LENGTH,
} from './types';
