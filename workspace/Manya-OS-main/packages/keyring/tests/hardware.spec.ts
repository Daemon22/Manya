import * as crypto from 'crypto';
import {
  HardwareKeyProvider,
  SoftwareKeyProvider,
  generateKeyPair,
  exportKeyPem,
  HardwareKeyError,
  sign as signWithKey,
  verify as verifyWithKey,
} from '@manya-os/keyring';

describe('SoftwareKeyProvider', () => {
  it('isAvailable returns true', () => {
    const p = new SoftwareKeyProvider();
    expect(p.isAvailable()).toBe(true);
  });

  it('generateKeyPair returns a keyId + PEM', async () => {
    const p = new SoftwareKeyProvider();
    const result = await p.generateKeyPair('ecdsa');
    expect(result.keyId).toMatch(/^sw-/);
    expect(result.publicKeyPem).toMatch(/BEGIN PUBLIC KEY/);
    expect(result.algorithm).toBe('ecdsa-p256');
  });

  it('generateKeyPair with hint uses it as keyId', async () => {
    const p = new SoftwareKeyProvider();
    const result = await p.generateKeyPair('ecdsa', 'my-key');
    expect(result.keyId).toBe('my-key');
  });

  it('generateKeyPair rejects duplicate keyId', async () => {
    const p = new SoftwareKeyProvider();
    await p.generateKeyPair('ecdsa', 'dup');
    await expect(p.generateKeyPair('ecdsa', 'dup')).rejects.toThrow();
  });

  it('sign + verify round-trips', async () => {
    const p = new SoftwareKeyProvider();
    const { keyId } = await p.generateKeyPair('ecdsa');
    const data = Buffer.from('hello world', 'utf8');
    const sig = await p.sign(keyId, data);
    expect(sig.length).toBeGreaterThan(0);
    const ok = await p.verify(keyId, data, sig);
    expect(ok).toBe(true);
  });

  it('verify fails for tampered data', async () => {
    const p = new SoftwareKeyProvider();
    const { keyId } = await p.generateKeyPair('ecdsa');
    const data = Buffer.from('hello world', 'utf8');
    const sig = await p.sign(keyId, data);
    const ok = await p.verify(keyId, Buffer.from('hello world!', 'utf8'), sig);
    expect(ok).toBe(false);
  });

  it('sign throws on unknown keyId', async () => {
    const p = new SoftwareKeyProvider();
    await expect(p.sign('unknown', Buffer.from('x'))).rejects.toThrow(
      HardwareKeyError
    );
  });

  it('verify throws on unknown keyId', async () => {
    const p = new SoftwareKeyProvider();
    await expect(
      p.verify('unknown', Buffer.from('x'), Buffer.alloc(64))
    ).rejects.toThrow(HardwareKeyError);
  });

  it('deleteKey removes the key', async () => {
    const p = new SoftwareKeyProvider();
    const { keyId } = await p.generateKeyPair('ecdsa');
    expect(await p.hasKey(keyId)).toBe(true);
    await p.deleteKey(keyId);
    expect(await p.hasKey(keyId)).toBe(false);
    expect(p.size).toBe(0);
  });

  it('RSA keys also work', async () => {
    const p = new SoftwareKeyProvider();
    const { keyId, algorithm } = await p.generateKeyPair('rsa', undefined);
    expect(algorithm).toBe('rsa-pss');
    const data = Buffer.from('hello rsa', 'utf8');
    const sig = await p.sign(keyId, data);
    expect(await p.verify(keyId, data, sig)).toBe(true);
  });

  it('replaceKey swaps the private key', async () => {
    const p = new SoftwareKeyProvider();
    const { keyId } = await p.generateKeyPair('ecdsa');
    const { privateKey, algorithm } = generateKeyPair('ecdsa');
    p.replaceKey(keyId, privateKey);
    const data = Buffer.from('hello', 'utf8');
    const sig = await p.sign(keyId, data);
    expect(sig.length).toBeGreaterThan(0);
    // Verify with the new key's public key.
    const pubPem = exportKeyPem(p.getPublicKey(keyId)!, 'public');
    expect(verifyWithKey(pubPem, data, sig, algorithm)).toBe(true);
  });

  it('getPrivateKey returns undefined for unknown keyId', () => {
    const p = new SoftwareKeyProvider();
    expect(p.getPrivateKey('unknown')).toBeUndefined();
  });

  it('getAlgorithm returns the algorithm', async () => {
    const p = new SoftwareKeyProvider();
    const { keyId } = await p.generateKeyPair('ecdsa');
    expect(p.getAlgorithm(keyId)).toBe('ecdsa-p256');
  });

  it('importExistingKey registers a keypair', () => {
    const p = new SoftwareKeyProvider();
    const { publicKey, privateKey, algorithm } = generateKeyPair('ecdsa');
    const keyId = p.importExistingKey(publicKey, privateKey, algorithm, 'imp');
    expect(keyId).toBe('imp');
    expect(p.size).toBe(1);
  });

  it('clear wipes all keys', async () => {
    const p = new SoftwareKeyProvider();
    await p.generateKeyPair('ecdsa');
    await p.generateKeyPair('ecdsa');
    p.clear();
    expect(p.size).toBe(0);
  });

  it('sign produces signatures that verify against the stored key', async () => {
    // ECDSA is non-deterministic, so we check verification rather than equality.
    const p = new SoftwareKeyProvider();
    const { keyId } = await p.generateKeyPair('ecdsa');
    const data = Buffer.from('check', 'utf8');
    const sigFromProvider = await p.sign(keyId, data);
    // Provider verify path.
    expect(await p.verify(keyId, data, sigFromProvider)).toBe(true);
    // Cross-check via crypto.verify directly using the stored public key.
    const pubPem = exportKeyPem(p.getPublicKey(keyId)!, 'public');
    expect(verifyWithKey(pubPem, data, sigFromProvider, 'ecdsa-p256')).toBe(true);
  });
});

describe('HardwareKeyProvider contract', () => {
  it('SoftwareKeyProvider satisfies the interface', () => {
    const p: HardwareKeyProvider = new SoftwareKeyProvider();
    expect(typeof p.isAvailable).toBe('function');
    expect(typeof p.generateKeyPair).toBe('function');
    expect(typeof p.sign).toBe('function');
    expect(typeof p.verify).toBe('function');
  });

  it('can be implemented as a stub', async () => {
    // A trivial stub implementation for testing the interface contract.
    const stub: HardwareKeyProvider = {
      isAvailable: () => false,
      async generateKeyPair() {
        return {
          keyId: 'stub',
          publicKeyPem: '',
          algorithm: 'ecdsa-p256' as const,
        };
      },
      async sign() {
        return Buffer.alloc(0);
      },
      async verify() {
        return false;
      },
    };
    expect(stub.isAvailable()).toBe(false);
    const r = await stub.generateKeyPair('ecdsa');
    expect(r.keyId).toBe('stub');
  });
});
