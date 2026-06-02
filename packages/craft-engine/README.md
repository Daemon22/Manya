# Craft Engine

**7-Fold Adaptive Compression & AES-256-GCM Encryption**

Craft compresses any file to its smallest form across 7 adaptive strategies, encrypts it with AES-256-GCM, and verifies it with SHA-256 on restore. Zero runtime dependencies — pure Node.js built-ins.

```
Raw Data ──► 7-Fold Compress ──► AES-256-GCM Encrypt ──► .craft Package
                                                          (compressed, encrypted, verified)

.craft Package ──► AES-256-GCM Decrypt ──► 7-Fold Decompress ──► Original Data
                                                                   (bit-identical)
```

---

## Install

```bash
npm install @craft/engine
```

---

## Library Usage

```ts
import { nano, macro, peekMetadata } from '@craft/engine';

// Compress + encrypt
const pkg = await nano(data, 'document.pdf', 'application/pdf', 'my-passphrase');
// pkg.buffer      — the .craft package, ready to store or transmit
// pkg.metadata    — originalName, originalSize, compressionMode, checksum, etc.
// pkg.spaceSavedPercent — e.g. 38.7

// Decrypt + decompress
const result = await macro(pkg.buffer, 'my-passphrase');
// result.buffer            — bit-identical to the original
// result.integrityVerified — SHA-256 checksum passed
// result.metadata          — original filename, MIME, etc.

// Inspect a .craft package without decrypting
const meta = peekMetadata(craftBuffer);
// meta.originalName, meta.originalSize, meta.compressionMode, meta.createdAt
```

---

## The Seven Folds

Craft tries all 7 strategy combinations and picks the smallest result. The winning strategy ID is embedded in the package so decompression is fully self-describing.

| # | Strategy | Best for |
|---|----------|----------|
| 0 | Brotli Q11 | General data, text |
| 1 | Delta + Brotli | Sequential / sensor data |
| 2 | MTF + Brotli | Repeated symbol patterns |
| 3 | RLE + Brotli | Sparse / run-heavy data |
| 4 | BPE + Brotli | Structured binary with common byte pairs |
| 5 | Delta + MTF + Brotli | Structured sequential data |
| 6 | Delta + RLE + Brotli | Sparse sequential data |

---

## Security

| Property | Value |
|----------|-------|
| Encryption | AES-256-GCM (authenticated) |
| Key derivation | PBKDF2-SHA256, 600,000 iterations |
| Salt | 16 bytes random per operation |
| IV | 12 bytes random per operation (NIST recommendation) |
| Auth tag | 128-bit GCM tag |
| Header protection | Metadata authenticated as GCM AAD |
| Integrity | SHA-256 checksum verified on restore |

PBKDF2 runs asynchronously so it does not block the event loop during key derivation.

---

## CLI

```bash
# Compress and encrypt
craft nano document.pdf -p "my-passphrase"
craft nano document.pdf -p "my-passphrase" -o output.craft

# Decrypt and restore
craft macro document.pdf.craft -p "my-passphrase"
craft macro document.pdf.craft -p "my-passphrase" -o restored.pdf

# Inspect without decrypting
craft peek document.pdf.craft

# Compare all 7 strategies
craft benchmark document.pdf

# SHA-256 checksum
craft checksum document.pdf

# Version
craft version
```

---

## Agent / Programmatic Integration

Craft is designed to be called from agents, pipelines, and language model toolchains. Key points for integration:

**Async API** — both `nano` and `macro` are async. Always `await` them.

**Key management** — passphrases are per-call. Store them in your secrets manager / vault and inject at call time. Craft never stores or logs passphrases.

**Passphrase minimum** — 8 characters enforced. Use strong random passphrases (e.g. `crypto.randomBytes(32).toString('hex')`) for non-human callers.

**Metadata** — `peekMetadata(buffer)` lets agents inspect the original filename, size, MIME type, and creation timestamp without decrypting. Useful for routing and cataloguing.

**Integrity** — `result.integrityVerified` is always `true` on a successful `macro`. If it were `false` (corruption), the restored buffer is still returned — your agent decides whether to proceed or abort.

```ts
// Example: agent encrypts a memory snapshot
import { nano, macro } from '@craft/engine';
import { randomBytes } from 'crypto';

const passphrase = randomBytes(32).toString('hex');
const pkg = await nano(memoryBuffer, 'snapshot.json', 'application/json', passphrase);

// Store pkg.buffer and passphrase in your secrets layer
// Later:
const { buffer, integrityVerified } = await macro(storedBuffer, passphrase);
if (!integrityVerified) throw new Error('Memory snapshot corrupted');
```

---

## Low-level API

```ts
import {
  compress7, decompress7,   // 7-fold engine directly
  compress, decompress,      // raw Brotli Q11
  encrypt, encryptAsync,     // AES-256-GCM
  decrypt, decryptAsync,
  deriveKey, deriveKeyAsync, // PBKDF2-SHA256
  checksum, verify,          // SHA-256
} from '@craft/engine';
```

---

## Package Format

```
┌──────────┬─────────┬──────────┬──────────────┬──────┬──────┬──────────┬───────────────┐
│ MAGIC(6) │ VER(1)  │  ML(4)   │   METADATA   │ SALT │  IV  │ AUTHTAG  │   ENCRYPTED   │
│ "CRAFT1" │  0x02   │ uint32BE │     JSON      │  16B │  12B │    16B   │   variable    │
└──────────┴─────────┴──────────┴──────────────┴──────┴──────┴──────────┴───────────────┘
```

The METADATA JSON is authenticated as GCM AAD — tampering with the unencrypted header is detected during decryption. The ENCRYPTED payload contains `[strategy_id(1), ...brotli_compressed_data]`.

---

## Build from Source

```bash
git clone https://github.com/your-username/craft-engine
cd craft-engine
npm install
npm run build
npm test
```

---

## Requirements

- Node.js >= 18
- No runtime dependencies (uses `node:crypto` and `node:zlib`)

---

## License

MIT
