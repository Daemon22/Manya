import * as crypto from 'crypto';
import {
  sha256,
  sha512,
  hmac,
  hkdf,
  pbkdf2,
  constantTimeEqual,
  encrypt,
  decrypt,
  AES_256_KEY_BYTES,
  AES_GCM_IV_BYTES,
  AES_GCM_TAG_BYTES,
  generateKeyPair,
  deriveKey,
  importKeyPem,
  exportKeyPem,
  getKeyFingerprint,
  algorithmFor,
  sign,
  verify,
  proofTypeFor,
  EncryptionError,
  DecryptionError,
  KeyGenerationError,
  SignatureError,
  VerificationError,
} from '@manya-os/keyring';

describe('crypto/hashing', () => {
  it('sha256 produces a 32-byte digest', () => {
    const h = sha256('hello');
    expect(h).toBeInstanceOf(Buffer);
    expect(h.length).toBe(32);
    expect(h.toString('hex')).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
    );
  });

  it('sha256 accepts Buffer input', () => {
    const a = sha256('hello');
    const b = sha256(Buffer.from('hello', 'utf8'));
    expect(a.equals(b)).toBe(true);
  });

  it('sha512 produces a 64-byte digest', () => {
    const h = sha512('hello');
    expect(h.length).toBe(64);
  });

  it('hmac produces deterministic output', () => {
    const key = Buffer.alloc(32, 0xab);
    const data = Buffer.from('hello', 'utf8');
    const a = hmac(key, data);
    const b = hmac(key, data);
    expect(a.equals(b)).toBe(true);
    expect(a.length).toBe(32);
  });

  it('hmac with sha512 produces 64-byte output', () => {
    const a = hmac(Buffer.alloc(32), Buffer.from('x'), 'sha512');
    expect(a.length).toBe(64);
  });

  it('hkdf derives key material of requested length', () => {
    const ikm = crypto.randomBytes(32);
    const salt = crypto.randomBytes(16);
    const info = Buffer.from('manya:test', 'utf8');
    const k = hkdf(ikm, salt, info, 64);
    expect(k.length).toBe(64);
    // Deterministic
    const k2 = hkdf(ikm, salt, info, 64);
    expect(k.equals(k2)).toBe(true);
  });

  it('hkdf rejects zero length', () => {
    expect(() => hkdf(Buffer.alloc(4), Buffer.alloc(0), Buffer.alloc(0), 0)).toThrow();
  });

  it('hkdf rejects excessive length', () => {
    expect(() =>
      hkdf(Buffer.alloc(4), Buffer.alloc(0), Buffer.alloc(0), 255 * 32 + 1)
    ).toThrow();
  });

  it('pbkdf2 derives a key', () => {
    const k = pbkdf2('passphrase', Buffer.alloc(16, 1), 1000, 32);
    expect(k.length).toBe(32);
  });

  it('pbkdf2 rejects unsafe iteration counts', () => {
    expect(() =>
      pbkdf2('passphrase', Buffer.alloc(16, 1), 999, 32)
    ).toThrow();
  });

  it('constantTimeEqual handles equal buffers', () => {
    const a = Buffer.from('abcdef', 'hex');
    const b = Buffer.from('abcdef', 'hex');
    expect(constantTimeEqual(a, b)).toBe(true);
  });

  it('constantTimeEqual handles unequal buffers', () => {
    const a = Buffer.from('abcdef', 'hex');
    const b = Buffer.from('abcdee', 'hex');
    expect(constantTimeEqual(a, b)).toBe(false);
  });

  it('constantTimeEqual handles different-length buffers without throwing', () => {
    const a = Buffer.alloc(16, 1);
    const b = Buffer.alloc(20, 1);
    expect(constantTimeEqual(a, b)).toBe(false);
  });
});

