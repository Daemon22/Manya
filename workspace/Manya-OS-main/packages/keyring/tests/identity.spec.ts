import * as crypto from 'crypto';
import * as os from 'os';
import * as path from 'path';
import {
  Identity,
  deriveDidKey,
  base58Encode,
  generateKeyPair,
  exportKeyPem,
  KeyringError,
} from '@manya-os/keyring';

describe('Identity', () => {
  it('derives a did:key from an ECDSA P-256 public key', () => {
    const { publicKey, algorithm } = generateKeyPair('ecdsa');
    const did = deriveDidKey(publicKey, algorithm);
    expect(did).toMatch(/^did:key:z[1-9A-HJ-NP-Za-km-z]+$/);
  });

  it('derives a did:key from an RSA-PSS public key', () => {
    const { publicKey, algorithm } = generateKeyPair('rsa', {
      rsaModulusBits: 2048,
    });
    const did = deriveDidKey(publicKey, algorithm);
    expect(did).toMatch(/^did:key:z[1-9A-HJ-NP-Za-km-z]+$/);
  });

  it('derives the same DID for the same key', () => {
    const { publicKey, algorithm } = generateKeyPair('ecdsa');
    const pem = exportKeyPem(publicKey, 'public');
    const did1 = deriveDidKey(publicKey, algorithm);
    const did2 = deriveDidKey(pem, algorithm);
    expect(did1).toBe(did2);
  });

  it('derives different DIDs for different keys', () => {
    const a = generateKeyPair('ecdsa');
    const b = generateKeyPair('ecdsa');
    const didA = deriveDidKey(a.publicKey, a.algorithm);
    const didB = deriveDidKey(b.publicKey, b.algorithm);
    expect(didA).not.toBe(didB);
  });

  it('Identity.fromPublicKey builds an Identity', () => {
    const { publicKey, algorithm } = generateKeyPair('ecdsa');
    const pem = exportKeyPem(publicKey, 'public');
    const identity = Identity.fromPublicKey(pem, algorithm, { name: 'agent-1' });
    expect(identity.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(identity.did).toMatch(/^did:key:z/);
    expect(identity.publicKey).toMatch(/BEGIN PUBLIC KEY/);
    expect(identity.algorithm).toBe('ecdsa-p256');
    expect(identity.metadata.name).toBe('agent-1');
    expect(identity.createdAt).toBeTruthy();
  });

  it('Identity.serialize + deserialize round-trips', () => {
    const { publicKey, algorithm } = generateKeyPair('ecdsa');
    const pem = exportKeyPem(publicKey, 'public');
    const identity = Identity.fromPublicKey(pem, algorithm, { foo: 'bar' });
    const ser = identity.serialize();
    const restored = Identity.deserialize(ser);
    expect(restored.id).toBe(identity.id);
    expect(restored.did).toBe(identity.did);
    expect(restored.publicKey).toBe(identity.publicKey);
    expect(restored.algorithm).toBe(identity.algorithm);
    expect(restored.metadata).toEqual({ foo: 'bar' });
  });

  it('Identity.deserialize rejects missing fields', () => {
    expect(() => Identity.deserialize({} as never)).toThrow(KeyringError);
  });

  it('Identity.deserialize rejects unknown algorithm', () => {
    const { publicKey, algorithm } = generateKeyPair('ecdsa');
    const pem = exportKeyPem(publicKey, 'public');
    const identity = Identity.fromPublicKey(pem, algorithm);
    const ser = identity.serialize();
    expect(() =>
      Identity.deserialize({ ...ser, algorithm: 'ed25519' as never })
    ).toThrow(KeyringError);
  });

  it('fingerprint returns a hex SHA-256', () => {
    const { publicKey, algorithm } = generateKeyPair('ecdsa');
    const pem = exportKeyPem(publicKey, 'public');
    const identity = Identity.fromPublicKey(pem, algorithm);
    expect(identity.fingerprint()).toMatch(/^[0-9a-f]{64}$/);
  });

  it('equals compares by DID', () => {
    const { publicKey, algorithm } = generateKeyPair('ecdsa');
    const pem = exportKeyPem(publicKey, 'public');
    const a = Identity.fromPublicKey(pem, algorithm);
    const b = Identity.fromPublicKey(pem, algorithm);
    expect(a.equals(b)).toBe(true);
  });

  it('base58Encode encodes empty buffer', () => {
    expect(base58Encode(Buffer.alloc(0))).toBe('');
  });

  it('base58Encode encodes known values', () => {
    // base58("hello") = "Cn8eVZg"
    expect(base58Encode(Buffer.from('hello', 'utf8'))).toBe('Cn8eVZg');
  });

  it('base58Encode handles leading zeros', () => {
    const input = Buffer.from([0, 0, 1]);
    const enc = base58Encode(input);
    expect(enc.startsWith('11')).toBe(true); // two leading zero bytes → two '1's
  });

  it('uses a stable id when provided', () => {
    const { publicKey, algorithm } = generateKeyPair('ecdsa');
    const pem = exportKeyPem(publicKey, 'public');
    const id = 'custom-id-1234';
    const identity = new Identity({
      id,
      did: 'did:key:zabc',
      publicKey: pem,
      algorithm,
    });
    expect(identity.id).toBe(id);
  });

  it('works across platforms (smoke)', () => {
    // Ensure no OS-specific assumptions; this is mostly a placeholder that
    // documents the requirement.
    expect(os.platform()).toBeTruthy();
    expect(path.sep).toBeTruthy();
  });
});
