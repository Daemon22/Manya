# Manya SKILL.md — Architecture & Operations Reference

> **SKILL.md** is the single source of truth for the Manya repository's architecture,
> build/test workflows, and operational procedures. It replaces all prior audit reports
> and stale README sections. Everything described here is verified live.

**Version**: 0.9.0  
**Last updated**: 2025  
**Repository**: [Daemon22/Manya](https://github.com/Daemon22/Manya)

---

## Table of Contents

1. [Repository Overview](#1-repository-overview)
2. [Tool Architecture (8 CLI-accessible tools)](#2-tool-architecture-8-cli-accessible-tools)
3. [Package Architecture (25 packages)](#3-package-architecture-25-packages)
4. [Hawk — Library-only tool (no manifest)](#4-hawk-library-only-tool-no-manifest)
5. [UPMP Real Architecture](#5-upmp-real-architecture)
6. [TypeScript Configuration](#6-typescript-configuration)
7. [Testing](#7-testing)
8. [Linting](#8-linting)
9. [Coverage](#9-coverage)
10. [CI & Release](#10-ci--release)
11. [Runtime Surfaces](#11-runtime-surfaces)
12. [Dead Code & Cleanup Decisions](#12-dead-code--cleanup-decisions)

---

## 1. Repository Overview

Manya is an ESM-first monorepo (`"type": "module"`) with two top-level groupings:

| Directory | Purpose | Count |
|-----------|---------|-------|
| `tools/` | Deployable tools and product workspaces | 17 |
| `packages/` | Publishable shared libraries and SDKs | 25 |
| `site/manya` | Main website (Vite + Svelte) | 1 |
| `tests/` | Cross-tool integration test suites | 1 |

### Workspace configuration

Defined in root `package.json` with npm workspaces covering all 17 tools + 25 packages +
the site. The root `package.json` is `"private": true` — nothing is published from root.

### Three runtime surfaces + browser

The "unite/connect" theme is accessible from four surfaces:

1. **Shell** — `manya` CLI (`tools/cli/src/index.js`) with subcommands for mesh, identity,
   bus, translate, weave, serve, repl, browse.
2. **HTTP** — `manya serve` boots an HTTP server (`tools/cli/src/serve.js`) with REST API
   and SSE event stream at `http://localhost:3100`.
3. **Interactive** — `manya repl` provides a tab-completing, history-tracking shell
   (`tools/cli/src/repl.js`).
4. **Browser** — `manya browse` launches the Lycon privacy browser
   (`tools/lycon-browser/`) with Manya integration.

**Craft Engine** (`tools/forge`) is intentionally **separate** from this repository.

---

## 2. Tool Architecture (8 CLI-accessible tools)

The Manya CLI (`tools/cli/src/registry.js`) registers 8 tools — these are the tools
accessible via `manya mesh register <toolId>` and `manya mesh register-all`:

| # | Tool ID | Package | Capabilities |
|---|---------|---------|-------------|
| 1 | `forge` | `@manya/forge` | `keyDerivation`, `passphraseStrength`, `keyRotation`, `multiAlgorithmHash` |
| 2 | `pulse` | `@manya/pulse` | Industry presets (10 industries) |
| 3 | `primary-sector` | `@manya/primary-sector` | `sectorValidation`, `sectorCompliance`, `sectorPresets`, `coordinateValidation`, `productionReporting` |
| 4 | `cybersecurity` | `@manya/cybersecurity` | `threatIntelligence`, `vulnerabilityAssessment`, `securityCompliance`, `digitalForensics`, `incidentResponse` |
| 5 | `transport-logistics` | `@manya/transport-logistics` | `transportModePresets`, `transportIdentifierValidation`, `shipmentTracking`, `customsCompliance`, `dangerousGoodsClassification`, `sanctionsScreening` |
| 6 | `research-academic` | `@manya/research-academic` | `researchDomainPresets`, `citationValidation`, `reproducibilityManifests`, `peerReviewProvenance`, `researchDataManagement`, `discussionExport` |
| 7 | `unify` | `@manya/unify` | `toolFederation`, `identityLinking`, `syncChannelRouting`, `vocabularyBridging`, `capabilityDispatch` |
| 8 | `lycon-browser` | `@manya/lycon` | `webBrowsing`, `adBlocking`, `bookmarkManagement`, `downloadManagement`, `privateBrowsing`, `browserHistoryManagement` |

**Note:** `upmp` is a 9th tool in the toolkit manifests but is NOT registered in the
CLI registry (`tools/cli/src/registry.js`). It is accessible programmatically via
`tools/upmp/manya/index.js`.

### Hawk — Library-only tool

`tools/hawk/src/index.js` exports `{ hawk, default hawk }` with `detect`, `fingerprint`,
`monitor`, `snapshot`. It has **no manifest** — not in `@manya/toolkit`'s
`capabilityOwners`, not in `tools/cli/src/registry.js`. It is a library-only tool that
provides device detection, environment monitoring, and browser fingerprinting services
consumed by other tools (e.g., `@manya/attest`, `@manya/perception`). It does not own
data capabilities and therefore has nothing to declare in a manifest.

### Craft Engine

`tools/forge` is the Craft Engine — a standalone key derivation and passphrase strength
tool. It is **not** part of the Craft Engine as defined in the original design docs;
it is a Manya tool that provides cryptographic primitives. The `forgeManifest` is defined
in `@manya/toolkit`.

### Removed

`tools/Marriage/` has been removed. No references remain.

---

## 3. Package Architecture (25 packages)

### Published packages (npm workspaces)

| Package | Description | License |
|---------|-------------|---------|
| `@manya/toolkit` | Shared manifests, capability boundaries, sync contracts (16 tools + 64+ capabilities) | MIT |
| `@manya/helixflow-sdk` | HelixFlow client and workflow helpers | MIT |
| `@manya/unify` | Mesh, federation, event bus, vocabularies | MIT |
| `@manya/cli` | CLI, HTTP server, REPL | MIT |
| `@manya/lycon` | Lycon browser Manya integration layer | MIT |
| `@manya/keyring` | Sovereign identity wallet | MIT |
| `@manya/attest` | Device/session attestation | MIT |
| `@manya/ledger` | Tamper-evident audit ledger | MIT |
| `@manya/anonymize` | Redaction + reproducibility pipeline | MIT |
| `@manya/memory` | Working/episodic/semantic/procedural memory | MIT |
| `@manya/cortex` | Capability-based task routing | MIT |
| `@manya/perception` | Redacted ingestion engine | MIT |
| `@manya/telepathy` | Signed inter-agent messaging | MIT |
| `@manya/reflection` | Plan critique and replanning | MIT |
| `@manya/economy` | Budget tracking and enforcement | MIT |
| `@manya/guardian` | Standing-rules enforcement | MIT |

### Apache-2.0 packages (merged from MANYA Intelligence OS)

| Package | Description |
|---------|-------------|
| `@manya/constitution` | Rules, policies, permissions, hierarchy, emergency-protocol engine |
| `@manya/council` | Multi-specialist analysis, conflict detection, consensus synthesis |
| `@manya/contracts` | Schema/manifest validation, API contract checking |
| `@manya/customs-shield` | Sanctions screening, HS code validation, supply-chain risk |
| `@manya/nervous-system` | Cross-source event fabric (filesystem, network, OS, devices) |
| `@manya/weave` | Graph data structure, layout, search, export (DOT/JSON) |

### Composed packages (smoke-tested, no dedicated spec)

`keyring`, `attest`, `ledger`, `anonymize`, `memory`, `cortex`, `perception`,
`telepathy`, `reflection`, `economy`, `guardian` — 11 packages with JS smoke tests
(`test/smoke.test.js`) that verify basic import and function availability.

---

## 4. Hawk — Library-only tool (no manifest)

**Status**: Documented as library-only. **No manifest** is declared.

`tools/hawk/src/index.js` provides:
- `detect(ua)` — user-agent parsing → browser, OS, device type, bot detection
- `fingerprint(env)` — deterministic environment fingerprint hash
- `monitor()` — periodic environment metrics (CPU, memory, network, uptime)
- `snapshot(env)` — combined detection + fingerprinting + monitoring snapshot

**Why no manifest**: Hawk provides monitoring/detection services. It does not own
data capabilities (no `owns` in any `capabilityOwners` map). It is consumed by
`@manya/attest` (for device attestation) and `@manya/perception` (for environment
signal ingestion). Adding a manifest with fabricated capabilities would be incorrect.

**Verification**: The `tests/performance-7x7.test.js` suite (Dimension 3) imports
Hawk directly and tests all four functions. It passes.

---

## 5. UPMP Real Architecture

`tools/upmp/manya/index.js` is the Manya integration adapter for UPMP-ADT (Universal
Progress Monitoring — Active Device Tracker), a Python personal activity tracker.

### Three integration points

1. **Event forwarding** — UPMP session/stuck/discovery events flow into Manya's event
   bus on `upmp:*` sync channels (7 channels: `session-started`, `session-ended`,
   `stuck-point`, `stuck-resolved`, `discovery`, `intelligence-engaged`,
   `breakthrough`).

2. **Intelligence as identity** — UPMP's intelligence engagement model (Gardner's 9 +
   custom) can be linked to Manya federated identities via
   `linkIntelligenceToIdentity()`.

3. **Discussion artifact export** — UPMP's discussion artifacts can be exported via
   the Manya CLI.

### Architecture

The adapter (`createAdapter({ bus })`) maintains:
- `sessions` — Map of session records
- `intelligences` — Map of Gardner's 9 intelligences + custom
- `intelligenceLinks` — Map of intelligence → federated identity

Event factory functions (`createSessionStartedEvent`, `createStuckPointEvent`,
`createDiscoveryEvent`) are used by the adapter methods to construct event payloads
before forwarding to the bus via `publishToBus()`.

The adapter methods (`startSession`, `recordStuckPoint`, `recordDiscovery`) use the
factory functions to create event bodies and then spread them with session-specific
metadata before forwarding.

---

## 6. TypeScript Configuration

### Root configuration (`tsconfig.json`)

The root `tsconfig.json` is a shared base config that all six TypeScript packages
extend:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "noEmit": true
  }
}
```

### Package-specific configurations

Each of the six TS packages (`constitution`, `contracts`, `council`,
`customs-shield`, `nervous-system`, `weave`) has a `tsconfig.json` that extends
`../../tsconfig.json` with a local `include` for `src/` and `tests/`:

```json
{
  "extends": "../../tsconfig.json",
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

### Site configuration

The website (`site/manya/`) has its own `tsconfig.json` for the Svelte/Vite frontend.
It is not affected by the root TS config.

### Vitest integration

`vitest.config.ts` at the repository root configures Vitest to discover and run all
TypeScript spec files in `packages/*/tests/**/*.spec.ts`. It uses:
- `globals: true` — provides `describe`, `test`, `expect`, `beforeEach` globally
- `environment: 'node'` — Node.js environment for all tests
- `coverage.provider: 'v8'` — V8-based coverage for all six packages' `src/` directories

---

## 7. Testing

### Test inventory

| Suite | Runner | Tests | Status |
|-------|--------|-------|--------|
| Toolkit | node:test | 21 | ✅ |
| HelixFlow SDK | node:test | 3 | ✅ |
| Composed Packages | node:test | 52 | ✅ |
| Merged Packages (JS smoke) | node:test | 11 | ✅ |
| TypeScript Specs (Vitest) | vitest | 670 | ✅ |
| Hawk | node:test | 18 | ✅ |
| Forge | node:test | 25 | ✅ |
| Stamp | node:test | 21 | ✅ |
| Vault | node:test | 32 | ✅ |
| Lens | node:test | 42 | ✅ |
| Shield | node:test | 55 | ✅ |
| Signal | node:test | 35 | ✅ |
| Pulse | node:test | 16 | ✅ |
| Primary Sector | node:test | 46 | ✅ |
| Cybersecurity | node:test | 61 | ✅ |
| Transport & Logistics | node:test | 66 | ✅ |
| Research & Academic | node:test | 73 | ✅ |
| Manya Unify | node:test | 75 | ✅ |
| Manya CLI | node:test | 119 | ✅ |
| Lycon Browser | node:test | 59 | ✅ |
| UPMP | node:test | 30 | ✅ |
| 7×7 Performance v12 | node:test | 162 | ✅ |
| **Total** | | **1715** | ✅ |

### TypeScript spec suites (6 packages, 670 tests)

The six Apache-2.0 packages contain comprehensive `.spec.ts` suites that use Jest-style
globals (`describe`, `test`, `expect`, `beforeEach`). These are executed via Vitest with
`globals: true`:

| Package | Spec file | Tests |
|---------|-----------|-------|
| `constitution` | `packages/constitution/tests/constitution.spec.ts` | 151 |
| `contracts` | `packages/contracts/tests/contracts.spec.ts` | 99 |
| `council` | `packages/council/tests/council.spec.ts` | 121 |
| `customs-shield` | `packages/customs-shield/tests/customs-shield.spec.ts` | 42 |
| `nervous-system` | `packages/nervous-system/tests/nervous-system.spec.ts` | 152 |
| `weave` | `packages/weave/tests/weave.spec.ts` | 105 |

**Why Vitest (not Jest)**: All six suites use Jest-style globals without imports. Vitest
supports these globals via `globals: true` in the config, requires no per-file import
changes, runs on Node.js ESM natively, and integrates with the npm workspaces model
without a separate configuration file per package. No test logic was changed.

### Test commands

```sh
npm run test:all          # Run all JS tests + TS spec tests + 7×7
npm run test:spec         # Run TypeScript spec suites (vitest run)
npm run test:coverage     # Run TS spec suites with coverage report
npm run tools:test        # All tool tests (node:test, JS)
npm run packages:test     # All package tests (node:test, JS + vitest, TS)
npm run test:7x7          # 162 cross-tool integration tests
```

### nervous-system `done()` callback migration

The `nervous-system.spec.ts` suite originally used `done()` callbacks in 5 tests
(filesystem, OS, network, USB simulation, and end-to-end round-trip). These caused
Vitest deprecation warnings and one ENOENT error (timing race during temp-dir cleanup).
All 5 tests were converted to `async/await` with `await new Promise(r => setTimeout(r, ms))`
— zero test logic changes, zero test count changes.

---

## 8. Linting

ESLint flat configuration (`eslint.config.mjs`) covers:
- JavaScript source files (`tools/**`, `packages/**` `.js` files)
- JavaScript test files (`tools/**/test/**/*.js`, `packages/**/test/**/*.js`)
- TypeScript source files (`packages/**/src/**/*.ts`)
- TypeScript spec files (`packages/**/tests/**/*.ts`)

Uses `@eslint/js` recommended and `typescript-eslint` recommended rule sets. Ignores
`node_modules`, `dist`, `coverage`.

```sh
npm run lint              # Lint all JS and TS source
```

---

## 9. Coverage

Vitest with `@vitest/coverage-v8` provides reproducible coverage for the six TypeScript
packages:

```sh
npm run test:coverage     # Generates coverage/ report
```

Coverage includes all `src/` directories for the six spec-tested packages.

---

## 10. CI & Release

### CI workflow (`.github/workflows/ci.yml`)

Runs on every push and PR to `main`/`master`:
1. `npm ci` — clean install
2. `npm run lint` — ESLint
3. `npm run site:typecheck` — TypeScript type checking
4. `npm run test:all` — all JS + TS tests + 7×7
5. `npm run test:coverage` — TS spec coverage
6. `npm run site:build` — production build
7. `npm audit --audit-level=moderate` — security audit (non-continuable)

### Release workflow (`.github/workflows/release.yml`)

Triggers on version tags (`v*`):
1. `npm ci`
2. `npm run lint`
3. `npm run test:all`
4. `npm run test:coverage`
5. `npm run site:typecheck`
6. `npm run site:build`
7. GitHub release with `site/manya/dist/**` artifacts

---

## 11. Runtime Surfaces

### CLI (12 commands)

```
manya mesh list|register|register-all|dispatch|channels|reset
manya identity create|link|resolve|list|merge|find-by-source|reset
manya bus publish|route|stats|reset
manya translate <from> <to> <value>
manya translations
manya domains
manya weave [--out <path>]
manya serve [--port <port>]
manya repl
manya browse [url] [--no-sandbox] [--private]
manya version
manya help
```

### HTTP server (`manya serve`)

Exposes ~20 endpoints: REST API (`/api/*`), SSE event stream (`/api/events`),
dashboards (`/` and `/weave`), health check, mesh/identity/bus/translate operations.

### REPL (`manya repl`)

Tab-completing, history-tracking interactive shell with multi-line input support.

### Dashboards

- `/` — Event bus dashboard (live events, subscribers, stats)
- `/weave` — Interactive force-directed graph of tools, identities, and sync channels

---

## 12. Dead Code & Cleanup Decisions

| Item | Location | Decision |
|------|----------|----------|
| `replay()` | `tools/unify/src/eventbus.js:149` | RETAIN — exported public API, used in tests |
| `getHsChapterMap()` | `tools/unify/src/vocabularies.js` | RETAIN — exported public API |
| `findConsumers()` | `tools/unify/src/mesh.js:141` | RETAIN — exported public API |
| `getTool()` | `tools/unify/src/mesh.js:62` | RETAIN — exported public API |
| `unregisterTool()` | `tools/unify/src/mesh.js:53` | RETAIN as API; removed unused import from `dispatcher.js` |
| `_meshId()` | `tools/unify/src/mesh.js` | REMOVED — never referenced anywhere |
| `serve` case | `tools/cli/src/dispatcher.js` | REMOVED — unreachable (handled in `main()` before dispatch) |
| `_publishEx` branch | `tools/lycon-browser/manya/index.js` | REMOVED — `bus._publishEx` never defined on any bus |
| UPMP event factories | `tools/upmp/manya/index.js` | INTEGRATED — adapter methods now use factory functions |

---

*Everything Connected. Everyone Unified.*