describe('crypto/symmetric', () => {
  it('encrypt + decrypt round-trips', () => {
    const key = crypto.randomBytes(AES_256_KEY_BYTES);
    const plain = Buffer.from('hello keyring', 'utf8');
    const { iv, ciphertext, tag } = encrypt(key, plain);
    expect(iv.length).toBe(AES_GCM_IV_BYTES);
    expect(tag.length).toBe(AES_GCM_TAG_BYTES);
    expect(ciphertext.equals(plain)).toBe(false);
    const recovered = decrypt(key, iv, ciphertext, tag);
    expect(recovered.equals(plain)).toBe(true);
  });

  it('uses a fresh IV per encryption', () => {
    const key = crypto.randomBytes(AES_256_KEY_BYTES);
    const plain = Buffer.from('hello', 'utf8');
    const a = encrypt(key, plain);
    const b = encrypt(key, plain);
    expect(a.iv.equals(b.iv)).toBe(false);
  });

  it('round-trips with AAD', () => {
    const key = crypto.randomBytes(AES_256_KEY_BYTES);
    const plain = Buffer.from('hello keyring', 'utf8');
    const aad = Buffer.from('metadata', 'utf8');
    const { iv, ciphertext, tag } = encrypt(key, plain, aad);
    const recovered = decrypt(key, iv, ciphertext, tag, aad);
    expect(recovered.equals(plain)).toBe(true);
  });

  it('fails decryption when AAD is missing', () => {
    const key = crypto.randomBytes(AES_256_KEY_BYTES);
    const plain = Buffer.from('hello keyring', 'utf8');
    const aad = Buffer.from('metadata', 'utf8');
    const { iv, ciphertext, tag } = encrypt(key, plain, aad);
    expect(() => decrypt(key, iv, ciphertext, tag)).toThrow(DecryptionError);
  });

  it('fails decryption with wrong key', () => {
    const key = crypto.randomBytes(AES_256_KEY_BYTES);
    const wrongKey = crypto.randomBytes(AES_256_KEY_BYTES);
    const plain = Buffer.from('hello', 'utf8');
    const { iv, ciphertext, tag } = encrypt(key, plain);
    expect(() => decrypt(wrongKey, iv, ciphertext, tag)).toThrow(DecryptionError);
  });

  it('rejects short keys', () => {
    expect(() => encrypt(Buffer.alloc(16), Buffer.from('x'))).toThrow(EncryptionError);
  });

  it('rejects short IV at decrypt', () => {
    const key = crypto.randomBytes(AES_256_KEY_BYTES);
    expect(() =>
      decrypt(key, Buffer.alloc(8), Buffer.alloc(0), Buffer.alloc(16))
    ).toThrow(DecryptionError);
  });

  it('rejects bad tag length', () => {
    const key = crypto.randomBytes(AES_256_KEY_BYTES);
    expect(() =>
      decrypt(key, Buffer.alloc(12), Buffer.alloc(0), Buffer.alloc(8))
    ).toThrow(DecryptionError);
  });
});

describe('crypto/keys', () => {
  it('algorithmFor maps correctly', () => {
    expect(algorithmFor('rsa')).toBe('rsa-pss');
    expect(algorithmFor('ecdsa')).toBe('ecdsa-p256');
  });

  it('algorithmFor throws on unknown', () => {
    expect(() => algorithmFor('ed25519' as never)).toThrow(KeyGenerationError);
  });

  it('generates an ECDSA P-256 key pair', () => {
    const { publicKey, privateKey, algorithm } = generateKeyPair('ecdsa');
    expect(publicKey.asymmetricKeyType).toBe('ec');
    expect(privateKey.asymmetricKeyType).toBe('ec');
    expect(algorithm).toBe('ecdsa-p256');
  });

  it('generates an RSA key pair with default modulus', () => {
    const { publicKey, algorithm } = generateKeyPair('rsa');
    expect(publicKey.asymmetricKeyType).toBe('rsa');
    expect(algorithm).toBe('rsa-pss');
  });

  it('generates an RSA key pair with custom modulus', () => {
    const { publicKey } = generateKeyPair('rsa', { rsaModulusBits: 2048 });
    expect(publicKey.asymmetricKeyType).toBe('rsa');
  });

  it('rejects unsupported EC curve', () => {
    expect(() =>
      generateKeyPair('ecdsa', { ecCurve: 'secp256k1' as never })
    ).toThrow(KeyGenerationError);
  });

  it('export + import round-trips for public key', () => {
    const { publicKey } = generateKeyPair('ecdsa');
    const pem = exportKeyPem(publicKey, 'public');
    expect(pem).toMatch(/BEGIN PUBLIC KEY/);
    const imported = importKeyPem(pem, 'public');
    expect(imported.asymmetricKeyType).toBe('ec');
  });

  it('export + import round-trips for private key', () => {
    const { privateKey } = generateKeyPair('ecdsa');
    const pem = exportKeyPem(privateKey, 'private');
    expect(pem).toMatch(/BEGIN PRIVATE KEY/);
    const imported = importKeyPem(pem, 'private');
    expect(imported.asymmetricKeyType).toBe('ec');
  });

  it('getKeyFingerprint returns a 64-char hex string', () => {
    const { publicKey } = generateKeyPair('ecdsa');
    const fp = getKeyFingerprint(publicKey);
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
  });

  it('getKeyFingerprint accepts a PEM string', () => {
    const { publicKey } = generateKeyPair('ecdsa');
    const pem = exportKeyPem(publicKey, 'public');
    const fp1 = getKeyFingerprint(publicKey);
    const fp2 = getKeyFingerprint(pem);
    expect(fp1).toBe(fp2);
  });

  it('deriveKey produces deterministic output', () => {
    const master = crypto.randomBytes(32);
    const a = deriveKey(master, 'manya:test:subkey', 32);
    const b = deriveKey(master, 'manya:test:subkey', 32);
    expect(a.equals(b)).toBe(true);
  });

  it('deriveKey produces different output for different info', () => {
    const master = crypto.randomBytes(32);
    const a = deriveKey(master, 'manya:test:subkey1', 32);
    const b = deriveKey(master, 'manya:test:subkey2', 32);
    expect(a.equals(b)).toBe(false);
  });

  it('importKeyPem throws on bad PEM', () => {
    expect(() => importKeyPem('not a pem', 'public')).toThrow(KeyGenerationError);
  });
});

