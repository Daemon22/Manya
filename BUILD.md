# MANYA Intelligence OS — Build System

> Production-grade build pipeline for the MANYA Intelligence OS monorepo.
> Dual CJS + ESM output per package, type declarations, tree-shaken
> super-bundle, and parallel type-checking.

## Quick reference

| Command | What it does | Wall time |
| --- | --- | --- |
| `npm run build:fast` | Bundle all 13 packages with esbuild (CJS + ESM, no types) | ~260 ms |
| `npm run build:types` | Generate `.d.ts` declarations with tsc | ~28 s |
| `npm run build` | Full per-package build (bundles + types) | ~28 s |
| `npm run build:bundle` | Workspace super-bundle (single minified file) | ~400 ms |
| `npm run build:prod` | Full build + super-bundle | ~29 s |
| `npm run build:analyze` | Super-bundle + size analysis report | ~1 s |
| `npm run typecheck` | Type-check all packages (incremental, `tsc -b --noEmit`) | ~5 s |
| `npm run typecheck:parallel` | Type-check all packages (parallel spawn) | ~26 s |
| `npm run test` | Run full jest test suite (2,189 tests) | ~10 s |
| `npm run test:coverage` | Run tests with V8 coverage | ~17 s |
| `npm run clean` | Remove all build artifacts | <1 s |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                MANYA Intelligence OS                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Source:  packages/<name>/src/**/*.ts  (~43k lines)  │
│                                                      │
│  ┌──────────────┐    ┌─────────────────────────┐    │
│  │   esbuild    │    │          tsc            │    │
│  │  (fast JS)   │    │  (type declarations)    │    │
│  │  ~260ms      │    │  ~28s                   │    │
│  └──────┬───────┘    └────────────┬────────────┘    │
│         │                         │                  │
│         ▼                         ▼                  │
│  dist/cjs/index.js      dist/types/index.d.ts        │
│  dist/esm/index.mjs     dist/types/**/*.d.ts         │
│         │                         │                  │
│         └──────────┬──────────────┘                  │
│                    ▼                                  │
│         Per-package output (13 packages)             │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │           Workspace super-bundle              │   │
│  │           (esbuild, single pass)              │   │
│  │           ~400ms                              │   │
│  └────────────────────┬─────────────────────────┘   │
│                       ▼                              │
│  dist/manya-os.cjs          (543 KB)                │
│  dist/manya-os.mjs          (520 KB)                │
│  dist/manya-os.min.cjs      (290 KB, 85 KB gzip)    │
│  dist/manya-os.min.mjs      (280 KB, 81 KB gzip)    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Per-package output

Every `@manya-os/*` package produces three output formats in `dist/`:

```
packages/<name>/dist/
├── cjs/
│   ├── index.js          ← CommonJS (Node require)
│   └── package.json      ← { "type": "commonjs" }
├── esm/
│   ├── index.mjs         ← ESM (import)
│   └── package.json      ← { "type": "module" }
└── types/
    ├── index.d.ts        ← Type declarations
    ├── index.d.ts.map    ← Declaration source maps
    └── **/*.d.ts         ← Per-module declarations
```

Each `package.json` declares:

```json
{
  "main": "dist/cjs/index.js",
  "module": "dist/esm/index.mjs",
  "types": "dist/types/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "require": "./dist/cjs/index.js",
      "import": "./dist/esm/index.mjs",
      "default": "./dist/cjs/index.js"
    }
  },
  "sideEffects": false,
  "files": ["dist", "README.md", "CHANGELOG.md", "LICENSE"]
}
```

## Super-bundle

The workspace super-bundle is a single file containing all 13 packages, suitable for:

- **Edge deployment** (Cloudflare Workers, Vercel Edge, Deno Deploy)
- **Browser distribution** (single `<script>` tag)
- **Single-file embedding** (e.g. in an Electron app or CLI)

