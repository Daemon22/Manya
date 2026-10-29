# @manya-os/ledger

> Immutable audit ledger with cryptographic chaining, Merkle proofs, and distributed sync for the MANYA Intelligence OS.

`@manya-os/ledger` is the tamper-evident audit substrate of the **MANYA Intelligence OS** -- a sovereign, modular, local-first intelligence operating system conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the **Manya Hael Foundation**.

The package provides cryptographic event chaining, deterministic canonical hashing, RSA-PSS / ECDSA P-256 digital signatures, Merkle trees with RFC 6962-style inclusion proofs, timestamp authority with commitment/reveal, event replay with filtering, in-memory and file-based persistence, JSONL/JSON/CSV export/import, and codec utilities for canonical JSON serialization.

---

## Vision

The Manya Hael Foundation stewards the MANYA Intelligence OS as a long-horizon, mission-driven project to return sovereignty to individuals and communities over their own intelligence infrastructure. `@manya-os/ledger` is the immutable foundation of that vision: **an audit trail that cannot be tampered with, only appended to.**

- **Tamper-evident.** Every event is cryptographically chained to its predecessor. Merkle roots provide compact proofs of inclusion.
- **Local-first.** No network calls. No cloud dependency. Works fully offline.
- **Cryptographically correct.** Built on Node `crypto` (OpenSSL-backed) primitives -- never custom crypto. Constant-time comparisons for signature verification.
- **Composable.** Clean, typed interfaces for stores, timestamp authorities, and logging -- swap any layer without rewriting the others.
- **Production-ready.** Strict TypeScript. Typed errors. Comprehensive unit tests.

---

## Features

| Area | What you get |
| --- | --- |
| **Event chaining** | `LedgerChain` with cryptographic hash chaining, sequence numbers, and head/tail access. |
| **Event creation** | `createEvent` with deterministic canonical serialization, `computeEventHash`, `signEvent`, `verifyEventSignature`. |
| **Cryptographic hashing** | `sha256`, `sha512`, `hmac`, `secureRandom`, `constantTimeEqual`, `randomToken`, `uuid`, `sha256Hex`. |
| **Key generation** | `generateKeyPair` (ECDSA P-256 default, RSA-PSS 3072 optional), `importKeyPem`, `exportKeyPem`, `getKeyId`. |
| **Signatures** | `sign` / `verify` for ECDSA P-256 and RSA-PSS. |
| **Merkle trees** | `MerkleTree.build` with RFC 6962 domain separation, deterministic roots, `getProof`, `verifyProof`. |
| **Timestamp authority** | `LocalTimestampAuthority` with commitment/reveal, `issueTimestamp`, `verifyTimestamp`. |
| **Replay** | `EventReplayer` with range filters (seq, time), equality filters (type, actor), and projection folding. |
| **Stores** | `InMemoryLedgerStore`, `FileLedgerStore` with atomic tmp+rename writes and compaction. |
| **Export/import** | `exportAuditLog` in JSON, JSONL, or CSV; `importJsonl` for round-trip. |
| **Codec** | `canonicalSerialize`, `canonicalSerializeToString` for deterministic JSON. |
| **Logging** | `Logger` interface, `ConsoleLogger` that scrubs sensitive fields. |

---

## Quick start

### 1. Append events to a chain

```ts
import { LedgerChain } from '@manya-os/ledger';

const chain = new LedgerChain();

const ev1 = chain.append('user.created', 'system', { userId: 'alice-123', role: 'admin' });
const ev2 = chain.append('config.updated', 'alice-123', { setting: 'theme', value: 'dark' });

console.log(chain.length()); // 2
console.log(chain.head());   // ev1 (first event / genesis)
console.log(chain.tail());   // ev2 (last event)
```

### 2. Sign and verify events

```ts
import { generateKeyPair, signEvent, verifyEventSignature } from '@manya-os/ledger';

const { publicKey, privateKey } = generateKeyPair('ecdsa');

const event = chain.tail();
const signed = signEvent(event, privateKey);
const ok = verifyEventSignature(signed, publicKey);
console.log(ok); // true
```

### 3. Merkle proofs

