import * as crypto from 'crypto';
import {
  issueCredential,
  verifyCredential,
  validateCredential,
  canonicalCredentialBytes,
  CredentialError,
  generateKeyPair,
  exportKeyPem,
  sign,
  type VerifiableCredential,
} from '@manya-os/keyring';

describe('issueCredential', () => {
  it('issues a credential with a valid proof', () => {
    const { privateKey, publicKey, algorithm } = generateKeyPair('ecdsa');
    const pubPem = exportKeyPem(publicKey, 'public');
    const cred = issueCredential({
      issuer: 'did:key:zabc',
      issuerPrivateKey: privateKey,
      algorithm,
      subject: 'did:key:zdef',
      claims: { role: 'admin', level: 5 },
    });
    expect(cred.id).toMatch(/^cred-/);
    expect(cred.issuer).toBe('did:key:zabc');
    expect(cred.subject).toBe('did:key:zdef');
    expect(cred.claims).toEqual({ role: 'admin', level: 5 });
    expect(cred.proof.proofValue).toMatch(/^[0-9a-f]+$/);
    expect(cred.proof.algorithm).toBe(algorithm);
    expect(verifyCredential(cred, pubPem)).toBe(true);
  });

  it('issues with custom id and expiresAt', () => {
    const { privateKey, algorithm } = generateKeyPair('ecdsa');
    const future = new Date(Date.now() + 1000 * 60 * 60).toISOString();
    const cred = issueCredential({
      issuer: 'did:key:zabc',
      issuerPrivateKey: privateKey,
      algorithm,
      subject: 'did:key:zdef',
      claims: { x: 1 },
      id: 'custom-id',
      expiresAt: future,
    });
    expect(cred.id).toBe('custom-id');
    expect(cred.expiresAt).toBe(future);
  });

  it('rejects empty issuer', () => {
    const { privateKey, algorithm } = generateKeyPair('ecdsa');
    expect(() =>
      issueCredential({
        issuer: '',
        issuerPrivateKey: privateKey,
        algorithm,
        subject: 'did:key:zdef',
        claims: {},
      })
    ).toThrow(CredentialError);
  });

  it('rejects empty subject', () => {
    const { privateKey, algorithm } = generateKeyPair('ecdsa');
    expect(() =>
      issueCredential({
        issuer: 'did:key:zabc',
        issuerPrivateKey: privateKey,
        algorithm,
        subject: '',
        claims: {},
      })
    ).toThrow(CredentialError);
  });

  it('rejects unsupported algorithm', () => {
    const { privateKey } = generateKeyPair('ecdsa');
    expect(() =>
      issueCredential({
        issuer: 'did:key:zabc',
        issuerPrivateKey: privateKey,
        algorithm: 'ed25519' as never,
        subject: 'did:key:zdef',
        claims: {},
      })
    ).toThrow(CredentialError);
  });

  it('rejects claims that are not an object', () => {
    const { privateKey, algorithm } = generateKeyPair('ecdsa');
    expect(() =>
      issueCredential({
        issuer: 'did:key:zabc',
        issuerPrivateKey: privateKey,
        algorithm,
        subject: 'did:key:zdef',
        claims: 'not-object' as never,
      })
    ).toThrow(CredentialError);
  });
});

describe('verifyCredential', () => {
  it('verifies a credential from a PEM string', () => {
    const { privateKey, publicKey, algorithm } = generateKeyPair('ecdsa');
    const pem = exportKeyPem(publicKey, 'public');
    const cred = issueCredential({
      issuer: 'did:key:zabc',
      issuerPrivateKey: privateKey,
      algorithm,
      subject: 'did:key:zdef',
      claims: { foo: 'bar' },
    });
    expect(verifyCredential(cred, pem)).toBe(true);
  });

  it('fails with wrong key', () => {
    const { privateKey, algorithm } = generateKeyPair('ecdsa');
    const other = generateKeyPair('ecdsa');
    const cred = issueCredential({
      issuer: 'did:key:zabc',
      issuerPrivateKey: privateKey,
      algorithm,
      subject: 'did:key:zdef',
      claims: { foo: 'bar' },
    });
    expect(verifyCredential(cred, other.publicKey)).toBe(false);
  });

  it('fails when claims are tampered', () => {
    const { privateKey, publicKey, algorithm } = generateKeyPair('ecdsa');
    const cred = issueCredential({
      issuer: 'did:key:zabc',
      issuerPrivateKey: privateKey,
      algorithm,
      subject: 'did:key:zdef',
      claims: { foo: 'bar' },
    });
    const tampered: VerifiableCredential = {
      ...cred,
      claims: { foo: 'TAMPERED' },
    };
    expect(verifyCredential(tampered, publicKey)).toBe(false);
  });

  it('fails when proof is missing', () => {
    const { publicKey } = generateKeyPair('ecdsa');
    const broken = {
      id: 'x',
      issuer: 'x',
      subject: 'x',
      claims: {},
      issuedAt: '2024-01-01T00:00:00Z',
    } as unknown as VerifiableCredential;
    expect(verifyCredential(broken, publicKey)).toBe(false);
  });

  it('fails when proof algorithm is unsupported', () => {
    const { privateKey, publicKey, algorithm } = generateKeyPair('ecdsa');
    const cred = issueCredential({
      issuer: 'did:key:zabc',
      issuerPrivateKey: privateKey,
      algorithm,
      subject: 'did:key:zdef',
      claims: { foo: 'bar' },
    });
    const broken: VerifiableCredential = {
      ...cred,
      proof: { ...cred.proof, algorithm: 'ed25519' as never },
    };
    expect(verifyCredential(broken, publicKey)).toBe(false);
  });
});