```js
// CJS
const { MemorySystem, Cortex, Anonymizer } = require('./dist/manya-os.min.cjs');
// or directly from the file:
const { MemorySystem } = require('./dist/manya-os.min.cjs');

// ESM
import { MemorySystem, Cortex } from './dist/manya-os.min.mjs';
// or:
import { MemorySystem } from './dist/manya-os.min.mjs';
```

## Tree-shaking

All packages declare `"sideEffects": false`, so bundlers can safely drop
unused exports. Example:

```js
// Only MemorySystem is bundled — Cortex, Anonymizer, etc. are tree-shaken away.
import { MemorySystem } from '@manya-os/memory';
```

## Optimization techniques applied

1. **esbuild for transpilation** — 10-100x faster than tsc for JS emit.
2. **tsc for declarations only** — `--emitDeclarationOnly` skips JS emit.
3. **Project references** — `tsc -b` only re-checks changed packages.
4. **Incremental builds** — `.tsbuildinfo` caches type-check state.
5. **Parallel type-checking** — 11.84x speedup vs sequential.
6. **Tree-shaking** — esbuild's dead-code elimination + `sideEffects: false`.
7. **Minification** — whitespace + syntax + identifier minification.
8. **Source maps** — separate `.map` files (no inline bloat).
9. **Dual CJS + ESM** — consumers get the right format automatically.
10. **Node builtins external** — no bundling of `fs`, `crypto`, etc.

## Build scripts

| Script | File | Purpose |
| --- | --- | --- |
| `build-package.js` | esbuild | Per-package CJS + ESM bundling |
| `build-types.js` | tsc | Per-package `.d.ts` generation |
| `build-super-bundle.js` | esbuild | Single-file workspace bundle |
| `typecheck-all.js` | tsc (parallel) | Spawn-per-package type-check |
| `modernize-packages.js` | — | Update package.json fields |
| `analyze-bundle.js` | — | Bundle size report |
| `run-benchmarks.js` | ts-node | Run all package benchmarks |

## Performance benchmarks

Measured on a typical development machine (4-core CPU, SSD):

| Operation | Time |
| --- | --- |
| Clean build (esbuild all 13 packages) | 260 ms |
| Type declarations (all 13 packages) | 28 s |
| Super-bundle (all 13 → 1 file, minified) | 400 ms |
| Type-check incremental (`tsc -b --noEmit`) | 5 s |
| Type-check parallel (13 packages) | 26 s |
| Full test suite (2,189 tests) | 10 s |

## Bundle sizes

| Output | Size | Gzipped |
| --- | --- | --- |
| `manya-os.cjs` (debug) | 543 KB | 127 KB |
| `manya-os.mjs` (debug) | 520 KB | 122 KB |
| `manya-os.min.cjs` | 290 KB | 85 KB |
| `manya-os.min.mjs` | 280 KB | 81 KB |
| Sum of per-package CJS | 410 KB | — |
| Sum of per-package ESM | 376 KB | — |
| Raw source | 958 KB | — |

**Compression ratio:** 958 KB → 81 KB = 91.5% reduction.

## Verifying the build

```bash
# Full production build
npm run build:prod

# Verify tests still pass
npm test

# Verify super-bundle loads
node -e "const m = require('./dist/manya-os.min.cjs'); console.log(Object.keys(m).length, 'exports');"

# Verify ESM bundle loads
node --input-type=module -e "import * as m from './dist/manya-os.min.mjs'; console.log(Object.keys(m).length, 'exports');"

# Verify per-package build loads
node -e "const { MemorySystem } = require('./packages/memory/dist/cjs/index.js'); console.log(typeof MemorySystem);"
```

## Adding a new package

1. Create `packages/<name>/` with `src/index.ts`, `package.json`, `tsconfig.json`.
2. Add to `tsconfig.json` `paths` and `references`.
3. Add to `scripts/build-super-bundle.js` `PACKAGES` array.
4. Run `node scripts/modernize-packages.js` to update package.json fields.
5. Run `npm run build:prod` to verify.