```ts
import { MerkleTree } from '@manya-os/ledger';

const leaves = chain.all().map((ev) => Buffer.from(ev.hash, 'hex'));
const tree = MerkleTree.build(leaves);

// Inclusion proof for leaf at index 0
const proof = tree.getProof(0);
const valid = tree.verifyProof(leaves[0], proof);
console.log(valid); // true
```

### 4. Timestamp authority

```ts
import { LocalTimestampAuthority, commit, reveal, issueTimestamp, verifyTimestamp } from '@manya-os/ledger';

const authority = new LocalTimestampAuthority();

// Commit to a value
const { commitment, nonce } = commit(Buffer.from('secret-data'));

// Issue a signed timestamp
const token = issueTimestamp(commitment, authority);

// Verify the timestamp
const ok = verifyTimestamp(token, authority.getPublicKey());
console.log(ok); // true
```

### 5. Replay with filtering

```ts
import { EventReplayer } from '@manya-os/ledger';

const replayer = new EventReplayer(chain.all());

// Filter by sequence range
for (const ev of replayer.replay({ fromSeq: 1, toSeq: 2 })) {
  console.log(ev.type);
}

// Project into a summary
const summary = replayer.project(
  (state, ev) => ({ ...state, [ev.id]: ev.type }),
  {},
  { type: 'user.created' }
);
```

### 6. File persistence

```ts
import { FileLedgerStore } from '@manya-os/ledger';

const store = new FileLedgerStore('./.manya/ledger');

// Append events (synchronous)
store.append(ev1);
store.append(ev2);

console.log(store.length()); // 2
```

---

## Configuration

### LedgerChain

```ts
const chain = new LedgerChain();

// Append with options
chain.append('user.created', 'system', { userId: 'alice' }, {
  id: 'custom-id',                    // Explicit event id (default: UUID v4)
  timestamp: '2024-01-01T00:00:00Z',  // ISO-8601 (default: now)
  metadata: { traceId: 'abc' },       // Auxiliary metadata (not hashed)
  privateKey: myKey,                  // Sign at append time
});
```

### FileLedgerStore

```ts
const store = new FileLedgerStore('./data', 'audit', {
  compactThresholdBytes: 1024 * 1024, // Compact at 1 MiB (default)
  load: true,                         // Load existing file on construction (default: true)
});
```

### LocalTimestampAuthority

```ts
import { LocalTimestampAuthority, generateKeyPair } from '@manya-os/ledger';

// Fresh keypair (default)
const authority = new LocalTimestampAuthority();

// Pre-existing keypair
const kp = generateKeyPair('ecdsa');
const authority2 = new LocalTimestampAuthority({ keypair: kp });
```

---

## Security notes

- **Deterministic hashing.** All events are canonicalized (sorted keys, stable JSON) before hashing.
- **Constant-time comparisons.** Signature verification uses `crypto.timingSafeEqual`.
- **No secrets in logs.** `ConsoleLogger` scrubs fields named `privateKey`, `password`, `token`, `secret`, `credential`, `iv`, `tag`, `share`, `nonce`, `signature`, `commitment`.
- **Atomic file writes.** `FileLedgerStore` writes to a `.tmp` file then renames for crash-safety.
- **Merkle proof validation.** `verifyProof` validates the full RFC 6962 inclusion path.
- **Chain verification.** `verifyChain` checks hash continuity, sequence contiguity, timestamp monotonicity, and optional signature verification.

For threat models, reporting a vulnerability, and the disclosure timeline, see [SECURITY.md](./SECURITY.md) and the root [SECURITY.md](../../SECURITY.md).

---

## Testing

```bash
# Run only ledger tests
npx jest --testPathPattern='packages/ledger'

# Run the full monorepo test suite
npm test
```

---

## Documentation

- [docs/API.md](./docs/API.md) -- full TypeScript API reference for every public export.
- [CHANGELOG.md](./CHANGELOG.md) -- release history in Keep-a-Changelog format.
- [CONTRIBUTING.md](./CONTRIBUTING.md) -- package-specific contributor notes.
- [SECURITY.md](./SECURITY.md) -- package-specific security surface notes.
- [LICENSE](./LICENSE) -- Apache-2.0, copyright Manya Hael Foundation.

---

## License

Apache-2.0. Copyright 2024 Manya Hael Foundation. All rights reserved.

Conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the Manya Hael Foundation.
