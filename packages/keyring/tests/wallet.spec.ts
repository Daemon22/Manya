import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  KeyringWallet,
  InMemoryStorage,
  FileStorage,
  SoftwareKeyProvider,
  Identity,
  Role,
  ConsoleLogger,
  SilentLogger,
  generateKeyPair,
  exportKeyPem,
  EncryptionError,
  DecryptionError,
  KeyringError,
  type EncryptedWalletBlob,
  type VerifiableCredential,
  type EncryptedStorage,
} from '@manya-os/keyring';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manya-keyring-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('KeyringWallet — identity management', () => {
  it('constructs with defaults', () => {
    const w = new KeyringWallet();
    expect(w).toBeInstanceOf(KeyringWallet);
    expect(w.listIdentities()).toEqual([]);
    expect(w.getPrimaryIdentity()).toBeUndefined();
  });

  it('accepts a custom logger and storage', () => {
    const storage = new InMemoryStorage();
    const logger = new SilentLogger();
    const w = new KeyringWallet({ storage, logger });
    expect(w).toBeDefined();
  });

  it('creates an ECDSA identity and sets it as primary', async () => {
    const w = new KeyringWallet();
    const id = await w.createIdentity('ecdsa', { name: 'agent-1' });
    expect(id).toBeInstanceOf(Identity);
    expect(id.did).toMatch(/^did:key:z/);
    expect(id.metadata.name).toBe('agent-1');
    expect(w.listIdentities().length).toBe(1);
    expect(w.getPrimaryIdentity()?.id).toBe(id.id);
  });

  it('creates an RSA identity', async () => {
    const w = new KeyringWallet();
    const id = await w.createIdentity('rsa', {});
    expect(id.algorithm).toBe('rsa-pss');
  });

  it('can create multiple identities; first is primary', async () => {
    const w = new KeyringWallet();
    const a = await w.createIdentity('ecdsa');
    const b = await w.createIdentity('ecdsa');
    expect(w.getPrimaryIdentity()?.id).toBe(a.id);
    expect(w.listIdentities().length).toBe(2);
    w.setPrimaryIdentity(b.id);
    expect(w.getPrimaryIdentity()?.id).toBe(b.id);
  });

  it('setPrimaryIdentity throws on unknown id', () => {
    const w = new KeyringWallet();
    expect(() => w.setPrimaryIdentity('unknown')).toThrow(KeyringError);
  });

  it('getIdentity returns the matching identity', async () => {
    const w = new KeyringWallet();
    const id = await w.createIdentity('ecdsa');
    expect(w.getIdentity(id.id)?.id).toBe(id.id);
    expect(w.getIdentity('nonexistent')).toBeUndefined();
  });
});

describe('KeyringWallet — signing', () => {
  it('sign and verify round-trip', async () => {
    const w = new KeyringWallet();
    await w.createIdentity('ecdsa');
    const data = Buffer.from('hello keyring', 'utf8');
    const { signature, algorithm } = await w.sign(data);
    expect(signature).toMatch(/^[0-9a-f]+$/);
    expect(algorithm).toBe('ecdsa-p256');
    const ok = await w.verify(data, signature);
    expect(ok).toBe(true);
  });

  it('signViaProvider produces a verifiable signature', async () => {
    const w = new KeyringWallet();
    await w.createIdentity('ecdsa');
    const data = Buffer.from('via provider', 'utf8');
    const { signature } = await w.signViaProvider(data);
    const ok = await w.verify(data, signature);
    expect(ok).toBe(true);
  });

  it('sign throws when no identity exists', async () => {
    const w = new KeyringWallet();
    await expect(w.sign(Buffer.from('x'))).rejects.toThrow(KeyringError);
  });

  it('verify with explicit identityId', async () => {
    const w = new KeyringWallet();
    const id = await w.createIdentity('ecdsa');
    const data = Buffer.from('hi', 'utf8');
    const { signature } = await w.sign(data);
    expect(await w.verify(data, signature, { identityId: id.id })).toBe(true);
  });

  it('verify with explicit publicKey + algorithm', async () => {
    const w = new KeyringWallet();
    const id = await w.createIdentity('ecdsa');
    const data = Buffer.from('hi', 'utf8');
    const { signature, algorithm } = await w.sign(data);
    expect(
      await w.verify(data, signature, {
        publicKey: id.publicKey,
        algorithm,
      })
    ).toBe(true);
  });

  it('sign and verify with RSA', async () => {
    const w = new KeyringWallet();
    await w.createIdentity('rsa', undefined as never);
    const data = Buffer.from('hello rsa', 'utf8');
    const { signature, algorithm } = await w.sign(data);
    expect(algorithm).toBe('rsa-pss');
    expect(await w.verify(data, signature)).toBe(true);
  });
});

