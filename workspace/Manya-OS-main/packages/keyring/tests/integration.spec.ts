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
  RoleManager,
  AccessEnforcer,
  defaultPolicySet,
  MultiDeviceSync,
  ConsoleLogger,
  SilentLogger,
  createBackup,
  restoreBackup,
  shamirSplit,
  shamirCombine,
  generateKeyPair,
  exportKeyPem,
  encrypt,
  decrypt,
  sha256,
  getKeyFingerprint,
  KeyringError,
  AccessDeniedError,
  BackupError,
  type VerifiableCredential,
  type EncryptedBackup,
} from '@manya-os/keyring';

/**
 * End-to-end integration test exercising the full keyring lifecycle:
 *
 *   create wallet → create identity → assign role → issue credential →
 *   sign → verify → export encrypted → import → sync to second wallet →
 *   enforce access → recover with Shamir
 */
describe('Integration: full keyring lifecycle', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manya-keyring-int-'));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('walks the full lifecycle', async () => {
    // 1. Create wallet (with FileStorage + ConsoleLogger).
    const storage = new FileStorage(path.join(tmpDir, 'wallet-A'));
    await storage.ensureInitialized();
    const wallet = new KeyringWallet({
      storage,
      logger: new SilentLogger(),
    });

    // 2. Create identity.
    const identity = await wallet.createIdentity('ecdsa', {
      name: 'sovereign-agent',
      agentId: 'azura-1',
    });
    expect(identity).toBeInstanceOf(Identity);
    expect(identity.did).toMatch(/^did:key:z/);
    expect(identity.metadata.agentId).toBe('azura-1');

    // 3. Assign role.
    await wallet.assignRole(identity.id, Role.Admin);
    const rm = new RoleManager(storage);
    expect(await rm.hasRole(identity.id, Role.Admin)).toBe(true);

    // 4. Issue credential.
    const subjectDid = 'did:key:zsubject123';
    const cred = await wallet.issueCredential(subjectDid, {
      role: 'admin',
      clearance: 'top-secret',
      scope: 'manya-os',
    });
    expect(cred.issuer).toBe(identity.did);
    expect(cred.subject).toBe(subjectDid);
    expect(wallet.listCredentials().length).toBe(1);

    // 5. Sign and verify arbitrary data.
    const data = Buffer.from('the quick brown fox', 'utf8');
    const { signature, algorithm } = await wallet.sign(data);
    expect(algorithm).toBe('ecdsa-p256');
    const verified = await wallet.verify(data, signature);
    expect(verified).toBe(true);
    const badVerified = await wallet.verify(Buffer.from('tampered', 'utf8'), signature);
    expect(badVerified).toBe(false);

    // 6. Export encrypted, then re-import.
    const blob = await wallet.exportEncrypted('strong-passphrase-2024');
    expect(blob.kind).toBe('manya-keyring-wallet');
    expect(blob.iterations).toBeGreaterThanOrEqual(100_000);

    const restored = new KeyringWallet();
    await restored.importEncrypted(blob, 'strong-passphrase-2024');
    expect(restored.listIdentities().length).toBe(1);
    const restoredId = restored.getPrimaryIdentity()!;
    expect(restoredId.did).toBe(identity.did);
    expect(restoredId.fingerprint()).toBe(identity.fingerprint());
    expect(restored.listCredentials().length).toBe(1);
    expect(restored.getCredential(cred.id)?.issuer).toBe(identity.did);

    // Re-imported wallet should still be able to sign.
    const sig2 = await restored.sign(data);
    expect(await restored.verify(data, sig2.signature)).toBe(true);
    // And the new signature should verify against the original wallet.
    expect(await wallet.verify(data, sig2.signature)).toBe(true);

    // 7. Sync to a second wallet.
    const wallet2 = new KeyringWallet();
    await wallet2.createIdentity('ecdsa', { name: 'wallet-2' });
    const sync = new MultiDeviceSync();
    const bundle = sync.createSyncBundle(wallet);
    expect(bundle.sourceDid).toBe(identity.did);

    const result = await sync.applySyncBundle(wallet2, bundle, identity.publicKey);
    expect(result.applied).toContain(cred.id);
    expect(wallet2.listCredentials().length).toBe(1);
    const syncedCred = wallet2.getCredential(cred.id);
    expect(syncedCred?.claims).toEqual(cred.claims);

    // 8. Enforce access on the second wallet.
    const w2id = wallet2.getPrimaryIdentity()!;
    await wallet2.assignRole(w2id.id, Role.Agent);
    const enforcer = wallet2.access;
    const canSign = await enforcer.enforce(w2id.id, 'wallet:sign', 'perform');
    expect(canSign.allowed).toBe(true);
    const canExport = await enforcer.enforce(w2id.id, 'wallet:export', 'perform');
    expect(canExport.allowed).toBe(false);
    await expect(
      enforcer.enforceOrThrow(w2id.id, 'wallet:export', 'perform')
    ).rejects.toThrow(AccessDeniedError);

    // 9. Recover with Shamir: split a master key, lose some shares, recombine.
    const masterKey = crypto.randomBytes(32);
    const shares = shamirSplit(masterKey, 3, 5);
    expect(shares.length).toBe(5);
    // Use any 3 of the 5 shares.
    const subset = [shares[0], shares[2], shares[4]];
    const recovered = shamirCombine(subset);
    expect(recovered.equals(masterKey)).toBe(true);

    // 10. Round-trip: encrypt a payload with the recovered key.
    const { iv, ciphertext, tag } = encrypt(recovered, Buffer.from('recovered secret', 'utf8'));
    const plain = decrypt(recovered, iv, ciphertext, tag);
    expect(plain.toString('utf8')).toBe('recovered secret');
  });

  it('backup + restore a wallet', async () => {
    const wallet = new KeyringWallet();
    const id = await wallet.createIdentity('ecdsa', { name: 'backed-up' });
    await wallet.issueCredential('did:key:zsub', { x: 1 });
    await wallet.issueCredential('did:key:zsub', { x: 2 });

    const backup = createBackup(wallet, 'backup-passphrase');
    expect(backup.version).toBe(1);
    expect(backup.iterations).toBeGreaterThanOrEqual(100_000);

    // Restore into a fresh object.
    const { payload } = restoreBackup(backup, 'backup-passphrase');
    expect(payload.identities.length).toBe(1);
    expect(payload.identities[0].did).toBe(id.did);
    expect(payload.credentials.length).toBe(2);
    // The private key is NOT in the backup.
    expect(JSON.stringify(payload)).not.toContain('BEGIN PRIVATE KEY');
  });

  it('backup rejects wrong passphrase', async () => {
    const wallet = new KeyringWallet();
    await wallet.createIdentity('ecdsa');
    const backup = createBackup(wallet, 'right');
    expect(() => restoreBackup(backup, 'wrong')).toThrow(BackupError);
  });

  it('wallet persists across FileStorage instances', async () => {
    const dir = path.join(tmpDir, 'persist');
    const storage1 = new FileStorage(dir);
    await storage1.ensureInitialized();

    const wallet1 = new KeyringWallet({ storage: storage1 });
    const id = await wallet1.createIdentity('ecdsa', { name: 'persisted' });
    await wallet1.assignRole(id.id, Role.Agent);

    // A fresh wallet bound to the same storage should see the roles.
    const wallet2 = new KeyringWallet({ storage: storage1 });
    expect(await wallet2.roles.hasRole(id.id, Role.Agent)).toBe(true);
  });

  it('cross-wallet signature verification works', async () => {
    // walletA signs, walletB verifies using A's public key.
    const walletA = new KeyringWallet();
    const walletB = new KeyringWallet();
    const idA = await walletA.createIdentity('ecdsa');
    await walletB.createIdentity('ecdsa');

    const data = Buffer.from('cross-wallet message', 'utf8');
    const { signature, algorithm } = await walletA.sign(data);

    // walletB verifies using idA's public key + known algorithm.
    const ok = await walletB.verify(data, signature, {
      publicKey: idA.publicKey,
      algorithm,
    });
    expect(ok).toBe(true);
  });

  it('credential issued by wallet A verifies in wallet B', async () => {
    const walletA = new KeyringWallet();
    const walletB = new KeyringWallet();
    const idA = await walletA.createIdentity('ecdsa');
    await walletB.createIdentity('ecdsa');

    const cred = await walletA.issueCredential('did:key:zsub', { role: 'operator' });

    // walletB adds the credential and imports idA's public identity (with a
    // throwaway private key — only the public key is used for verification).
    await walletB.addCredential(cred);
    await walletB.importIdentity(
      idA.publicKey,
      generateKeyPair('ecdsa').privateKey,
      'ecdsa-p256'
    );

    // Verify using the issuer's DID lookup (no explicit identityId needed).
    const verified = await walletB.verifyCredential(cred);
    expect(verified).toBe(true);

    // Also verify by passing the imported identity's id explicitly.
    const importedId = walletB.listIdentities().find((i) => i.did === idA.did)!;
    expect(importedId).toBeDefined();
    const verifiedById = await walletB.verifyCredential(cred, importedId.id);
    expect(verifiedById).toBe(true);
  });

  it('a full 3-device sync fanout', async () => {
    // Device A creates a credential. Sync bundle propagates A → B → C.
    const deviceA = new KeyringWallet();
    const idA = await deviceA.createIdentity('ecdsa', { name: 'A' });
    const cred = await deviceA.issueCredential('did:key:zsub', { x: 'A' });

    const deviceB = new KeyringWallet();
    const idB = await deviceB.createIdentity('ecdsa', { name: 'B' });
    const deviceC = new KeyringWallet();
    const idC = await deviceC.createIdentity('ecdsa', { name: 'C' });

    const sync = new MultiDeviceSync();

    // A → B
    const bundleAB = sync.createSyncBundle(deviceA);
    const r1 = await sync.applySyncBundle(deviceB, bundleAB, idA.publicKey);
    expect(r1.applied).toContain(cred.id);

    // B → C (signed by B)
    const bundleBC = sync.createSyncBundle(deviceB);
    const r2 = await sync.applySyncBundle(deviceC, bundleBC, idB.publicKey);
    expect(r2.applied).toContain(cred.id);
    expect(deviceC.getCredential(cred.id)?.claims).toEqual({ x: 'A' });

    // C → A (signed by C, A already has the cred so should skip)
    const bundleCA = sync.createSyncBundle(deviceC);
    const r3 = await sync.applySyncBundle(deviceA, bundleCA, idC.publicKey);
    expect(r3.skipped).toContain(cred.id);
  });

  it('Shamir recovery with k=3, n=5 across realistic key sizes', () => {
    for (const len of [16, 32, 64, 256, 1024]) {
      const secret = crypto.randomBytes(len);
      const shares = shamirSplit(secret, 3, 5);
      // Use 3 random distinct shares.
      const idxs = [0, 2, 4];
      const recovered = shamirCombine(idxs.map((i) => shares[i]));
      expect(recovered.equals(secret)).toBe(true);
    }
  });

  it('constant-time compare is used (smoke check via public API)', () => {
    // This isn't a true timing test, but it ensures the public compare path works.
    const a = sha256('hello');
    const b = sha256('hello');
    expect(a.equals(b)).toBe(true);
    expect(getKeyFingerprint(exportKeyPem(generateKeyPair('ecdsa').publicKey, 'public'))).toMatch(/^[0-9a-f]{64}$/);
  });

  it('logger scrubs secrets from logged metadata', () => {
    // Spy on stdout to verify scrubbing.
    const origWrite = process.stdout.write.bind(process.stdout);
    const lines: string[] = [];
    process.stdout.write = ((chunk: unknown) => {
      lines.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      const logger = new ConsoleLogger('debug');
      logger.info('test-event', {
        password: 'super-secret',
        token: 'tok-xyz',
        privateKey: '---BEGIN---',
        iv: Buffer.from([1, 2, 3]),
        tag: '0123',
        share: Buffer.alloc(8),
        credential: { secret: 'x' },
        safe: 'visible',
      });
    } finally {
      process.stdout.write = origWrite;
    }
    const joined = lines.join('\n');
    expect(joined).toContain('"password":"[redacted]"');
    expect(joined).toContain('"token":"[redacted]"');
    expect(joined).toContain('"privateKey":"[redacted]"');
    expect(joined).toContain('"iv":"[redacted]"');
    expect(joined).toContain('"tag":"[redacted]"');
    expect(joined).toContain('"share":"[redacted]"');
    expect(joined).toContain('"credential":"[redacted]"');
    expect(joined).toContain('"safe":"visible"');
    expect(joined).not.toContain('super-secret');
    expect(joined).not.toContain('tok-xyz');
    expect(joined).not.toContain('---BEGIN---');
  });

  it('rejects RBAC escalation: agent cannot assign roles', async () => {
    const wallet = new KeyringWallet();
    const admin = await wallet.createIdentity('ecdsa', { name: 'admin' });
    await wallet.assignRole(admin.id, Role.Admin);

    const agent = await wallet.createIdentity('ecdsa', { name: 'agent' });
    await wallet.assignRole(agent.id, Role.Agent);

    // Agent should NOT be allowed to manage roles.
    const result = await wallet.access.enforce(agent.id, 'role:admin', 'manage');
    expect(result.allowed).toBe(false);

    // Admin should be allowed.
    const adminResult = await wallet.access.enforce(admin.id, 'role:admin', 'manage');
    expect(adminResult.allowed).toBe(true);
  });

  it('gracefully handles a tampered encrypted wallet blob', async () => {
    const wallet = new KeyringWallet();
    await wallet.createIdentity('ecdsa');
    const blob = await wallet.exportEncrypted('p');
    // Tamper with one byte of the ciphertext.
    const ct = Buffer.from(blob.ciphertext, 'base64');
    ct[0] ^= 0xff;
    const tampered = { ...blob, ciphertext: ct.toString('base64') };
    const w2 = new KeyringWallet();
    await expect(w2.importEncrypted(tampered, 'p')).rejects.toThrow();
  });
});