describe('crypto/signatures', () => {
  it('signs and verifies with ECDSA P-256', () => {
    const { publicKey, privateKey, algorithm } = generateKeyPair('ecdsa');
    const data = Buffer.from('hello keyring', 'utf8');
    const sig = sign(privateKey, data, algorithm);
    expect(sig).toMatch(/^[0-9a-f]+$/);
    expect(verify(publicKey, data, sig, algorithm)).toBe(true);
  });

  it('signs and verifies with RSA-PSS', () => {
    const { publicKey, privateKey, algorithm } = generateKeyPair('rsa', {
      rsaModulusBits: 2048,
    });
    const data = Buffer.from('hello keyring', 'utf8');
    const sig = sign(privateKey, data, algorithm);
    expect(verify(publicKey, data, sig, algorithm)).toBe(true);
  });

  it('verifies with Buffer signature', () => {
    const { publicKey, privateKey, algorithm } = generateKeyPair('ecdsa');
    const data = Buffer.from('hello', 'utf8');
    const sigHex = sign(privateKey, data, algorithm);
    const sigBuf = Buffer.from(sigHex, 'hex');
    expect(verify(publicKey, data, sigBuf, algorithm)).toBe(true);
  });

  it('fails verification with tampered data', () => {
    const { publicKey, privateKey, algorithm } = generateKeyPair('ecdsa');
    const data = Buffer.from('hello', 'utf8');
    const sig = sign(privateKey, data, algorithm);
    expect(verify(publicKey, Buffer.from('hello!', 'utf8'), sig, algorithm)).toBe(
      false
    );
  });

  it('fails verification with tampered signature', () => {
    const { publicKey, privateKey, algorithm } = generateKeyPair('ecdsa');
    const data = Buffer.from('hello', 'utf8');
    const sig = sign(privateKey, data, algorithm);
    // Flip a character.
    const tampered = sig.startsWith('0')
      ? '1' + sig.slice(1)
      : '0' + sig.slice(1);
    expect(verify(publicKey, data, tampered, algorithm)).toBe(false);
  });

  it('fails verification with wrong key', () => {
    const { privateKey, algorithm } = generateKeyPair('ecdsa');
    const other = generateKeyPair('ecdsa');
    const data = Buffer.from('hello', 'utf8');
    const sig = sign(privateKey, data, algorithm);
    expect(verify(other.publicKey, data, sig, algorithm)).toBe(false);
  });

  it('sign throws on non-Buffer data', () => {
    const { privateKey, algorithm } = generateKeyPair('ecdsa');
    expect(() => sign(privateKey, 'not a buffer' as never, algorithm)).toThrow(
      SignatureError
    );
  });

  it('verify throws on non-hex signature', () => {
    const { publicKey, algorithm } = generateKeyPair('ecdsa');
    expect(() =>
      verify(publicKey, Buffer.from('hi'), 'not hex!', algorithm)
    ).toThrow(VerificationError);
  });

  it('proofTypeFor maps algorithms', () => {
    expect(proofTypeFor('rsa-pss')).toBe('manya:rsa-pss:2024');
    expect(proofTypeFor('ecdsa-p256')).toBe('manya:ecdsa-p256:2024');
  });
});
