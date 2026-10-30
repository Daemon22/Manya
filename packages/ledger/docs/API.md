# API Reference -- @manya-os/ledger

This document is the authoritative TypeScript API reference for all public exports of `@manya-os/ledger` (resolved internally as `@manya-os/ledger`).

---

## Table of Contents

- [Types](#types)
- [Errors](#errors)
- [Logging](#logging)
- [Cryptographic hashing](#cryptographic-hashing)
- [Key generation and import/export](#key-generation-and-importexport)
- [Digital signatures](#digital-signatures)
- [Event creation and signing](#event-creation-and-signing)
- [Ledger chain](#ledger-chain)
- [Chain verification](#chain-verification)
- [Merkle trees](#merkle-trees)
- [Merkle proofs](#merkle-proofs)
- [Timestamp authority](#timestamp-authority)
- [Timestamp operations](#timestamp-operations)
- [Event replay](#event-replay)
- [Ledger stores](#ledger-stores)
- [Export/import](#exportimport)
- [Codec utilities](#codec-utilities)

---

## Types

### `EventPayload`

Free-form payload attached to a ledger event. Must be JSON-serializable.

```ts
type EventPayload = Record<string, unknown>;
```

### `EventMetadata`

Free-form metadata attached to a ledger event. Does NOT contribute to the event's hash.

```ts
type EventMetadata = Record<string, unknown>;
```

### `LedgerEvent`

A single immutable entry in the audit ledger.

```ts
interface LedgerEvent {
  id: string;                          // Stable unique event identifier (UUID v4 by default)
  seq: number;                        // 1-based sequence number within the chain
  type: string;                       // Event type (e.g. 'user.created', 'config.updated')
  actor: string;                      // Free-form identity of the actor that produced the event
  payload: EventPayload;              // Event payload (JSON-serializable)
  timestamp: string;                 // ISO-8601 timestamp (millisecond precision)
  prevHash: string;                  // Hex SHA-256 of the previous event's hash (64 zeros for genesis)
  hash: string;                       // Hex SHA-256 of the canonical serialization of signing fields
  signature?: string;                 // Optional hex-encoded signature over the event hash
  signatureAlgorithm?: SignatureAlgorithm; // Optional signature algorithm
  metadata?: EventMetadata;           // Optional auxiliary metadata (does NOT contribute to hash)
}
```

### `SignatureAlgorithm`

Signature algorithm supported by the crypto module.

```ts
type SignatureAlgorithm = 'ecdsa-p256' | 'rsa-pss';
```

### `KeyAlgorithm`

Key algorithm for `generateKeyPair`. `'ecdsa'` (NIST P-256) is the default.

```ts
type KeyAlgorithm = 'ecdsa' | 'rsa';
```

### `CreateEventOptions`

Options accepted by `createEvent`.

```ts
interface CreateEventOptions {
  id?: string;                    // Explicit event id (default: fresh UUID v4)
  type: string;                   // Event type (required)
  actor: string;                  // Actor (required)
  payload: EventPayload;          // Event payload (required, JSON-serializable)
  timestamp?: string;             // ISO-8601 timestamp (default: new Date().toISOString())
  prevHash?: string;              // Hex hash of previous event (default: GENESIS_PREV_HASH)
  seq?: number;                   // Sequence number (default: 1)
  metadata?: EventMetadata;       // Optional metadata (does NOT contribute to hash)
}
```

### `ChainVerification`

Verification result returned by `verifyChain`.

```ts
interface ChainVerification {
  valid: boolean;                 // Whether the chain is fully valid
  firstBrokenIndex?: number;      // Index of the first broken event, if any
  reason?: string;                // Human-readable reason for the failure
}
```

### `VerifyChainOptions`

Options for `verifyChain`.

```ts
interface VerifyChainOptions {
  publicKeys?: Record<string, crypto.KeyObject | string>; // actor -> publicKey map
  requireSignatures?: boolean;    // Every event MUST be signed (default: false)
  checkTimestamps?: boolean;      // Timestamps MUST be monotonic (default: true)
  checkSeqContiguity?: boolean;   // Sequence numbers MUST be contiguous (default: true)
}
```

### `MerkleProofStep`

A single step in a Merkle inclusion proof.

```ts
interface MerkleProofStep {
  hash: Buffer;                   // Sibling hash (32-byte SHA-256)
  side: 'left' | 'right';        // Position of the sibling relative to the current node
}
```

### `MerkleProof`

Merkle inclusion proof for a leaf.

```ts
interface MerkleProof {
  index: number;                  // The 0-based leaf index the proof is for
  siblings: MerkleProofStep[];    // Sibling hashes from leaf level up to (but not including) root
}
```

### `Commitment`

Commitment produced by `commit`.

```ts
interface Commitment {
  commitment: Buffer;             // SHA-256(value || nonce)
  nonce: Buffer;                  // Random 32-byte nonce
}
```

### `TimestampToken`

A signed timestamp token issued by a `TimestampAuthority`.

```ts
interface TimestampToken {
  version: number;                // Token format version (currently 1)
  commitment: string;             // Hex-encoded commitment being timestamped
  issuedAt: string;               // ISO-8601 issuance timestamp
  signature: string;              // Hex-encoded signature over the canonical token bytes
  algorithm: SignatureAlgorithm;  // Signature algorithm used by the authority
  authorityKeyId: string;         // Hex SHA-256 fingerprint of the authority's public key
}
```

### `ReplayFilter`

Filter options for `EventReplayer.replay` / `EventReplayer.project`.

```ts
interface ReplayFilter {
  fromSeq?: number;              // 1-based starting sequence (inclusive)
  toSeq?: number;                // 1-based ending sequence (inclusive)
  fromTime?: string | number;    // ISO-8610 starting timestamp or epoch-millis (inclusive)
  toTime?: string | number;      // ISO-8610 ending timestamp or epoch-millis (inclusive)
  type?: string;                 // Event type filter (exact match)
  actor?: string;                // Actor filter (exact match)
}
```

### `LedgerStore`

Interface for ledger persistence backends. All methods are synchronous.

```ts
interface LedgerStore {
  append(event: LedgerEvent): void;
  get(seq: number): LedgerEvent | undefined;
  getById(id: string): LedgerEvent | undefined;
  length(): number;
  all(): LedgerEvent[];
  snapshot(): LedgerEvent[];
  restore(events: LedgerEvent[]): void;
}
```

### `FileLedgerStoreOptions`

Options for `FileLedgerStore`.

```ts
interface FileLedgerStoreOptions {
  compactThresholdBytes?: number; // Compact when file exceeds this size in bytes (default: 1 MiB)
  load?: boolean;                 // Load existing file on construction (default: true)
}
```

### `GenerateKeyPairOptions`

Options for `generateKeyPair`.

```ts
interface GenerateKeyPairOptions {
  rsaModulusBits?: number;        // RSA modulus length in bits (default: 3072)
  rsaPublicExponent?: number;     // RSA public exponent (default: 65537)
  ecCurve?: 'prime256v1';         // EC curve (only 'prime256v1' / NIST P-256 supported)
}
```

### `GeneratedKeyPair`

Result of `generateKeyPair`.

```ts
interface GeneratedKeyPair {
  publicKey: crypto.KeyObject;
  privateKey: crypto.KeyObject;
  algorithm: SignatureAlgorithm;  // Resolved signature algorithm
}
```

### `AppendOptions`

Options for `LedgerChain.append`.

```ts
interface AppendOptions {
  id?: string;                    // Explicit event id (default: UUID v4)
  timestamp?: string;             // ISO-8601 timestamp (default: now)
  metadata?: EventMetadata;       // Optional metadata (does NOT contribute to hash)
  privateKey?: crypto.KeyObject | string; // Sign at append time
  signatureAlgorithm?: SignatureAlgorithm; // Inferred from key if omitted
}
```

### `ExportFormat`

Supported export formats.

```ts
type ExportFormat = 'json' | 'jsonl' | 'csv';
```

### `ExportOptions`

Options for `exportAuditLog`.

```ts
interface ExportOptions {
  filter?: (event: LedgerEvent) => boolean; // Filter predicate
  includeSignatureFields?: boolean;          // Include signature/metadata fields (default: true)
  maxCsvPayloadColumns?: number;            // Max payload keys as CSV columns (default: 64)
}
```

### `LocalTimestampAuthorityOptions`

Options for `LocalTimestampAuthority`.

```ts
interface LocalTimestampAuthorityOptions {
  keypair?: {
    publicKey: crypto.KeyObject;
    privateKey: crypto.KeyObject;
    algorithm: SignatureAlgorithm;
  }; // Pre-existing keypair (default: generate fresh ECDSA P-256)
}
```

---

## Errors

### `LedgerError`

Base class for all ledger errors. Has a stable `code` field for programmatic error handling.

```ts
class LedgerError extends Error {
  code: string;     // Stable machine-readable code (class name by default)
  cause?: unknown;  // Optional underlying cause (ES2022)
}
```

### Error subclasses

- `EventError` -- Event creation, signing, or verification failure.
- `ChainError` -- Chain append, linkage, or traversal failure.
- `MerkleError` -- Merkle tree build, proof, or verify failure.
- `TimestampError` -- Timestamp commit, reveal, issue, or verify failure.
- `StoreError` -- Store append, get, restore, or compaction failure.
- `ReplayError` -- Replay filter or projection failure.
- `ExportError` -- Export or import failure.
- `SyncError` -- Sync bundle or merge failure.
- `TamperError` -- Tamper detection failure.

```ts
import { LedgerError, ChainError } from '@manya-os/ledger';

try {
  chain.append('test', 'actor', {});
} catch (err) {
  if (err instanceof ChainError) {
    console.error('Chain error:', err.code, err.message);
  }
}
```

---

## Logging

### `Logger`

Structured logger interface. Implementations must not throw.

```ts
interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}
```

### `LogLevel`

Log level. A string type (not an enum).

```ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
```

### `ConsoleLogger`

JSON logger to stdout/stderr that scrubs sensitive fields.

```ts
import { ConsoleLogger } from '@manya-os/ledger';

const logger = new ConsoleLogger('info');
logger.info('Ledger initialized', { ledgerId: 'demo-1' });
```

### `SilentLogger`

No-op logger for tests or silent mode.

```ts
import { SilentLogger } from '@manya-os/ledger';

const logger = new SilentLogger();
```

### `scrubMetadata`

Recursively scrubs sensitive fields from an object. Returns a new object with secret fields replaced by `[redacted]`.

```ts
import { scrubMetadata } from '@manya-os/ledger';

const clean = scrubMetadata({ privateKey: 'secret', other: 'data' });
// { privateKey: '[redacted]', other: 'data' }
```

### `shouldScrubField`

Returns whether a field name should be scrubbed.

```ts
import { shouldScrubField } from '@manya-os/ledger';

shouldScrubField('privateKey'); // true
shouldScrubField('other');      // false
```

### `SCRUBBED_FIELD_NAMES`

Array of field name suffixes that are scrubbed by default.

```ts
import { SCRUBBED_FIELD_NAMES } from '@manya-os/ledger';

// ['privateKey', 'privateKeyPem', 'publicKeyPem', 'password', 'passphrase',
//  'token', 'secret', 'credential', 'iv', 'tag', 'share', 'nonce',
//  'signature', 'commitment', 'macs', 'machineId']
```

---

## Cryptographic hashing

### `sha256`

Compute SHA-256 hash of a buffer.

```ts
function sha256(data: Buffer): Buffer;
```

Returns a 32-byte Buffer.

### `sha512`

Compute SHA-512 hash of a buffer.

```ts
function sha512(data: Buffer): Buffer;
```

Returns a 64-byte Buffer.

### `hmac`

Compute HMAC-SHA256.

```ts
function hmac(key: Buffer, data: Buffer): Buffer;
```

Returns a 32-byte Buffer.

### `secureRandom`

Generate cryptographically secure random bytes.

```ts
function secureRandom(n: number): Buffer;
```

Throws if `n <= 0` or `n > 1 MiB`.

### `constantTimeEqual`

Constant-time buffer comparison using `crypto.timingSafeEqual`.

```ts
function constantTimeEqual(a: Buffer, b: Buffer): boolean;
```

Returns `false` if lengths differ.

### `randomToken`

Generate a random hex token.

```ts
function randomToken(bytes?: number): string;
```

Returns a hex string. Default length is 32 bytes (64 hex chars).

### `uuid`

Generate a UUID v4.

```ts
function uuid(): string;
```

### `sha256Hex`

Compute SHA-256 and return as a 64-character hex string.

```ts
function sha256Hex(data: string | Buffer): string;
```

---

## Key generation and import/export

### `generateKeyPair`

Generate a key pair. **Synchronous.**

```ts
function generateKeyPair(
  algo?: KeyAlgorithm,         // 'ecdsa' (default) or 'rsa'
  opts?: GenerateKeyPairOptions
): GeneratedKeyPair;
```

Returns `{ publicKey, privateKey, algorithm }`. The `algorithm` field is the resolved `SignatureAlgorithm` (`'ecdsa-p256'` or `'rsa-pss'`).

```ts
const { publicKey, privateKey, algorithm } = generateKeyPair('ecdsa');
// algorithm === 'ecdsa-p256'
```

### `importKeyPem`

Import a key from PEM string.

```ts
function importKeyPem(pem: string, type: 'public' | 'private'): crypto.KeyObject;
```

### `exportKeyPem`

Export a key to PEM string.

```ts
function exportKeyPem(key: crypto.KeyObject, type: 'public' | 'private'): string;
```

### `getKeyId`

Compute the SHA-256 fingerprint of a public key's SPKI DER encoding.

```ts
function getKeyId(publicKey: crypto.KeyObject | string): string;
```

Returns a 64-character hex string.

### `algorithmFor`

Map a `KeyAlgorithm` string to a `SignatureAlgorithm` string.

```ts
function algorithmFor(algo: KeyAlgorithm): SignatureAlgorithm;
```

- `'ecdsa'` -> `'ecdsa-p256'`
- `'rsa'` -> `'rsa-pss'`

### `algorithmForKey`

Map a `crypto.KeyObject` to a `SignatureAlgorithm` by inspecting its `asymmetricKeyType`.

```ts
function algorithmForKey(key: crypto.KeyObject): SignatureAlgorithm;
```

Throws if the key type is not RSA or EC (P-256).

### Constants

```ts
const DEFAULT_RSA_MODULUS = 3072;
const DEFAULT_RSA_EXPONENT = 65537;
const DEFAULT_EC_CURVE = 'prime256v1';
```

---

## Digital signatures

### `sign`

Sign a Buffer with a private key. Returns a hex-encoded signature.

```ts
function sign(
  privateKey: crypto.KeyObject | string,
  data: Buffer,
  algo?: SignatureAlgorithm    // Inferred from key if omitted
): string;
```

### `verify`

Verify a signature against a public key. Returns `true` iff valid.

```ts
function verify(
  publicKey: crypto.KeyObject | string,
  data: Buffer,
  signature: Buffer | string,
  algo?: SignatureAlgorithm    // Inferred from key if omitted
): boolean;
```

Uses `crypto.timingSafeEqual` as a constant-time guard on the result.

---

## Event creation and signing

### `createEvent`

Create a new (unsigned) ledger event.

```ts
function createEvent(opts: CreateEventOptions): LedgerEvent;
```

Validates inputs, computes the event hash via canonical serialization, and returns the event without a signature. Call `signEvent` to attach one.

### `canonicalSerialize`

Canonicalize an object to a Buffer (sorted keys, deterministic JSON).

```ts
function canonicalSerialize(obj: Record<string, unknown>): Buffer;
```

### `canonicalSerializeToString`

Canonicalize and return as a UTF-8 string.

```ts
function canonicalSerializeToString(obj: Record<string, unknown>): string;
```

### `computeEventHash`

Compute the SHA-256 hash of an event's signing fields as a 64-character hex string.

```ts
function computeEventHash(fields: {
  id: string; seq: number; type: string; actor: string;
  payload: EventPayload; timestamp: string; prevHash: string;
}): string;
```

Signing fields are exactly `{ id, seq, type, actor, payload, timestamp, prevHash }`. Metadata and signature are never included.

### `signEvent`

Sign an event. Returns a new event with `signature` and `signatureAlgorithm` populated.

```ts
function signEvent(
  event: LedgerEvent,
  privateKey: crypto.KeyObject | string,
  algo?: SignatureAlgorithm
): LedgerEvent;
```

The signature is computed over `Buffer.from(event.hash, 'hex')` (32 raw bytes).

### `verifyEventSignature`

Verify an event's signature.

```ts
function verifyEventSignature(
  event: LedgerEvent,
  publicKey: crypto.KeyObject | string,
  allowUnsigned?: boolean     // Default: false
): boolean;
```

Returns `true` if the signature is valid. If the event is unsigned, returns `allowUnsigned`.

### `eventKeyId`

Compute the key id (64-char hex) of a public key.

```ts
function eventKeyId(publicKey: crypto.KeyObject | string): string;
```

### `GENESIS_PREV_HASH`

Constant: 64 zero hex characters, used as the `prevHash` of the first event in a chain.

```ts
const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
```

---

## Ledger chain

### `LedgerChain`

In-memory append-only hash-chained event ledger.

```ts
const chain = new LedgerChain();
```

### `append`

Append a new event to the chain. Hash-chains to the previous event automatically.

```ts
chain.append(type, actor, payload, opts?): LedgerEvent;
```

- `type` -- event type (non-empty string, required).
- `actor` -- actor identifier (non-empty string, required).
- `payload` -- JSON-serializable object (required).
- `opts` -- optional `AppendOptions` (`id`, `timestamp`, `metadata`, `privateKey`, `signatureAlgorithm`).

Returns the newly appended event.

### `appendEvent`

Append a pre-built event. The event's `seq` MUST equal `length() + 1` and its `prevHash` MUST chain to the current tail.

```ts
chain.appendEvent(event: LedgerEvent): LedgerEvent;
```

### `get`

Get an event by 1-based sequence number.

```ts
chain.get(seq: number): LedgerEvent | undefined;
```

### `getById`

Get an event by its `id`.

```ts
chain.getById(id: string): LedgerEvent | undefined;
```

### `all`

Get all events (a shallow copy of the internal array).

```ts
chain.all(): LedgerEvent[];
```

### `head`

Get the **first** event in the chain (the genesis event), or `undefined` if empty.

```ts
chain.head(): LedgerEvent | undefined;
```

### `tail`

Get the **last** event in the chain, or `undefined` if empty.

```ts
chain.tail(): LedgerEvent | undefined;
```

### `length`

Get the number of events.

```ts
chain.length(): number;
```

### `replaceAll`

Replace the chain's contents with a new array of events.

```ts
chain.replaceAll(events: LedgerEvent[]): void;
```

---

## Chain verification

### `verifyChain`

Verify the cryptographic integrity of a chain of events.

```ts
function verifyChain(
  events: LedgerEvent[],
  opts?: VerifyChainOptions
): ChainVerification;
```

Checks (in order):
1. Sequence contiguity (1, 2, 3, ...).
2. `prevHash` linkage to the previous event's `hash`.
3. Hash recomputation over signing fields.
4. Timestamp monotonicity (non-decreasing).
5. Signature verification (if `publicKeys` map is provided).

---

## Merkle trees

### `MerkleTree.build`

Build a Merkle tree from raw leaf bytes. Uses RFC 6962 domain separation:

- Leaf hash: `SHA-256(0x00 || leaf)`
- Inner hash: `SHA-256(0x01 || left || right)`

When a level has an odd number of nodes, the last node is duplicated.

```ts
static MerkleTree.build(leaves: Buffer[]): MerkleTree;
```

Throws `MerkleError` if `leaves` is empty or contains non-Buffer values.

### `tree.root`

The Merkle root (32-byte SHA-256 digest).

```ts
tree.root(): Buffer;
```

### `tree.getProof`

Produce an inclusion proof for the leaf at the given 0-based index.

```ts
tree.getProof(index: number): MerkleProof;
```

### `tree.verifyProof`

Convenience wrapper around `verifyProof` that uses the tree's root.

```ts
tree.verifyProof(leaf: Buffer, proof: MerkleProof): boolean;
```

**Important:** The `leaf` parameter must be the **leaf-prefixed hash** (`sha256(0x00 || rawLeaf)`), which is what `MerkleTree.build` stores internally. To verify against the original raw leaf bytes:

```ts
import { MerkleTree, sha256 } from '@manya-os/ledger';

const LEAF_PREFIX = Buffer.from([0x00]);
const rawLeaf = Buffer.from('my-data');
const leafHash = sha256(Buffer.concat([LEAF_PREFIX, rawLeaf]));

const tree = MerkleTree.build([rawLeaf]);
const proof = tree.getProof(0);
tree.verifyProof(leafHash, proof); // true
```

### `tree.leafCount`

The number of leaves in the tree.

```ts
tree.leafCount: number;  // Read-only property
```

---

## Merkle proofs

### `verifyProof`

Verify a Merkle inclusion proof against a given root.

```ts
function verifyProof(
  leaf: Buffer,        // The leaf hash (must be leaf-prefixed: SHA-256(0x00 || rawLeaf))
  proof: MerkleProof,
  root: Buffer
): boolean;
```

Walks the proof path using `INNER_PREFIX` (0x01) for domain-separated concatenation, then constant-time-compares the result to `root`.

---

## Timestamp authority

### `LocalTimestampAuthority`

A `TimestampAuthority` backed by a local keypair. Suitable for development and testing.

```ts
const authority = new LocalTimestampAuthority();
const authority2 = new LocalTimestampAuthority({ keypair: myKeypair });
```

#### `authority.issue`

Issue a signed timestamp token over a commitment.

```ts
authority.issue(commitment: Buffer | string): TimestampToken;
```

#### `authority.getPublicKey`

Get the authority's public key.

```ts
authority.getPublicKey(): crypto.KeyObject;
```

#### `authority.getKeyId`

Get the authority's key id (64-char hex SHA-256 of SPKI DER).

```ts
authority.getKeyId(): string;
```

#### `authority.getAlgorithm`

Get the authority's signature algorithm.

```ts
authority.getAlgorithm(): SignatureAlgorithm;
```

### `canonicalTimestampBytes`

Compute the canonical bytes of a `TimestampToken` for signing/verification.

```ts
function canonicalTimestampBytes(token: {
  version: number;
  commitment: string;
  issuedAt: string;
  authorityKeyId: string;
}): Buffer;
```

### `TIMESTAMP_TOKEN_VERSION`

Token format version constant (currently `1`).

### Constants

```ts
const COMMITMENT_NONCE_BYTES = 32;  // Nonce size in bytes
const COMMITMENT_BYTES = 32;        // Commitment size in bytes
```

---

## Timestamp operations

### `commit`

Produce a commitment to a value using a fresh random nonce.

```ts
function commit(value: Buffer): Commitment;
```

`value` must be a non-empty Buffer. Returns `{ commitment: Buffer, nonce: Buffer }` where `commitment = SHA-256(value || nonce)`.

### `reveal`

Reveal a value against a previously published commitment.

```ts
function reveal(
  value: Buffer,
  nonce: Buffer,
  commitment: Buffer
): boolean;
```

Recomputes `SHA-256(value || nonce)` and constant-time-compares to the commitment. Returns `true` if they match.

### `issueTimestamp`

Issue a signed timestamp token for a commitment using a `TimestampAuthority`.

```ts
function issueTimestamp(
  commitment: Buffer | string,
  authority: { issue(c: Buffer | string): TimestampToken }
): TimestampToken;
```

### `verifyTimestamp`

Verify a `TimestampToken`'s signature against an authority's public key.

```ts
function verifyTimestamp(
  token: TimestampToken,
  authorityPublicKey: crypto.KeyObject | string
): boolean;
```

Returns `false` for any malformed input or signature mismatch (does not throw).

---

## Event replay

### `EventReplayer`

Replay events from a chain (or any array/iterable of events) through a filter.

```ts
const replayer = new EventReplayer(chain.all());
```

The constructor accepts `LedgerEvent[]` or `Iterable<LedgerEvent>`.

### `replay`

Iterate over events matching a filter. Returns an `IterableIterator<LedgerEvent>`.

```ts
*replay(filter?: ReplayFilter): IterableIterator<LedgerEvent>;
```

```ts
for (const ev of replayer.replay({ fromSeq: 1, toSeq: 10, type: 'user.created' })) {
  console.log(ev);
}
```

### `project`

Fold matching events through a reducer to build a projection.

```ts
project<S>(
  reducer: (state: S, event: LedgerEvent) => S,
  initialState: S,
  filter?: ReplayFilter
): S;
```

```ts
const summary = replayer.project(
  (state, ev) => ({ ...state, [ev.id]: ev.type }),
  {} as Record<string, string>,
  { type: 'user.created' }
);
```

---

## Ledger stores

### `InMemoryLedgerStore`

In-memory array-backed store. All data is deep-cloned on read/write.

```ts
const store = new InMemoryLedgerStore();
```

### `FileLedgerStore`

File-backed store with JSONL persistence and atomic writes.

```ts
const store = new FileLedgerStore(dir, name?, opts?);
```

- `dir` -- directory for data + index files (required, created if missing).
- `name` -- base file name without extension (default: `'ledger'`). Data file is `<dir>/<name>.jsonl`.
- `opts` -- `FileLedgerStoreOptions`.

#### Additional methods

- `store.getDataPath(): string` -- path to the JSONL data file.
- `store.getIndexPath(): string` -- path to the sidecar index file.
- `store.compact(): void` -- rewrite the data file from in-memory state.

### `cloneEvent`

Deep-clone a ledger event via JSON round-trip.

```ts
function cloneEvent(event: LedgerEvent): LedgerEvent;
```

### `DEFAULT_COMPACT_THRESHOLD_BYTES`

Default compaction threshold for `FileLedgerStore`: `1048576` (1 MiB).

```ts
const DEFAULT_COMPACT_THRESHOLD_BYTES = 1024 * 1024;
```

---

## Export/import

### `exportAuditLog`

Export an array of ledger events.

```ts
function exportAuditLog(
  events: LedgerEvent[],
  format: ExportFormat,
  opts?: ExportOptions
): string;
```

- `format` -- `'json'`, `'jsonl'`, or `'csv'` (required).
- `opts.filter` -- optional predicate to filter events before export.
- `opts.includeSignatureFields` -- include `signature`, `signatureAlgorithm`, and `metadata` fields (default: `true`).
- `opts.maxCsvPayloadColumns` -- max payload keys to expand as CSV columns (default: 64).

### `importJsonl`

Import events from a JSONL string (as produced by `exportAuditLog` with format `'jsonl'`).

```ts
function importJsonl(jsonl: string): LedgerEvent[];
```

Blank lines are skipped. Throws `ExportError` on any malformed line.

---

## Codec utilities

### `canonicalSerialize`

Canonicalize an object (sorted keys, deterministic JSON).

```ts
function canonicalSerialize(obj: Record<string, unknown>): Buffer;
```

### `canonicalSerializeToString`

Canonicalize and return as a UTF-8 string.

```ts
function canonicalSerializeToString(obj: Record<string, unknown>): string;
```

Rejects `NaN`, `Infinity`, `bigint`, and circular references.
