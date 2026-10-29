import * as crypto from 'crypto';
import {
  MultiDeviceSync,
  KeyringWallet,
  SoftwareKeyProvider,
  VerificationError,
  SyncError,
  buildBundleFromParts,
  type SyncBundle,
  type VerifiableCredential,
} from '@manya-os/keyring';

describe('MultiDeviceSync', () => {
  it('createSyncBundle returns a signed bundle', async () => {
    const w = new KeyringWallet();
    const id = await w.createIdentity('ecdsa');
    const cred = await w.issueCredential('did:key:zsub', { x: 1 });
    const sync = new MultiDeviceSync();
    const bundle = sync.createSyncBundle(w);
    expect(bundle.version).toBe(1);
    expect(bundle.sourceDid).toBe(id.did);
    expect(bundle.identity.did).toBe(id.did);
    expect(bundle.credentials.length).toBe(1);
    expect(bundle.credentials[0].id).toBe(cred.id);
    expect(bundle.proof.value).toMatch(/^[0-9a-f]+$/);
    expect(bundle.proof.algorithm).toBe('ecdsa-p256');
    expect(bundle.sequence).toBe(1);
  });

  it('createSyncBundle throws when no primary identity', () => {
    const w = new KeyringWallet();
    const sync = new MultiDeviceSync();
    expect(() => sync.createSyncBundle(w)).toThrow(SyncError);
  });

  it('applySyncBundle verifies signature and applies new credentials', async () => {
    const w1 = new KeyringWallet();
    const id1 = await w1.createIdentity('ecdsa');
    const cred = await w1.issueCredential('did:key:zsub', { x: 1 });

    const w2 = new KeyringWallet();
    await w2.createIdentity('ecdsa');

    const sync = new MultiDeviceSync();
    const bundle = sync.createSyncBundle(w1);
    const result = await sync.applySyncBundle(w2, bundle, id1.publicKey);
    expect(result.applied).toContain(cred.id);
    expect(result.conflicts).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(w2.listCredentials().length).toBe(1);
  });

  it('applySyncBundle skips already-known credentials', async () => {
    const w1 = new KeyringWallet();
    const id1 = await w1.createIdentity('ecdsa');
    const cred = await w1.issueCredential('did:key:zsub', { x: 1 });

    const w2 = new KeyringWallet();
    await w2.createIdentity('ecdsa');
    // Pre-load the same credential into w2.
    await w2.addCredential(cred);

    const sync = new MultiDeviceSync();
    const bundle = sync.createSyncBundle(w1);
    const result = await sync.applySyncBundle(w2, bundle, id1.publicKey);
    expect(result.skipped).toContain(cred.id);
    expect(result.applied).toEqual([]);
    expect(result.conflicts).toEqual([]);
  });

  it('applySyncBundle detects conflicts when same id has different proof', async () => {
    const w1 = new KeyringWallet();
    const id1 = await w1.createIdentity('ecdsa');
    const cred1 = await w1.issueCredential('did:key:zsub', { x: 1 });

    const w2 = new KeyringWallet();
    const id2 = await w2.createIdentity('ecdsa');
    // Build a conflicting credential with the same id but different proof.
    const conflictCred: VerifiableCredential = {
      ...cred1,
      proof: { ...cred1.proof, proofValue: 'aabbcc' },
    };
    await w2.addCredential(conflictCred);

    const sync = new MultiDeviceSync();
    const bundle = sync.createSyncBundle(w1);
    const result = await sync.applySyncBundle(w2, bundle, id1.publicKey);
    expect(result.conflicts).toContain(cred1.id);
    expect(result.applied).toEqual([]);
    // Local conflicting credential is NOT overwritten.
    const stored = w2.getCredential(cred1.id);
    expect(stored?.proof.proofValue).toBe('aabbcc');
  });

  it('applySyncBundle throws on bad signature', async () => {
    const w1 = new KeyringWallet();
    await w1.createIdentity('ecdsa');
    const w2 = new KeyringWallet();
    const otherId = await w2.createIdentity('ecdsa');

    const sync = new MultiDeviceSync();
    const bundle = sync.createSyncBundle(w1);
    // Verify with a DIFFERENT public key — signature will not match.
    await expect(
      sync.applySyncBundle(w2, bundle, otherId.publicKey)
    ).rejects.toThrow(VerificationError);
  });

  it('applySyncBundle throws on missing proof', async () => {
    const w1 = new KeyringWallet();
    const id = await w1.createIdentity('ecdsa');
    const sync = new MultiDeviceSync();
    const bundle = sync.createSyncBundle(w1);
    const bad: SyncBundle = { ...bundle, proof: { ...bundle.proof, value: '' } };
    await expect(
      sync.applySyncBundle(new KeyringWallet(), bad, id.publicKey)
    ).rejects.toThrow(SyncError);
  });

  it('applySyncBundle throws on bad version', async () => {
    const w1 = new KeyringWallet();
    const id = await w1.createIdentity('ecdsa');
    const sync = new MultiDeviceSync();
    const bundle = sync.createSyncBundle(w1);
    const bad: SyncBundle = { ...bundle, version: 99 };
    await expect(
      sync.applySyncBundle(new KeyringWallet(), bad, id.publicKey)
    ).rejects.toThrow(SyncError);
  });

  it('applySyncBundle bumps sequence forward', async () => {
    const w1 = new KeyringWallet();
    await w1.createIdentity('ecdsa');
    w1.bumpSequence();
    w1.bumpSequence();
    w1.bumpSequence();
    const sync = new MultiDeviceSync();
    const bundle = sync.createSyncBundle(w1); // sequence = 4
    expect(bundle.sequence).toBe(4);

    const w2 = new KeyringWallet();
    await w2.createIdentity('ecdsa');
    expect(w2.getSequence()).toBe(0);
    await sync.applySyncBundle(w2, bundle, w1.getPrimaryIdentity()!.publicKey);
    expect(w2.getSequence()).toBeGreaterThanOrEqual(4);
  });

  it('validateBundle returns true for a valid bundle', async () => {
    const w = new KeyringWallet();
    const id = await w.createIdentity('ecdsa');
    const sync = new MultiDeviceSync();
    const bundle = sync.createSyncBundle(w);
    expect(sync.validateBundle(bundle, id.publicKey)).toBe(true);
  });

  it('validateBundle returns false for tampered bundle', async () => {
    const w = new KeyringWallet();
    const id = await w.createIdentity('ecdsa');
    const sync = new MultiDeviceSync();
    const bundle = sync.createSyncBundle(w);
    // Use a clearly-different timestamp (year 2099) to defeat same-millisecond collisions.
    const tampered: SyncBundle = {
      ...bundle,
      timestamp: '2099-01-01T00:00:00.000Z',
    };
    expect(sync.validateBundle(tampered, id.publicKey)).toBe(false);
  });

  it('buildBundleFromParts produces a verifiable bundle', async () => {
    const w = new KeyringWallet();
    const id = await w.createIdentity('ecdsa');
    // Pull the private key out of the software provider.
    const provider = (w as unknown as {
      hardwareProvider: SoftwareKeyProvider;
    }).hardwareProvider;
    const record = (w as unknown as {
      resolveIdentity: () => { keyId: string; algorithm: 'ecdsa-p256' };
    }).resolveIdentity();
    const sk = provider.getPrivateKey(record.keyId)!;
    const cred = await w.issueCredential('did:key:zsub', { x: 1 });
    const bundle = buildBundleFromParts(
      {
        sourceDid: id.did,
        timestamp: new Date().toISOString(),
        sequence: 42,
        identity: id.serialize(),
        credentials: [cred],
      },
      sk,
      'ecdsa-p256'
    );
    const sync = new MultiDeviceSync();
    expect(sync.validateBundle(bundle, id.publicKey)).toBe(true);
    expect(bundle.sequence).toBe(42);
  });

  it('full sync: w1 → w2 → w3', async () => {
    const w1 = new KeyringWallet();
    const id1 = await w1.createIdentity('ecdsa', { name: 'w1' });
    const cred1 = await w1.issueCredential('did:key:zsub', { x: 1 });
    const cred2 = await w1.issueCredential('did:key:zsub', { x: 2 });

    const sync = new MultiDeviceSync();
    const bundle1 = sync.createSyncBundle(w1);

    const w2 = new KeyringWallet();
    await w2.createIdentity('ecdsa', { name: 'w2' });
    await sync.applySyncBundle(w2, bundle1, id1.publicKey);
    expect(w2.listCredentials().length).toBe(2);

    const bundle2 = sync.createSyncBundle(w2);
    const w3 = new KeyringWallet();
    await w3.createIdentity('ecdsa', { name: 'w3' });
    // w3 needs to verify w2's bundle using w2's public identity, not w1's.
    const w2id = w2.getPrimaryIdentity()!;
    const result = await sync.applySyncBundle(w3, bundle2, w2id.publicKey);
    expect(result.applied.length).toBe(2);
    expect(w3.listCredentials().length).toBe(2);
    // The credential ids should match.
    const ids = w3.listCredentials().map((c) => c.id).sort();
    expect(ids).toEqual([cred1.id, cred2.id].sort());
  });
});