describe('validateCredential', () => {
  it('validates a well-formed credential', () => {
    const { privateKey, algorithm } = generateKeyPair('ecdsa');
    const cred = issueCredential({
      issuer: 'did:key:zabc',
      issuerPrivateKey: privateKey,
      algorithm,
      subject: 'did:key:zdef',
      claims: {},
    });
    expect(validateCredential(cred)).toBe(true);
  });

  it('rejects expired credentials', () => {
    const { privateKey, algorithm } = generateKeyPair('ecdsa');
    const past = new Date(Date.now() - 1000).toISOString();
    const cred = issueCredential({
      issuer: 'did:key:zabc',
      issuerPrivateKey: privateKey,
      algorithm,
      subject: 'did:key:zdef',
      claims: {},
      expiresAt: past,
    });
    expect(validateCredential(cred)).toBe(false);
  });

  it('accepts unexpired credentials', () => {
    const { privateKey, algorithm } = generateKeyPair('ecdsa');
    const future = new Date(Date.now() + 60000).toISOString();
    const cred = issueCredential({
      issuer: 'did:key:zabc',
      issuerPrivateKey: privateKey,
      algorithm,
      subject: 'did:key:zdef',
      claims: {},
      expiresAt: future,
    });
    expect(validateCredential(cred)).toBe(true);
  });

  it('rejects missing fields', () => {
    expect(validateCredential({} as never)).toBe(false);
    expect(
      validateCredential({ id: 'x', issuer: 'x', subject: 'x', claims: {}, issuedAt: 'x' } as never)
    ).toBe(false);
  });

  it('rejects bad issuedAt', () => {
    const { privateKey, algorithm } = generateKeyPair('ecdsa');
    const cred = issueCredential({
      issuer: 'did:key:zabc',
      issuerPrivateKey: privateKey,
      algorithm,
      subject: 'did:key:zdef',
      claims: {},
    });
    const broken = { ...cred, issuedAt: 'not-a-date' } as VerifiableCredential;
    expect(validateCredential(broken)).toBe(false);
  });
});

describe('canonicalCredentialBytes', () => {
  it('produces stable bytes regardless of key order', () => {
    const { privateKey, algorithm } = generateKeyPair('ecdsa');
    const cred = issueCredential({
      issuer: 'did:key:zabc',
      issuerPrivateKey: privateKey,
      algorithm,
      subject: 'did:key:zdef',
      claims: { a: 1, b: 2, c: 3 },
    });
    // Re-order claims and check the canonical bytes are unchanged.
    const reordered: VerifiableCredential = {
      ...cred,
      claims: { c: 3, b: 2, a: 1 },
    };
    expect(canonicalCredentialBytes(reordered).equals(canonicalCredentialBytes(cred))).toBe(true);
  });

  it('excludes the proof field', () => {
    const { privateKey, algorithm } = generateKeyPair('ecdsa');
    const cred = issueCredential({
      issuer: 'did:key:zabc',
      issuerPrivateKey: privateKey,
      algorithm,
      subject: 'did:key:zdef',
      claims: { a: 1 },
    });
    const bytes = canonicalCredentialBytes(cred);
    const parsed = JSON.parse(bytes.toString('utf8'));
    expect(parsed.proof).toBeUndefined();
  });

  it('manual sign over canonical bytes verifies against the credential proof', () => {
    // ECDSA is non-deterministic, so signatures won't byte-match; instead we
    // confirm that signing the canonical bytes and verifying with the issuer
    // public key succeeds, and that the credential's embedded proof also
    // verifies.
    const { privateKey, publicKey, algorithm } = generateKeyPair('ecdsa');
    const cred = issueCredential({
      issuer: 'did:key:zabc',
      issuerPrivateKey: privateKey,
      algorithm,
      subject: 'did:key:zdef',
      claims: { x: 1 },
    });
    const bytes = canonicalCredentialBytes(cred);
    const manualSig = sign(privateKey, bytes, algorithm);
    // Both signatures should verify against the same public key + canonical bytes.
    const ok1 = crypto.verify('sha256', bytes, publicKey, Buffer.from(manualSig, 'hex'));
    const ok2 = crypto.verify('sha256', bytes, publicKey, Buffer.from(cred.proof.proofValue, 'hex'));
    expect(ok1).toBe(true);
    expect(ok2).toBe(true);
  });
});
