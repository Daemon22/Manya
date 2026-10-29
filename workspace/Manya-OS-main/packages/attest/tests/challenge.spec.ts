import {
  generateKeyPair,
  exportKeyPem,
  NonceStore,
  generateChallenge,
  decodeChallenge,
  signChallenge,
  verifyResponse,
  isChallengeExpired,
  ChallengeError,
  NonceError,
  DEFAULT_NONCE_TTL_MS,
  DEFAULT_CHALLENGE_TTL_MS,
  type Challenge,
} from '@manya-os/attest';

describe('challenge/nonce', () => {
  it('issue returns a unique nonce', () => {
    const store = new NonceStore();
    const a = store.issue();
    const b = store.issue();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('consume returns true for a valid unconsumed nonce', () => {
    const store = new NonceStore();
    const n = store.issue();
    expect(store.consume(n)).toBe(true);
    // Single-use: second consume returns false.
    expect(store.consume(n)).toBe(false);
  });

  it('consume returns false for unknown nonce', () => {
    const store = new NonceStore();
    expect(store.consume('unknown')).toBe(false);
  });

  it('consume throws on empty/non-string nonce', () => {
    const store = new NonceStore();
    expect(() => store.consume('')).toThrow(NonceError);
  });

  it('expired nonces cannot be consumed (default TTL)', async () => {
    const store = new NonceStore();
    const n = store.issue({ ttlMs: 50 });
    await new Promise((r) => setTimeout(r, 80));
    expect(store.consume(n)).toBe(false);
  });

  it('cleanup removes expired and consumed nonces', async () => {
    const store = new NonceStore();
    const n1 = store.issue({ ttlMs: 30 });
    const n2 = store.issue({ ttlMs: 10000 });
    store.consume(n2);
    await new Promise((r) => setTimeout(r, 50));
    const removed = store.cleanup();
    expect(removed).toBeGreaterThanOrEqual(2);
    expect(store.size()).toBe(0);
  });

  it('isValid returns true for valid, false for consumed/expired', () => {
    const store = new NonceStore();
    const n = store.issue();
    expect(store.isValid(n)).toBe(true);
    store.consume(n);
    expect(store.isValid(n)).toBe(false);
  });

  it('default TTL is 5 minutes', () => {
    expect(DEFAULT_NONCE_TTL_MS).toBe(5 * 60 * 1000);
  });

  it('constructor rejects invalid defaults', () => {
    expect(() => new NonceStore(0)).toThrow(NonceError);
    expect(() => new NonceStore(-1)).toThrow(NonceError);
    expect(() => new NonceStore(1000, 0)).toThrow(NonceError);
    expect(() => new NonceStore(1000, 999)).toThrow(NonceError);
  });

  it('issue rejects invalid options', () => {
    const store = new NonceStore();
    expect(() => store.issue({ ttlMs: 0 })).toThrow(NonceError);
    expect(() => store.issue({ bytes: 0 })).toThrow(NonceError);
    expect(() => store.issue({ bytes: 999 })).toThrow(NonceError);
  });

  it('clear empties the store', () => {
    const store = new NonceStore();
    store.issue();
    store.issue();
    expect(store.size()).toBe(2);
    store.clear();
    expect(store.size()).toBe(0);
  });
});

describe('challenge/challenge', () => {
  it('generateChallenge returns a Challenge with required fields', () => {
    const c = generateChallenge();
    expect(typeof c.nonce).toBe('string');
    expect(c.nonce.length).toBeGreaterThan(0);
    expect(typeof c.challenge).toBe('string');
    expect(typeof c.issuedAt).toBe('string');
    expect(typeof c.expiresAt).toBe('string');
    // Verify the challenge decodes to bytes.
    const bytes = decodeChallenge(c.challenge);
    expect(Buffer.isBuffer(bytes)).toBe(true);
    expect(bytes.length).toBe(32); // default bytes
  });

  it('generateChallenge respects ttlMs', () => {
    const c = generateChallenge({ ttlMs: 5000 });
    const issued = Date.parse(c.issuedAt);
    const expires = Date.parse(c.expiresAt);
    expect(expires - issued).toBe(5000);
  });

  it('generateChallenge respects bytes', () => {
    const c = generateChallenge({ bytes: 64 });
    const bytes = decodeChallenge(c.challenge);
    expect(bytes.length).toBe(64);
  });

  it('generateChallenge rejects bad options', () => {
    expect(() => generateChallenge({ ttlMs: 0 })).toThrow(ChallengeError);
    expect(() => generateChallenge({ bytes: 0 })).toThrow(ChallengeError);
    expect(() => generateChallenge({ bytes: 999 })).toThrow(ChallengeError);
  });

  it('default TTL is 60 seconds', () => {
    expect(DEFAULT_CHALLENGE_TTL_MS).toBe(60 * 1000);
  });

  it('decodeChallenge rejects non-base64 input', () => {
    expect(() => decodeChallenge('')).toThrow(ChallengeError);
  });

  it('isChallengeExpired returns false for fresh challenges', () => {
    const c = generateChallenge({ ttlMs: 60000 });
    expect(isChallengeExpired(c)).toBe(false);
  });

  it('isChallengeExpired returns true for past challenges', () => {
    const c = generateChallenge({ ttlMs: 30 });
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(isChallengeExpired(c)).toBe(true);
        resolve();
      }, 60);
    });
  });

  it('signChallenge + verifyResponse round-trip (ECDSA)', () => {
    const kp = generateKeyPair('ecdsa');
    const c = generateChallenge();
    const resp = signChallenge(kp.privateKey, c);
    expect(resp.nonce).toBe(c.nonce);
    expect(/^[0-9a-f]+$/.test(resp.signature)).toBe(true);
    expect(resp.algorithm).toBe('ecdsa-p256');
    expect(resp.publicKeyFingerprint).toMatch(/^[0-9a-f]{64}$/);
    const ok = verifyResponse(kp.publicKey, c, resp, c.nonce);
    expect(ok).toBe(true);
  });

  it('signChallenge + verifyResponse round-trip (RSA-PSS)', () => {
    const kp = generateKeyPair('rsa', { rsaModulusBits: 2048 });
    const c = generateChallenge();
    const resp = signChallenge(kp.privateKey, c);
    expect(resp.algorithm).toBe('rsa-pss');
    expect(verifyResponse(kp.publicKey, c, resp, c.nonce)).toBe(true);
  });

  it('verifyResponse rejects mismatched nonce', () => {
    const kp = generateKeyPair('ecdsa');
    const c = generateChallenge();
    const resp = signChallenge(kp.privateKey, c);
    expect(verifyResponse(kp.publicKey, c, resp, 'wrong-nonce')).toBe(false);
  });

  it('verifyResponse rejects wrong public key', () => {
    const kp1 = generateKeyPair('ecdsa');
    const kp2 = generateKeyPair('ecdsa');
    const c = generateChallenge();
    const resp = signChallenge(kp1.privateKey, c);
    expect(verifyResponse(kp2.publicKey, c, resp, c.nonce)).toBe(false);
  });

  it('verifyResponse rejects tampered challenge', () => {
    const kp = generateKeyPair('ecdsa');
    const c = generateChallenge();
    const resp = signChallenge(kp.privateKey, c);
    // Tamper with the challenge payload (keep the nonce).
    const tampered: Challenge = { ...c, challenge: Buffer.from('tampered').toString('base64') };
    expect(verifyResponse(kp.publicKey, tampered, resp, c.nonce)).toBe(false);
  });

  it('signChallenge with PEM private key works', () => {
    const kp = generateKeyPair('ecdsa');
    const privPem = exportKeyPem(kp.privateKey, 'private');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const c = generateChallenge();
    const resp = signChallenge(privPem, c);
    expect(verifyResponse(pubPem, c, resp, c.nonce)).toBe(true);
  });

  it('signChallenge rejects bad challenge object', () => {
    const kp = generateKeyPair('ecdsa');
    expect(() => signChallenge(kp.privateKey, {} as Challenge)).toThrow(ChallengeError);
  });
});
