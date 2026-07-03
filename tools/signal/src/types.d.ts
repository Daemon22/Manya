/**
 * Type declarations for @manya/signal
 */

// ---------------------------------------------------------------------------
// Envelope types
// ---------------------------------------------------------------------------

/** Priority level for a message envelope. */
export type Priority = 'low' | 'normal' | 'high' | 'critical';

/** A composed message envelope. */
export interface Envelope {
  /** Unique envelope identifier (24-char hex). */
  id: string;
  /** The message payload (base64-encoded if original payload was a Buffer). */
  payload: string;
  /** Sender identifier. */
  sender: string;
  /** Intended recipient identifiers. */
  recipients: string[];
  /** Channel name for broadcast, or null. */
  channel: string | null;
  /** Priority level. */
  priority: Priority;
  /** Message type. */
  type: string;
  /** Custom headers. */
  headers: Record<string, unknown>;
  /** ISO 8601 timestamp of when the envelope was created. */
  createdAt: string;
  /** Envelope format version. */
  version: number;
}

/** RSA signature attached to a signed envelope. */
export interface Signature {
  /** Signature algorithm (e.g. 'RSA-SHA256'). */
  algorithm: string;
  /** Hex-encoded signature value. */
  value: string;
  /** ISO 8601 timestamp of when the signature was created. */
  signedAt: string;
}

/** A signed message envelope with an RSA cryptographic signature. */
export interface SignedEnvelope extends Envelope {
  signature: Signature;
}

/** HMAC authentication tag attached to an envelope. */
export interface HmacTag {
  /** HMAC algorithm (e.g. 'HMAC-SHA256'). */
  algorithm: string;
  /** Hex-encoded HMAC value. */
  value: string;
}

/** An envelope with an HMAC integrity tag. */
export interface HmacEnvelope extends Envelope {
  hmac: HmacTag;
}

// ---------------------------------------------------------------------------
// Options types
// ---------------------------------------------------------------------------

/** Options for compose(). */
export interface ComposeOptions {
  /** Sender identifier. Defaults to 'anonymous'. */
  sender?: string;
  /** Intended recipient identifiers. Defaults to []. */
  recipients?: string[];
  /** Channel name for broadcast. Defaults to null. */
  channel?: string;
  /** Priority level: 'low', 'normal', 'high', 'critical'. Defaults to 'normal'. */
  priority?: Priority;
  /** Message type. Defaults to 'message'. */
  type?: string;
  /** Custom headers. Defaults to {}. */
  headers?: Record<string, unknown>;
}

/** Options for generateSigningKeys(). */
export interface SigningKeyOptions {
  /** RSA key size in bits. Defaults to 2048. */
  modulusLength?: number;
}

/** Result of generateSigningKeys(). */
export interface SigningKeyPair {
  /** RSA private key in PEM format. */
  privateKey: string;
  /** RSA public key in PEM format. */
  publicKey: string;
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/** Metadata extracted when opening a sealed envelope. */
export interface EnvelopeMetadata {
  /** Envelope identifier. */
  id: string;
  /** Sender identifier. */
  sender: string;
  /** Priority level. */
  priority: string;
  /** Message type. */
  type: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
}

/** Result of open(). */
export interface OpenResult {
  /** The decrypted envelope. */
  envelope: Envelope;
  /** Extracted metadata. */
  metadata: EnvelopeMetadata;
}

/** Result of verifySignature(). */
export interface VerifySignatureResult {
  /** Whether the signature is valid. */
  valid: boolean;
  /** Signature algorithm used. */
  algorithm: string;
  /** ISO 8601 timestamp of when the signature was created. */
  signedAt: string;
}

/** Result of verifyHmac(). */
export interface VerifyHmacResult {
  /** Whether the HMAC is valid. */
  valid: boolean;
  /** HMAC algorithm used. */
  algorithm: string;
}

// ---------------------------------------------------------------------------
// Function declarations
// ---------------------------------------------------------------------------

/**
 * Generates an RSA key pair for signing/verifying message envelopes.
 * @param options - Key generation options.
 * @throws {Error} If key generation fails.
 */
export function generateSigningKeys(options?: SigningKeyOptions): SigningKeyPair;

/**
 * Composes a message envelope with metadata.
 * @param payload - The message content (string or Buffer).
 * @param options - Envelope options.
 * @throws {Error} If payload is missing or empty.
 */
export function compose(payload: string | Buffer, options?: ComposeOptions): Envelope;

/**
 * Seals (encrypts) a message envelope using AES-256-GCM.
 * @param envelope - The envelope to seal.
 * @param passphrase - Encryption passphrase (minimum 8 characters).
 * @throws {Error} If envelope is invalid or passphrase is too short.
 */
export function seal(envelope: Envelope, passphrase: string): Buffer;

/**
 * Opens (decrypts) a sealed envelope.
 * @param sealedBuffer - The sealed envelope buffer.
 * @param passphrase - Decryption passphrase.
 * @throws {Error} If buffer is invalid, magic bytes mismatch, or decryption fails.
 */
export function open(sealedBuffer: Buffer, passphrase: string): OpenResult;

/**
 * Signs a message envelope with an RSA private key.
 * @param envelope - The envelope to sign.
 * @param privateKey - RSA private key in PEM format.
 * @throws {Error} If envelope is invalid or private key is missing.
 */
export function sign(envelope: Envelope, privateKey: string): SignedEnvelope;

/**
 * Verifies the RSA signature of a signed envelope.
 * @param envelope - The signed envelope.
 * @param publicKey - RSA public key in PEM format.
 * @throws {Error} If envelope has no signature or public key is missing.
 */
export function verifySignature(envelope: SignedEnvelope, publicKey: string): VerifySignatureResult;

/**
 * Computes an HMAC for message integrity verification.
 * Lightweight alternative to full RSA signatures.
 * @param envelope - The envelope to authenticate.
 * @param secret - Shared secret for HMAC.
 * @throws {Error} If envelope is invalid or secret is missing.
 */
export function hmac(envelope: Envelope, secret: string): HmacEnvelope;

/**
 * Verifies the HMAC of an envelope.
 * @param envelope - The envelope with HMAC.
 * @param secret - Shared secret for HMAC.
 * @throws {Error} If envelope has no HMAC or secret is missing.
 */
export function verifyHmac(envelope: HmacEnvelope, secret: string): VerifyHmacResult;

/** Unified Signal API object. */
export const signal: {
  compose: typeof compose;
  seal: typeof seal;
  open: typeof open;
  sign: typeof sign;
  verifySignature: typeof verifySignature;
  hmac: typeof hmac;
  verifyHmac: typeof verifyHmac;
  generateSigningKeys: typeof generateSigningKeys;
};

export default typeof signal;