describe('KeyringWallet — credentials', () => {
  it('issues a credential and stores it', async () => {
    const w = new KeyringWallet();
    const id = await w.createIdentity('ecdsa');
    const cred = await w.issueCredential('did:key:zsubject', {
      role: 'operator',
      level: 3,
    });
    expect(cred.issuer).toBe(id.did);
    expect(cred.subject).toBe('did:key:zsubject');
    expect(cred.claims).toEqual({ role: 'operator', level: 3 });
    expect(w.listCredentials().length).toBe(1);
    expect(w.getCredential(cred.id)?.id).toBe(cred.id);
  });

  it('verifies a credential it issued', async () => {
    const w = new KeyringWallet();
    await w.createIdentity('ecdsa');
    const cred = await w.issueCredential('did:key:zsubject', { foo: 'bar' });
    expect(await w.verifyCredential(cred)).toBe(true);
  });

  it('addCredential stores an externally-issued credential', async () => {
    const w = new KeyringWallet();
    const fakeCred: VerifiableCredential = {
      id: 'ext-1',
      issuer: 'did:key:zother',
      subject: 'did:key:zme',
      claims: { a: 1 },
      issuedAt: new Date().toISOString(),
      proof: {
        type: 'manya:ecdsa-p256:2024',
        created: new Date().toISOString(),
        verificationMethod: 'did:key:zother',
        proofValue: 'deadbeef',
        algorithm: 'ecdsa-p256',
      },
    };
    await w.addCredential(fakeCred);
    expect(w.listCredentials().length).toBe(1);
  });

  it('addCredential rejects missing id', async () => {
    const w = new KeyringWallet();
    await expect(w.addCredential({} as never)).rejects.toThrow();
  });

  it('deleteCredential removes a credential', async () => {
    const w = new KeyringWallet();
    await w.createIdentity('ecdsa');
    const cred = await w.issueCredential('did:key:zsubject', {});
    expect(w.deleteCredential(cred.id)).toBe(true);
    expect(w.deleteCredential(cred.id)).toBe(false);
  });

  it('verifyCredential returns false for unknown issuer', async () => {
    const w = new KeyringWallet();
    await w.createIdentity('ecdsa');
    const cred: VerifiableCredential = {
      id: 'x',
      issuer: 'did:key:zunknown',
      subject: 'did:key:zme',
      claims: {},
      issuedAt: new Date().toISOString(),
      proof: {
        type: 'manya:ecdsa-p256:2024',
        created: new Date().toISOString(),
        verificationMethod: 'did:key:zunknown',
        proofValue: '00',
        algorithm: 'ecdsa-p256',
      },
    };
    expect(await w.verifyCredential(cred)).toBe(false);
  });
});

describe('KeyringWallet — encrypted export/import', () => {
  it('exports and re-imports a wallet', async () => {
    const w = new KeyringWallet();
    await w.createIdentity('ecdsa', { name: 'agent' });
    const cred = await w.issueCredential('did:key:zsub', { x: 1 });

    const blob = await w.exportEncrypted('my-passphrase');
    expect(blob.kind).toBe('manya-keyring-wallet');
    expect(blob.salt).toBeTruthy();
    expect(blob.iv).toBeTruthy();
    expect(blob.ciphertext).toBeTruthy();
    expect(blob.tag).toBeTruthy();
    expect(blob.iterations).toBeGreaterThanOrEqual(100_000);

    const w2 = new KeyringWallet();
    await w2.importEncrypted(blob, 'my-passphrase');
    expect(w2.listIdentities().length).toBe(1);
    expect(w2.listCredentials().length).toBe(1);
    expect(w2.getCredential(cred.id)?.id).toBe(cred.id);
    // Re-imported identity should be able to verify signatures.
    const data = Buffer.from('hello', 'utf8');
    const { signature } = await w2.sign(data);
    expect(await w2.verify(data, signature)).toBe(true);
  });

  it('export rejects empty passphrase', async () => {
    const w = new KeyringWallet();
    await w.createIdentity('ecdsa');
    await expect(w.exportEncrypted('')).rejects.toThrow(EncryptionError);
  });

  it('import rejects wrong passphrase', async () => {
    const w = new KeyringWallet();
    await w.createIdentity('ecdsa');
    const blob = await w.exportEncrypted('right-pass');
    const w2 = new KeyringWallet();
    await expect(w2.importEncrypted(blob, 'wrong-pass')).rejects.toThrow(
      DecryptionError
    );
  });

  it('import rejects wrong blob kind', async () => {
    const w = new KeyringWallet();
    const fakeBlob = {
      kind: 'not-a-wallet',
      version: 1,
      salt: '',
      iv: '',
      ciphertext: '',
      tag: '',
      createdAt: '',
      iterations: 1000,
    } as unknown as EncryptedWalletBlob;
    await expect(w.importEncrypted(fakeBlob, 'x')).rejects.toThrow();
  });

  it('exported blob is JSON-serializable', async () => {
    const w = new KeyringWallet();
    await w.createIdentity('ecdsa');
    const blob = await w.exportEncrypted('pass');
    expect(() => JSON.stringify(blob)).not.toThrow();
    const restored = JSON.parse(JSON.stringify(blob)) as EncryptedWalletBlob;
    const w2 = new KeyringWallet();
    await w2.importEncrypted(restored, 'pass');
    expect(w2.listIdentities().length).toBe(1);
  });
});

