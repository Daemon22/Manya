import {
  LocalTimestampAuthority,
  commit,
  reveal,
  issueTimestamp,
  verifyTimestamp,
  TIMESTAMP_TOKEN_VERSION,
  COMMITMENT_NONCE_BYTES,
  COMMITMENT_BYTES,
  canonicalTimestampBytes,
  TimestampError,
  sha256,
} from '@manya-os/ledger';

describe('commit/reveal', () => {
  it('produces a commitment and nonce', () => {
    const value = Buffer.from('secret-data');
    const c = commit(value);
    expect(c.commitment).toBeInstanceOf(Buffer);
    expect(c.commitment.length).toBe(COMMITMENT_BYTES);
    expect(c.nonce).toBeInstanceOf(Buffer);
    expect(c.nonce.length).toBe(COMMITMENT_NONCE_BYTES);
  });

  it('different calls produce different nonces', () => {
    const value = Buffer.from('same');
    const c1 = commit(value);
    const c2 = commit(value);
    expect(c1.nonce.equals(c2.nonce)).toBe(false);
    expect(c1.commitment.equals(c2.commitment)).toBe(false);
  });

  it('reveal returns true for matching commitment', () => {
    const value = Buffer.from('secret');
    const c = commit(value);
    expect(reveal(value, c.nonce, c.commitment)).toBe(true);
  });

  it('reveal returns false for wrong value', () => {
    const c = commit(Buffer.from('secret'));
    expect(reveal(Buffer.from('wrong'), c.nonce, c.commitment)).toBe(false);
  });

  it('reveal returns false for wrong nonce', () => {
    const c = commit(Buffer.from('secret'));
    expect(reveal(Buffer.from('secret'), Buffer.alloc(32), c.commitment)).toBe(false);
  });

  it('reveal returns false for non-Buffer inputs', () => {
    expect(reveal(null as any, Buffer.alloc(32), Buffer.alloc(32))).toBe(false);
    expect(reveal(Buffer.alloc(1), null as any, Buffer.alloc(32))).toBe(false);
    expect(reveal(Buffer.alloc(1), Buffer.alloc(32), null as any)).toBe(false);
  });

  it('reveal returns false for wrong nonce length', () => {
    const c = commit(Buffer.from('data'));
    expect(reveal(Buffer.from('data'), Buffer.alloc(16), c.commitment)).toBe(false);
  });

  it('rejects empty value', () => {
    expect(() => commit(Buffer.alloc(0))).toThrow(TimestampError);
  });
});

describe('LocalTimestampAuthority', () => {
  it('generates a fresh keypair by default', () => {
    const auth = new LocalTimestampAuthority();
    expect(auth.getPublicKey()).toBeDefined();
    expect(auth.getKeyId()).toMatch(/^[0-9a-f]{64}$/);
    expect(auth.getAlgorithm()).toBe('ecdsa-p256');
  });

  it('accepts a pre-existing keypair', () => {
    const auth1 = new LocalTimestampAuthority();
    const auth2 = new LocalTimestampAuthority({
      keypair: {
        publicKey: auth1.getPublicKey(),
        privateKey: (auth1 as any).privateKey,
        algorithm: auth1.getAlgorithm(),
      },
    });
    expect(auth2.getKeyId()).toBe(auth1.getKeyId());
  });

  it('issues a timestamp token', () => {
    const auth = new LocalTimestampAuthority();
    const commitment = sha256(Buffer.from('test'));
    const token = auth.issue(commitment);
    expect(token.version).toBe(TIMESTAMP_TOKEN_VERSION);
    expect(token.commitment).toBe(commitment.toString('hex'));
    expect(token.issuedAt).toBeDefined();
    expect(token.signature).toMatch(/^[0-9a-f]+$/);
    expect(token.algorithm).toBe('ecdsa-p256');
    expect(token.authorityKeyId).toBe(auth.getKeyId());
  });

  it('issues token from hex string commitment', () => {
    const auth = new LocalTimestampAuthority();
    const hex = 'ab'.repeat(32);
    const token = auth.issue(hex);
    expect(token.commitment).toBe(hex);
  });

  it('rejects empty commitment', () => {
    const auth = new LocalTimestampAuthority();
    expect(() => auth.issue(Buffer.alloc(0))).toThrow(TimestampError);
    expect(() => auth.issue('')).toThrow(TimestampError);
  });

  it('rejects non-Buffer/string commitment', () => {
    const auth = new LocalTimestampAuthority();
    expect(() => auth.issue(42 as any)).toThrow(TimestampError);
  });
});

