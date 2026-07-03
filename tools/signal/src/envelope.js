/**
 * Secure message envelopes for the Manya Signal tool.
 * Creates, encrypts, signs, and verifies message envelopes.
 */

import {
  createCipheriv, createDecipheriv, createSign, createVerify,
  createHmac, pbkdf2Sync, randomBytes, generateKeyPairSync,
} from 'node:crypto';

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 600000;
const KEY_LENGTH = 32;
const ENVELOPE_MAGIC = 'SIGNAL1';

/**
 * Derives a 256-bit key from a passphrase using PBKDF2-SHA256.
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
 * Generates an RSA key pair for signing/verifying.
 * @param {object} [options] - Key generation options.
 * @param {number} [options.modulusLength=2048] - Key size in bits.
 * @returns {{ privateKey: string, publicKey: string }}
 */
export function generateSigningKeys(options = {}) {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: options.modulusLength || 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { privateKey, publicKey };
}

/**
 * Composes a message envelope with metadata.
 * @param {string|Buffer} payload - The message content.
 * @param {object} [options] - Envelope options.
 * @param {string} [options.sender] - Sender identifier.
 * @param {string[]} [options.recipients] - Intended recipient identifiers.
 * @param {string} [options.channel] - Channel name for broadcast.
 * @param {string} [options.priority='normal'] - Priority level: 'low', 'normal', 'high', 'critical'.
 * @param {string} [options.type='message'] - Message type.
 * @param {object} [options.headers] - Custom headers.
 * @returns {{ id: string, payload: string, sender: string, recipients: string[], channel: string|null, priority: string, type: string, headers: object, createdAt: string, version: number }}
 */
export function compose(payload, options = {}) {
  if (!payload) {
    throw new Error('Payload is required');
  }
  const content = Buffer.isBuffer(payload) ? payload.toString('base64') : String(payload);
  return {
    id: randomBytes(12).toString('hex'),
    payload: content,
    sender: options.sender || 'anonymous',
    recipients: options.recipients || [],
    channel: options.channel || null,
    priority: options.priority || 'normal',
    type: options.type || 'message',
    headers: options.headers || {},
    createdAt: new Date().toISOString(),
    version: 1,
  };
}

/**
 * Seals (encrypts) a message envelope using AES-256-GCM.
 * @param {object} envelope - The envelope to seal.
 * @param {string} passphrase - Encryption passphrase (minimum 8 characters).
 * @returns {Buffer} Sealed envelope buffer.
 */
export function seal(envelope, passphrase) {
  if (!envelope || !envelope.id || !envelope.payload) {
    throw new Error('Invalid envelope: missing id or payload');
  }
  const serializable = {
    id: envelope.id,
    payload: envelope.payload,
    sender: envelope.sender,
    recipients: envelope.recipients,
    channel: envelope.channel,
    priority: envelope.priority,
    type: envelope.type,
    headers: envelope.headers,
    createdAt: envelope.createdAt,
    version: envelope.version,
  };
  if (envelope.signature) serializable.signature = envelope.signature;
  if (envelope.hmac) serializable.hmac = envelope.hmac;
  const payload = Buffer.from(JSON.stringify(serializable), 'utf8');
  const { key, salt } = deriveKey(passphrase);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const magic = Buffer.from(ENVELOPE_MAGIC, 'utf8');
  const version = Buffer.from([envelope.version]);
  return Buffer.concat([magic, version, salt, iv, authTag, encrypted]);
}

/**
 * Opens (decrypts) a sealed envelope.
 * @param {Buffer} sealedBuffer - The sealed envelope buffer.
 * @param {string} passphrase - Decryption passphrase.
 * @returns {{ envelope: object, metadata: { id: string, sender: string, priority: string, type: string, createdAt: string } }}
 */
