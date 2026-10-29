import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  LedgerChain,
  InMemoryLedgerStore,
  FileLedgerStore,
  createEvent,
  computeEventHash,
  signEvent,
  verifyEventSignature,
  verifyChain,
  generateKeyPair,
  exportKeyPem,
  MerkleTree,
  verifyProof,
  LocalTimestampAuthority,
  commit,
  reveal,
  issueTimestamp,
  verifyTimestamp,
  EventReplayer,
  exportAuditLog,
  importJsonl,
  GENESIS_PREV_HASH,
  sha256,
} from '@manya-os/ledger';

const LEAF_PREFIX = Buffer.from([0x00]);

describe('end-to-end ledger scenario', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-e2e-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('complete lifecycle: create, sign, store, verify, export, timestamp', () => {
    // 1. Generate signing keys
    const { publicKey, privateKey } = generateKeyPair('ecdsa');
    const authority = new LocalTimestampAuthority();

    // 2. Create a chain of events
    const chain = new LedgerChain();
    const e1 = chain.append('user.created', 'system', { userId: 'alice' }, { privateKey });
    const e2 = chain.append('user.login', 'alice', { ip: '192.168.1.1' }, { privateKey });
    const e3 = chain.append('doc.created', 'alice', { title: 'Report' }, { privateKey });

    expect(chain.length()).toBe(3);

    // 3. Verify chain integrity
    const verification = verifyChain(chain.all(), {
      publicKeys: { system: publicKey, alice: publicKey },
      requireSignatures: true,
    });
    expect(verification.valid).toBe(true);

    // 4. Persist to file store
    const store = new FileLedgerStore(tmpDir);
    for (const ev of chain.all()) {
      store.append(ev);
    }
    expect(store.length()).toBe(3);

    // 5. Reload from disk
    const reloaded = new FileLedgerStore(tmpDir);
    expect(reloaded.length()).toBe(3);
    expect(reloaded.get(1)!.id).toBe(e1.id);

    // 6. Build a Merkle tree from event hashes
    const leaves = chain.all().map((ev) => Buffer.from(ev.hash, 'hex'));
    const tree = MerkleTree.build(leaves);
    expect(tree.leafCount).toBe(3);

    // 7. Verify inclusion proof for each event
    for (let i = 0; i < 3; i++) {
      const proof = tree.getProof(i);
      const prefixedLeaf = sha256(Buffer.concat([LEAF_PREFIX, leaves[i]]));
      expect(tree.verifyProof(prefixedLeaf, proof)).toBe(true);
    }

    // 8. Create a timestamp commitment over the Merkle root
    const rootCommitment = commit(tree.root());
    const token = issueTimestamp(rootCommitment.commitment, authority);
    expect(verifyTimestamp(token, authority.getPublicKey())).toBe(true);

    // 9. Reveal the commitment
    expect(reveal(tree.root(), rootCommitment.nonce, rootCommitment.commitment)).toBe(true);

    // 10. Replay with filtering
    const replayer = new EventReplayer(chain.all());
    const userEvents = [...replayer.replay({ type: 'user.created' })];
    expect(userEvents.length).toBe(1);
    expect(userEvents[0].type).toBe('user.created');

    const allEvents = [...replayer.replay()];
    expect(allEvents.length).toBe(3);

    // 11. Project into a summary
    const summary = replayer.project(
      (acc, ev) => ({ ...acc, [ev.type]: (acc[ev.type] ?? 0) + 1 }),
      {} as Record<string, number>
    );
    expect(summary['user.created']).toBe(1);
    expect(summary['user.login']).toBe(1);
    expect(summary['doc.created']).toBe(1);

    // 12. Export to JSONL and re-import
    const jsonl = exportAuditLog(chain.all(), 'jsonl');
    const imported = importJsonl(jsonl);
    expect(imported.length).toBe(3);
    expect(imported[0].id).toBe(e1.id);

    // 13. Export to JSON
    const json = exportAuditLog(chain.all(), 'json');
    const parsed = JSON.parse(json);
    expect(parsed.length).toBe(3);

    // 14. Export to CSV
    const csv = exportAuditLog(chain.all(), 'csv');
    expect(csv).toContain('seq');
    expect(csv).toContain('type');

    // 15. Verify event signatures individually
    expect(verifyEventSignature(e1, publicKey)).toBe(true);
    expect(verifyEventSignature(e2, publicKey)).toBe(true);
    expect(verifyEventSignature(e3, publicKey)).toBe(true);

    // 16. Verify hash chain integrity
    expect(e2.prevHash).toBe(e1.hash);
    expect(e3.prevHash).toBe(e2.hash);
  });

  it('in-memory store lifecycle', () => {
    const store = new InMemoryLedgerStore();
    const chain = new LedgerChain();

    for (let i = 0; i < 5; i++) {
      const ev = chain.append('event', 'actor', { i });
      store.append(ev);
    }

    expect(store.length()).toBe(5);
    expect(store.get(1)!.seq).toBe(1);
    expect(store.get(5)!.seq).toBe(5);

    const all = store.all();
    expect(all.length).toBe(5);

    const snap = store.snapshot();
    expect(snap.length).toBe(5);
  });
});