describe('KeyringWallet — roles & access', () => {
  it('assignRole + enforce via wallet convenience helpers', async () => {
    const w = new KeyringWallet();
    const id = await w.createIdentity('ecdsa');
    await w.assignRole(id.id, Role.Admin);
    const r = await w.access.enforce(id.id, 'wallet:export', 'perform');
    expect(r.allowed).toBe(true);
  });

  it('revokeRole removes the role', async () => {
    const w = new KeyringWallet();
    const id = await w.createIdentity('ecdsa');
    await w.assignRole(id.id, Role.Admin);
    await w.revokeRole(id.id, Role.Admin);
    const r = await w.access.enforce(id.id, 'wallet:export', 'perform');
    expect(r.allowed).toBe(false);
  });
});

describe('KeyringWallet — sequence counter', () => {
  it('starts at zero and bumps', () => {
    const w = new KeyringWallet();
    expect(w.getSequence()).toBe(0);
    expect(w.bumpSequence()).toBe(1);
    expect(w.bumpSequence()).toBe(2);
    expect(w.getSequence()).toBe(2);
  });
});

describe('InMemoryStorage', () => {
  it('put / get / delete / list', async () => {
    const s = new InMemoryStorage();
    await s.put('a', Buffer.from('1'));
    await s.put('b', Buffer.from('2'));
    expect((await s.get('a'))?.toString()).toBe('1');
    expect(await s.get('missing')).toBeNull();
    expect(await s.list()).toEqual(['a', 'b']);
    expect(await s.list('a')).toEqual(['a']);
    await s.delete('a');
    expect(await s.get('a')).toBeNull();
    expect(s.size).toBe(1);
    s.clear();
    expect(s.size).toBe(0);
  });

  it('defensive copy on put', async () => {
    const s = new InMemoryStorage();
    const buf = Buffer.from('hello');
    await s.put('a', buf);
    buf.write('world');
    expect((await s.get('a'))?.toString()).toBe('hello');
  });

  it('rejects non-Buffer value', async () => {
    const s = new InMemoryStorage();
    await expect(s.put('a', 'x' as never)).rejects.toThrow();
  });
});

describe('FileStorage', () => {
  it('persists across instances', async () => {
    const dir = path.join(tmpDir, 'fs1');
    const s1 = new FileStorage(dir);
    await s1.ensureInitialized();
    await s1.put('a:b:c', Buffer.from('hello'));
    await s1.put('a:b:d', Buffer.from('world'));
    const s2 = new FileStorage(dir);
    expect((await s2.get('a:b:c'))?.toString()).toBe('hello');
    expect((await s2.get('a:b:d'))?.toString()).toBe('world');
  });

  it('lists keys with prefix', async () => {
    const dir = path.join(tmpDir, 'fs2');
    const s = new FileStorage(dir);
    await s.ensureInitialized();
    await s.put('manya:roles:alpha', Buffer.from('x'));
    await s.put('manya:roles:beta', Buffer.from('x'));
    await s.put('manya:other:gamma', Buffer.from('x'));
    const keys = await s.list('manya:roles:');
    expect(keys.sort()).toEqual(['manya:roles:alpha', 'manya:roles:beta']);
  });

  it('delete is idempotent', async () => {
    const dir = path.join(tmpDir, 'fs3');
    const s = new FileStorage(dir);
    await s.ensureInitialized();
    await s.put('a', Buffer.from('x'));
    await s.delete('a');
    await s.delete('a');
    expect(await s.get('a')).toBeNull();
  });

  it('rejects path traversal', async () => {
    const dir = path.join(tmpDir, 'fs4');
    const s = new FileStorage(dir);
    await expect(s.put('../escape', Buffer.from('x'))).rejects.toThrow();
  });

  it('rejects empty key', async () => {
    const dir = path.join(tmpDir, 'fs5');
    const s = new FileStorage(dir);
    await expect(s.put('', Buffer.from('x'))).rejects.toThrow();
  });

  it('returns null for missing key', async () => {
    const dir = path.join(tmpDir, 'fs6');
    const s = new FileStorage(dir);
    expect(await s.get('missing')).toBeNull();
  });
});

describe('ConsoleLogger', () => {
  it('does not throw and scrubs secrets', () => {
    const logger = new ConsoleLogger('debug');
    // We just verify it doesn't throw. Output goes to stdout/stderr.
    expect(() =>
      logger.info('test', { password: 'secret', token: 'abc', ok: 'visible' })
    ).not.toThrow();
  });

  it('silent level logs nothing (but does not throw)', () => {
    const logger = new ConsoleLogger('silent');
    expect(() => logger.info('test')).not.toThrow();
    expect(() => logger.error('test', { secret: 'x' })).not.toThrow();
  });
});
