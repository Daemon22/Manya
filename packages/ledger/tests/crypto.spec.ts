import * as crypto from 'crypto';
import {
  sha256,
  sha512,
  hmac,
  secureRandom,
  constantTimeEqual,
  randomToken,
  uuid,
  sha256Hex,
  generateKeyPair,
  importKeyPem,
  exportKeyPem,
  getKeyId,
  algorithmFor,
  algorithmForKey,
  sign,
  verify,
  LedgerError,
} from '@manya-os/ledger';

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

  it('secureRandom produces n random bytes', () => {
    const buf = secureRandom(16);
    expect(buf.length).toBe(16);
    const buf2 = secureRandom(16);
    expect(buf.equals(buf2)).toBe(false);
  });

  it('secureRandom rejects non-positive integer', () => {
    expect(() => secureRandom(0)).toThrow(LedgerError);
    expect(() => secureRandom(-1)).toThrow(LedgerError);
  });

  it('secureRandom rejects > 1MiB', () => {
    expect(() => secureRandom(1024 * 1024 + 1)).toThrow(LedgerError);
  });

  it('constantTimeEqual returns true for equal buffers', () => {
    const a = Buffer.from('hello');
    const b = Buffer.from('hello');
    expect(constantTimeEqual(a, b)).toBe(true);
  });

  it('constantTimeEqual returns false for different buffers', () => {
    expect(constantTimeEqual(Buffer.from('a'), Buffer.from('b'))).toBe(false);
  });

  it('constantTimeEqual returns false for different lengths', () => {
    expect(constantTimeEqual(Buffer.from('a'), Buffer.from('ab'))).toBe(false);
  });

  it('randomToken produces hex string of correct length', () => {
    const t = randomToken(16);
    expect(t.length).toBe(32);
    expect(/^[0-9a-f]+$/.test(t)).toBe(true);
  });

  it('randomToken defaults to 32 bytes', () => {
    const t = randomToken();
    expect(t.length).toBe(64);
  });

  it('uuid produces valid UUID v4', () => {
    const id = uuid();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('sha256Hex produces 64-char hex string', () => {
    const h = sha256Hex('hello');
    expect(h.length).toBe(64);
    expect(/^[0-9a-f]+$/.test(h)).toBe(true);
  });

  it('sha256Hex matches sha256', () => {
    const h1 = sha256Hex('hello');
    const h2 = sha256('hello').toString('hex');
    expect(h1).toBe(h2);
  });
});