export function open(sealedBuffer, passphrase) {
  if (!Buffer.isBuffer(sealedBuffer) || sealedBuffer.length < ENVELOPE_MAGIC.length + 1 + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid sealed envelope buffer');
  }
  let offset = 0;
  const magic = sealedBuffer.subarray(offset, offset + ENVELOPE_MAGIC.length).toString('utf8');
  offset += ENVELOPE_MAGIC.length;
  if (magic !== ENVELOPE_MAGIC) {
    throw new Error('Invalid envelope magic bytes');
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
    throw new Error('Failed to decrypt envelope: wrong passphrase or corrupted data');
  }
  const envelope = JSON.parse(decrypted.toString('utf8'));
  return {
    envelope,
    metadata: {
      id: envelope.id,
      sender: envelope.sender,
      priority: envelope.priority,
      type: envelope.type,
      createdAt: envelope.createdAt,
    },
  };
}

/**
 * Signs a message envelope with a private key.
 * @param {object} envelope - The envelope to sign.
 * @param {string} privateKey - RSA private key in PEM format.
 * @returns {{ ...envelope, signature: { algorithm: string, value: string, signedAt: string } }}
 */
export function sign(envelope, privateKey) {
  if (!envelope || !envelope.id || !envelope.payload) {
    throw new Error('Invalid envelope: missing id or payload');
  }
  if (!privateKey || typeof privateKey !== 'string') {
    throw new Error('Private key is required');
  }
  const signer = createSign('SHA256');
  signer.update(JSON.stringify({
    id: envelope.id,
    payload: envelope.payload,
    sender: envelope.sender,
    createdAt: envelope.createdAt,
  }));
  signer.end();
  const signatureValue = signer.sign(privateKey, 'hex');
  return {
    ...envelope,
    signature: {
      algorithm: 'RSA-SHA256',
      value: signatureValue,
      signedAt: new Date().toISOString(),
    },
  };
}

/**
 * Verifies the signature of a signed envelope.
 * @param {object} envelope - The signed envelope.
 * @param {string} publicKey - RSA public key in PEM format.
 * @returns {{ valid: boolean, algorithm: string, signedAt: string }}
 */
export function verifySignature(envelope, publicKey) {
  if (!envelope || !envelope.signature) {
    throw new Error('Envelope has no signature');
  }
  if (!publicKey || typeof publicKey !== 'string') {
    throw new Error('Public key is required');
  }
  const verifier = createVerify('SHA256');
  verifier.update(JSON.stringify({
    id: envelope.id,
    payload: envelope.payload,
    sender: envelope.sender,
    createdAt: envelope.createdAt,
  }));
  verifier.end();
  const valid = verifier.verify(publicKey, envelope.signature.value, 'hex');
  return {
    valid,
    algorithm: envelope.signature.algorithm,
    signedAt: envelope.signature.signedAt,
  };
}

/**
 * Computes an HMAC for message integrity verification (lightweight alternative to RSA signatures).
 * @param {object} envelope - The envelope to authenticate.
 * @param {string} secret - Shared secret for HMAC.
 * @returns {{ ...envelope, hmac: { algorithm: string, value: string } }}
 */
export function hmac(envelope, secret) {
  if (!envelope || !envelope.id || !envelope.payload) {
    throw new Error('Invalid envelope: missing id or payload');
  }
  if (!secret) {
    throw new Error('Secret is required');
  }
  const value = createHmac('sha256', secret)
    .update(JSON.stringify({ id: envelope.id, payload: envelope.payload, sender: envelope.sender, createdAt: envelope.createdAt }))
    .digest('hex');
  return {
    ...envelope,
    hmac: { algorithm: 'HMAC-SHA256', value },
  };
}

/**
 * Verifies the HMAC of an envelope.
 * @param {object} envelope - The envelope with HMAC.
 * @param {string} secret - Shared secret for HMAC.
 * @returns {{ valid: boolean, algorithm: string }}
 */
export function verifyHmac(envelope, secret) {
  if (!envelope || !envelope.hmac) {
    throw new Error('Envelope has no HMAC');
  }
  if (!secret) {
    throw new Error('Secret is required');
  }
  const expected = createHmac('sha256', secret)
    .update(JSON.stringify({ id: envelope.id, payload: envelope.payload, sender: envelope.sender, createdAt: envelope.createdAt }))
    .digest('hex');
  return {
    valid: envelope.hmac.value === expected,
    algorithm: envelope.hmac.algorithm,
  };
}
