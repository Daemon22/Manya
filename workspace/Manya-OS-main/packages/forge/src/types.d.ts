/**
 * Type declarations for @manya-os/forge
 * Key derivation, passphrase strength analysis, and cryptographic key management.
 */

export interface DeriveResult {
  key: Buffer;
  salt: Buffer;
  iterations: number;
  derivedAt: string;
}

export interface StrengthResult {
  score: number;
  verdict: string;
  suggestions: string[];
  entropyBits: number;
}

export function deriveKeyPair(passphrase: string, salt?: Buffer, iterations?: number): DeriveResult;
export function deriveKeyPairAsync(passphrase: string, salt?: Buffer, iterations?: number): Promise<DeriveResult>;
export function rotateKey(oldPassphrase: string, newPassphrase: string, salt?: Buffer, iterations?: number): DeriveResult;
export function scorePassphrase(passphrase: string): StrengthResult;
export function hash(data: string | Buffer, algorithm?: string): string;
export function hashWithSalt(data: string | Buffer, salt?: Buffer, algorithm?: string): string;
export function timingSafeEqual(a: string | Buffer, b: string | Buffer): boolean;
export function timingSafeCompare(a: string, b: string): boolean;

export const forge: {
  strength: typeof scorePassphrase;
  derive: typeof deriveKeyPair;
  deriveAsync: typeof deriveKeyPairAsync;
  rotateKey: typeof rotateKey;
  hash: typeof hash;
  hashWithSalt: typeof hashWithSalt;
  timingSafeEqual: typeof timingSafeEqual;
  timingSafeCompare: typeof timingSafeCompare;
};

export default forge;
