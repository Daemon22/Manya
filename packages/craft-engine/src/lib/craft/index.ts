/**
 * ═══════════════════════════════════════════════════════════════
 *  CRAFT — Nano/Macro Encryption & Compression Engine
 *  Package Index — The Living Canvas Edition
 * ═══════════════════════════════════════════════════════════════
 *
 *  7-Fold Encryption Tool:
 *    1. Brotli Compression — maximum quality (Q11)
 *    2. Delta Encoding — sequential data optimization
 *    3. Move-to-Front — recurring symbol optimization
 *    4. Run-Length Encoding — repeated byte collapse
 *    5. Byte-Pair Encoding — frequent pair replacement
 *    6. AES-256-GCM Encryption — authenticated encryption
 *    7. SHA-256 Integrity — lossless verification
 */

// Primary Operations
export { nano } from './nano';
export { macro, peekMetadata } from './macro';

// 7-Fold Compression Engine
export { compress7, decompress7 } from './compress7';
export type { Compress7Result, CompressionStrategy } from './compress7';

// Codec Layer
export { compress, decompress, encrypt, decrypt, deriveKey } from './codec';
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
