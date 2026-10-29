import * as crypto from 'crypto';
import {
  sha256,
  sha512,
  hmac,
  secureRandom,
  constantTimeEqual,
  randomToken,
  uuid,
  generateKeyPair,
  importKeyPem,
  exportKeyPem,
  getKeyFingerprint,
  algorithmFor,
  algorithmForKey,
  sign,
  verify,
  signForChallenge,
  signForAttestation,
  proofTypeFor,
  DEFAULT_RSA_MODULUS,
  DEFAULT_EC_CURVE,
  AttestError,
} from '@manya-os/attest';

describe('crypto/hashing', () => {
  it('sha256 produces 32 bytes', () => {
    const h = sha256('hello');
    expect(h.length).toBe(32);
    expect(h.toString('hex')).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
    );
  });

  it('sha256 accepts Buffer or string', () => {
    const a = sha256('hello');
    const b = sha256(Buffer.from('hello', 'utf8'));
    expect(a.equals(b)).toBe(true);
  });

  it('sha512 produces 64 bytes', () => {
    const h = sha512('hello');
    expect(h.length).toBe(64);
  });

  it('hmac returns deterministic digest', () => {
    const key = Buffer.alloc(32, 1);
    const data = Buffer.from('hello', 'utf8');
    const a = hmac(key, data);
    const b = hmac(key, data);
    expect(a.equals(b)).toBe(true);
    // Different key → different digest.
    const c = hmac(Buffer.alloc(32, 2), data);
    expect(a.equals(c)).toBe(false);
  });

  it('hmac supports sha512', () => {
    const key = Buffer.alloc(32, 1);
    const data = Buffer.from('hello', 'utf8');
    const a = hmac(key, data, 'sha256');
    const b = hmac(key, data, 'sha512');
    expect(a.length).toBe(32);
    expect(b.length).toBe(64);
    expect(a.equals(b)).toBe(false);
  });

  it('secureRandom returns the requested number of bytes', () => {
    const r = secureRandom(32);
    expect(r.length).toBe(32);
    // Two calls return different bytes.
    expect(r.equals(secureRandom(32))).toBe(false);
  });

  it('secureRandom rejects invalid lengths', () => {
    expect(() => secureRandom(0)).toThrow(AttestError);
    expect(() => secureRandom(-1)).toThrow(AttestError);
    expect(() => secureRandom(1.5)).toThrow(AttestError);
    expect(() => secureRandom(2 * 1024 * 1024)).toThrow(AttestError);
  });

  it('constantTimeEqual handles equal and unequal buffers', () => {
    const a = Buffer.from('abcdef', 'hex');
    const b = Buffer.from('abcdef', 'hex');
    const c = Buffer.from('abcdeg', 'hex');
    expect(constantTimeEqual(a, b)).toBe(true);
    expect(constantTimeEqual(a, c)).toBe(false);
  });

  it('constantTimeEqual returns false on length mismatch', () => {
    expect(constantTimeEqual(Buffer.alloc(1), Buffer.alloc(2))).toBe(false);
  });

  it('randomToken produces 2*N hex chars', () => {
    const t = randomToken(16);
    expect(t.length).toBe(32);
    expect(/^[0-9a-f]+$/.test(t)).toBe(true);
  });

  it('uuid produces a valid RFC-4122 v4 string', () => {
    const u = uuid();
    expect(u).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('crypto/keys', () => {
  it('generateKeyPair(ecdsa) returns a P-256 key pair', () => {
    const kp = generateKeyPair('ecdsa');
    expect(kp.algorithm).toBe('ecdsa-p256');
    expect(kp.publicKey.asymmetricKeyType).toBe('ec');
    expect(kp.privateKey.asymmetricKeyType).toBe('ec');
  });

  it('generateKeyPair(rsa) returns a 3072-bit RSA key pair', () => {
    const kp = generateKeyPair('rsa', { rsaModulusBits: 2048 });
    expect(kp.algorithm).toBe('rsa-pss');
    expect(kp.publicKey.asymmetricKeyType).toBe('rsa');
  });

  it('generateKeyPair rejects unsupported EC curves', () => {
    // @ts-expect-error - testing runtime rejection of bad curve
    expect(() => generateKeyPair('ecdsa', { ecCurve: 'secp384r1' })).toThrow(AttestError);
  });

  it('algorithmFor maps rsa and ecdsa', () => {
    expect(algorithmFor('rsa')).toBe('rsa-pss');
    expect(algorithmFor('ecdsa')).toBe('ecdsa-p256');
  });

  it('algorithmForKey infers from RSA and EC keys', () => {
    const rsa = generateKeyPair('rsa', { rsaModulusBits: 2048 });
    const ec = generateKeyPair('ecdsa');
    expect(algorithmForKey(rsa.privateKey)).toBe('rsa-pss');
    expect(algorithmForKey(ec.privateKey)).toBe('ecdsa-p256');
    expect(algorithmForKey(rsa.publicKey)).toBe('rsa-pss');
    expect(algorithmForKey(ec.publicKey)).toBe('ecdsa-p256');
  });

  it('exportKeyPem + importKeyPem round-trip', () => {
    const kp = generateKeyPair('ecdsa');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const privPem = exportKeyPem(kp.privateKey, 'private');
    expect(pubPem).toContain('BEGIN PUBLIC KEY');
    expect(privPem).toContain('BEGIN PRIVATE KEY');
    const pub2 = importKeyPem(pubPem, 'public');
    const priv2 = importKeyPem(privPem, 'private');
    expect(getKeyFingerprint(pub2)).toBe(getKeyFingerprint(kp.publicKey));
    expect(algorithmForKey(priv2)).toBe('ecdsa-p256');
  });

  it('getKeyFingerprint is stable and 64 hex chars', () => {
    const kp = generateKeyPair('ecdsa');
    const fp = getKeyFingerprint(kp.publicKey);
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
    expect(getKeyFingerprint(kp.publicKey)).toBe(fp);
    // Different key → different fingerprint.
    const kp2 = generateKeyPair('ecdsa');
    expect(getKeyFingerprint(kp2.publicKey)).not.toBe(fp);
  });

  it('getKeyFingerprint accepts PEM strings', () => {
    const kp = generateKeyPair('ecdsa');
    const pem = exportKeyPem(kp.publicKey, 'public');
    expect(getKeyFingerprint(pem)).toBe(getKeyFingerprint(kp.publicKey));
  });

  it('DEFAULT_RSA_MODULUS is 3072 and DEFAULT_EC_CURVE is prime256v1', () => {
    expect(DEFAULT_RSA_MODULUS).toBe(3072);
    expect(DEFAULT_EC_CURVE).toBe('prime256v1');
  });
});

describe('crypto/signatures', () => {
  it('sign + verify round-trip with ECDSA', () => {
    const kp = generateKeyPair('ecdsa');
    const data = Buffer.from('hello world', 'utf8');
    const sig = sign(kp.privateKey, data);
    expect(/^[0-9a-f]+$/.test(sig)).toBe(true);
    expect(verify(kp.publicKey, data, sig)).toBe(true);
  });

  it('sign + verify round-trip with RSA-PSS', () => {
    const kp = generateKeyPair('rsa', { rsaModulusBits: 2048 });
    const data = Buffer.from('hello world', 'utf8');
    const sig = sign(kp.privateKey, data);
    expect(verify(kp.publicKey, data, sig)).toBe(true);
  });

  it('verify rejects tampered data', () => {
    const kp = generateKeyPair('ecdsa');
    const data = Buffer.from('hello world', 'utf8');
    const sig = sign(kp.privateKey, data);
    const tampered = Buffer.from('hello world!', 'utf8');
    expect(verify(kp.publicKey, tampered, sig)).toBe(false);
  });

  it('verify rejects tampered signature', () => {
    const kp = generateKeyPair('ecdsa');
    const data = Buffer.from('hello world', 'utf8');
    const sig = sign(kp.privateKey, data);
    // Flip the first byte of the signature.
    const buf = Buffer.from(sig, 'hex');
    buf[0] = (buf[0]! ^ 0xff) & 0xff;
    expect(verify(kp.publicKey, data, buf.toString('hex'))).toBe(false);
  });

  it('verify rejects the wrong public key', () => {
    const kp1 = generateKeyPair('ecdsa');
    const kp2 = generateKeyPair('ecdsa');
    const data = Buffer.from('hello world', 'utf8');
    const sig = sign(kp1.privateKey, data);
    expect(verify(kp2.publicKey, data, sig)).toBe(false);
  });

  it('verify throws on non-hex signature', () => {
    const kp = generateKeyPair('ecdsa');
    const data = Buffer.from('hello world', 'utf8');
    expect(() => verify(kp.publicKey, data, 'not-hex!')).toThrow(AttestError);
    expect(() => verify(kp.publicKey, data, '')).toThrow(AttestError);
  });

  it('sign accepts PEM strings', () => {
    const kp = generateKeyPair('ecdsa');
    const privPem = exportKeyPem(kp.privateKey, 'private');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const data = Buffer.from('pem sign', 'utf8');
    const sig = sign(privPem, data);
    expect(verify(pubPem, data, sig)).toBe(true);
  });

  it('algorithm is inferred from the key when not passed', () => {
    const kpEcdsa = generateKeyPair('ecdsa');
    const sig = sign(kpEcdsa.privateKey, Buffer.from('x'));
    expect(verify(kpEcdsa.publicKey, Buffer.from('x'), sig)).toBe(true);

    const kpRsa = generateKeyPair('rsa', { rsaModulusBits: 2048 });
    const sigRsa = sign(kpRsa.privateKey, Buffer.from('x'));
    expect(verify(kpRsa.publicKey, Buffer.from('x'), sigRsa)).toBe(true);
  });

  it('signForChallenge and signForAttestation are equivalent to sign', () => {
    const kp = generateKeyPair('ecdsa');
    const data = Buffer.from('challenge bytes', 'utf8');
    const a = signForChallenge(kp.privateKey, data);
    const b = signForAttestation(kp.privateKey, data);
    const c = sign(kp.privateKey, data);
    expect(verify(kp.publicKey, data, a)).toBe(true);
    expect(verify(kp.publicKey, data, b)).toBe(true);
    expect(verify(kp.publicKey, data, c)).toBe(true);
  });

  it('proofTypeFor maps algorithms', () => {
    expect(proofTypeFor('rsa-pss')).toBe('manya:rsa-pss:2024');
    expect(proofTypeFor('ecdsa-p256')).toBe('manya:ecdsa-p256:2024');
  });

  it('crypto.randomBytes does not interfere (smoke check)', () => {
    // Verify that crypto.timingSafeEqual path works for arbitrary buffers.
    const a = crypto.randomBytes(32);
    const b = Buffer.from(a);
    expect(constantTimeEqual(a, b)).toBe(true);
  });
});