describe('crypto/keys', () => {
  describe('generateKeyPair', () => {
    it('generates ECDSA P-256 keypair by default', () => {
      const kp = generateKeyPair();
      expect(kp.publicKey).toBeDefined();
      expect(kp.privateKey).toBeDefined();
      expect(kp.algorithm).toBe('ecdsa-p256');
    });

    it('generates RSA keypair', () => {
      const kp = generateKeyPair('rsa');
      expect(kp.algorithm).toBe('rsa-pss');
      expect(kp.privateKey.asymmetricKeyType).toBe('rsa');
    });

    it('rejects unknown algorithm', () => {
      expect(() => generateKeyPair('unknown' as any)).toThrow(LedgerError);
    });

    it('rejects unsupported EC curve', () => {
      expect(() => generateKeyPair('ecdsa', { ecCurve: 'secp384r1' as any })).toThrow(LedgerError);
    });
  });

  describe('importKeyPem / exportKeyPem', () => {
    it('round-trips public key', () => {
      const kp = generateKeyPair('ecdsa');
      const pem = exportKeyPem(kp.publicKey, 'public');
      const imported = importKeyPem(pem, 'public');
      expect(imported).toBeDefined();
    });

    it('round-trips private key', () => {
      const kp = generateKeyPair('ecdsa');
      const pem = exportKeyPem(kp.privateKey, 'private');
      const imported = importKeyPem(pem, 'private');
      expect(imported).toBeDefined();
    });

    it('rejects invalid PEM', () => {
      expect(() => importKeyPem('not-pem', 'public')).toThrow(LedgerError);
    });
  });

  describe('getKeyId', () => {
    it('returns 64-char hex', () => {
      const kp = generateKeyPair('ecdsa');
      const id = getKeyId(kp.publicKey);
      expect(id).toMatch(/^[0-9a-f]{64}$/);
    });

    it('accepts PEM string', () => {
      const kp = generateKeyPair('ecdsa');
      const pem = exportKeyPem(kp.publicKey, 'public');
      const id = getKeyId(pem);
      expect(id).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is deterministic', () => {
      const kp = generateKeyPair('ecdsa');
      expect(getKeyId(kp.publicKey)).toBe(getKeyId(kp.publicKey));
    });
  });

  describe('algorithmFor', () => {
    it('maps ecdsa to ecdsa-p256', () => {
      expect(algorithmFor('ecdsa')).toBe('ecdsa-p256');
    });

    it('maps rsa to rsa-pss', () => {
      expect(algorithmFor('rsa')).toBe('rsa-pss');
    });

    it('throws for unknown', () => {
      expect(() => algorithmFor('unknown' as any)).toThrow(LedgerError);
    });
  });

  describe('algorithmForKey', () => {
    it('detects EC key', () => {
      const kp = generateKeyPair('ecdsa');
      expect(algorithmForKey(kp.publicKey)).toBe('ecdsa-p256');
    });

    it('detects RSA key', () => {
      const kp = generateKeyPair('rsa');
      expect(algorithmForKey(kp.publicKey)).toBe('rsa-pss');
    });
  });

  describe('sign / verify', () => {
    it('ECDSA: sign and verify', () => {
      const kp = generateKeyPair('ecdsa');
      const data = Buffer.from('message');
      const sig = sign(kp.privateKey, data, 'ecdsa-p256');
      expect(sig).toMatch(/^[0-9a-f]+$/);
      expect(verify(kp.publicKey, data, sig, 'ecdsa-p256')).toBe(true);
    });

    it('RSA: sign and verify', () => {
      const kp = generateKeyPair('rsa');
      const data = Buffer.from('message');
      const sig = sign(kp.privateKey, data, 'rsa-pss');
      expect(verify(kp.publicKey, data, sig, 'rsa-pss')).toBe(true);
    });

    it('rejects wrong key', () => {
      const kp1 = generateKeyPair('ecdsa');
      const kp2 = generateKeyPair('ecdsa');
      const data = Buffer.from('msg');
      const sig = sign(kp1.privateKey, data, 'ecdsa-p256');
      expect(verify(kp2.publicKey, data, sig, 'ecdsa-p256')).toBe(false);
    });

    it('rejects tampered data', () => {
      const kp = generateKeyPair('ecdsa');
      const sig = sign(kp.privateKey, Buffer.from('original'), 'ecdsa-p256');
      expect(verify(kp.publicKey, Buffer.from('tampered'), sig, 'ecdsa-p256')).toBe(false);
    });

    it('sign rejects non-Buffer data', () => {
      const kp = generateKeyPair('ecdsa');
      expect(() => sign(kp.privateKey, 'not-buffer' as any)).toThrow(LedgerError);
    });

    it('verify rejects non-Buffer data', () => {
      const kp = generateKeyPair('ecdsa');
      expect(() => verify(kp.publicKey, 'not-buffer' as any, 'abc')).toThrow(LedgerError);
    });

    it('verify rejects empty hex signature', () => {
      const kp = generateKeyPair('ecdsa');
      expect(() => verify(kp.publicKey, Buffer.from('x'), '')).toThrow(LedgerError);
    });

    it('verify rejects invalid hex signature', () => {
      const kp = generateKeyPair('ecdsa');
      expect(() => verify(kp.publicKey, Buffer.from('x'), 'not-hex')).toThrow(LedgerError);
    });

    it('accepts PEM string keys', () => {
      const kp = generateKeyPair('ecdsa');
      const pubPem = exportKeyPem(kp.publicKey, 'public');
      const privPem = exportKeyPem(kp.privateKey, 'private');
      const sig = sign(privPem, Buffer.from('test'), 'ecdsa-p256');
      expect(verify(pubPem, Buffer.from('test'), sig, 'ecdsa-p256')).toBe(true);
    });
  });
});