describe('issueTimestamp', () => {
  it('delegates to authority.issue()', () => {
    const auth = new LocalTimestampAuthority();
    const commitment = sha256(Buffer.from('test'));
    const token = issueTimestamp(commitment, auth);
    expect(token.version).toBe(TIMESTAMP_TOKEN_VERSION);
  });

  it('rejects authority without issue method', () => {
    expect(() => issueTimestamp(Buffer.alloc(32), null as any)).toThrow(TimestampError);
  });
});

describe('verifyTimestamp', () => {
  it('returns true for valid token', () => {
    const auth = new LocalTimestampAuthority();
    const commitment = sha256(Buffer.from('data'));
    const token = auth.issue(commitment);
    expect(verifyTimestamp(token, auth.getPublicKey())).toBe(true);
  });

  it('returns false for wrong authority key', () => {
    const auth1 = new LocalTimestampAuthority();
    const auth2 = new LocalTimestampAuthority();
    const token = auth1.issue(sha256(Buffer.from('data')));
    expect(verifyTimestamp(token, auth2.getPublicKey())).toBe(false);
  });

  it('returns false for tampered token', () => {
    const auth = new LocalTimestampAuthority();
    const token = auth.issue(sha256(Buffer.from('data')));
    token.commitment = 'ff'.repeat(32);
    expect(verifyTimestamp(token, auth.getPublicKey())).toBe(false);
  });

  it('returns false for wrong version', () => {
    const auth = new LocalTimestampAuthority();
    const token = auth.issue(sha256(Buffer.from('data')));
    token.version = 999;
    expect(verifyTimestamp(token, auth.getPublicKey())).toBe(false);
  });

  it('returns false for null/undefined token', () => {
    const auth = new LocalTimestampAuthority();
    expect(verifyTimestamp(null as any, auth.getPublicKey())).toBe(false);
    expect(verifyTimestamp(undefined as any, auth.getPublicKey())).toBe(false);
  });

  it('returns false for missing fields', () => {
    const auth = new LocalTimestampAuthority();
    expect(verifyTimestamp({} as any, auth.getPublicKey())).toBe(false);
    expect(verifyTimestamp({ version: 1 } as any, auth.getPublicKey())).toBe(false);
  });

  it('returns false for invalid signature hex', () => {
    const auth = new LocalTimestampAuthority();
    const token = auth.issue(sha256(Buffer.from('data')));
    token.signature = 'not-hex';
    expect(verifyTimestamp(token, auth.getPublicKey())).toBe(false);
  });
});

describe('canonicalTimestampBytes', () => {
  it('produces deterministic bytes', () => {
    const token = {
      version: 1,
      commitment: 'ab'.repeat(32),
      issuedAt: '2025-01-01T00:00:00.000Z',
      authorityKeyId: 'cd'.repeat(32),
    };
    const a = canonicalTimestampBytes(token);
    const b = canonicalTimestampBytes(token);
    expect(a.equals(b)).toBe(true);
  });

  it('changes when commitment changes', () => {
    const base = { version: 1, issuedAt: 't', authorityKeyId: 'k' };
    const a = canonicalTimestampBytes({ ...base, commitment: 'aa'.repeat(32) });
    const b = canonicalTimestampBytes({ ...base, commitment: 'bb'.repeat(32) });
    expect(a.equals(b)).toBe(false);
  });
});
