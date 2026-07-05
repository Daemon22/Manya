---
name: manya-dev
description: >
  Guide for developing with the Manya monorepo — its 16 tools, 20+ packages, repo structure,
  cross-tool composition patterns, and how to build new tools that participate in the ecosystem.
  Use this skill when the user asks about Manya's codebase, how tools work, how to add features,
  how packages compose, how to run tests, or any development question about the Manya project.
  Also trigger on "how do I contribute to Manya?", "what's in the Manya repo?", "Manya architecture",
  "tool manifest", "capability boundaries", or "7x7 tests".
---

# Manya Dev — Building with the Ecosystem

This skill guides development with the Manya monorepo. Before answering any development
question, read the full ecosystem reference:

- **`references/manya-ecosystem.md`** — Complete reference covering all 16 tools, 20+ packages,
  CLI subcommands, repository structure, and the Unify connective tissue.

## How to Approach Development Questions

Manya is designed as composable tools, not a monolithic framework. When someone asks a
development question, the first step is understanding which layer they're working in:

1. **Adding a new tool** — They need to understand the tool manifest format, capability
   boundaries, and how to register with the mesh.
2. **Using existing tools** — They need to know which tool handles their use case and how
   to call it (directly or through the mesh).
3. **Composing packages** — They need to understand how higher-level packages (keyring,
   memory, cortex, etc.) are composed from core tools.
4. **Writing tests** — They need the test structure and the 7×7 integration test pattern.

## Key Architecture Patterns

### Tools Are Independent

Each of the 16 tools lives in `tools/` and is independently buildable and testable. Tools do
not import each other directly. Instead, they communicate through Manya Unify's mesh, event
bus, and federation services. This is intentional — it means any tool can be used standalone
or swapped out without breaking others.

### Packages Compose Tools

Higher-level packages in `packages/` combine core tools into useful compositions:

- `@manya/keyring` = vault + forge + signal + shield (identity wallet)
- `@manya/attest` = hawk + signal + shield (device attestation)
- `@manya/ledger` = stamp + unify (audit trail)
- `@manya/memory` = vault + stamp + unify (multi-tier memory engine)
- `@manya/cortex` = memory + unify + shield + stamp (task routing + decision auditing)

This composition pattern means you can understand any package by understanding its constituent
tools. When someone asks "how does keyring work?", the answer is: it combines vault (encrypted
storage), forge (key derivation), signal (cryptographic signatures), and shield (access control)
into a sovereign identity wallet.

### The 7×7 Integration Tests

Manya has a cross-tool integration test suite: 27 test files × 7 tools each = 190 tests.
These verify that tools work correctly when composed through Unify. When guiding someone on
testing, point them to `npm run test:7x7` for integration tests and `npm run tools:test`
for individual tool tests.

### Manifests and Capability Boundaries

Every tool declares a manifest (via `@manya/toolkit`) that specifies:
- What capabilities the tool provides
- What sync channels it listens to and publishes on
- What identity types it can work with
- What vocabularies it understands

This manifest is how the mesh knows where to route calls and the event bus knows where to
deliver events.

## Common Development Tasks

### Adding a New Tool

1. Create a directory under `tools/` with the tool's name
2. Write the tool's core functionality
3. Declare a manifest using `@manya/toolkit` — specify capabilities, sync channels, identity
   types, and vocabularies
4. Write unit tests
5. Add the tool to the 7×7 integration test matrix
6. Register with `manya mesh register-all` to make it discoverable

### Creating a Composite Package

1. Identify which core tools your package needs
2. Import those tools' packages
3. Create the composition in `packages/@manya/<name>/index.js`
4. Declare the composed package's own manifest (it becomes a tool in its own right)
5. Write tests that verify the composition behaves correctly

### Running the Full Test Suite

```bash
npm install
npm run test:all        # Everything (987 tests)
npm run tools:test      # All 16 tools + Lycon
npm run packages:test   # All packages
npm run test:7x7        # 190 cross-tool integration tests
```

## Quick Reference: Tool → Package Dependencies

When someone asks "what does tool X depend on?" or "what uses tool X?", consult this map:

| Tool | Used By (Composite Packages) |
|---|---|
| Vault | keyring, memory, economy, guardian, perception |
| Forge | keyring |
| Signal | keyring, attest, telepathy |
| Shield | keyring, attest, cortex, guardian, perception |
| Stamp | ledger, memory, cortex, anonymize |
| Hawk | attest, perception |
| Lens | anonymize, perception, Pulse |
| Unify | ledger, memory, cortex, telepathy, reflection, economy |

## Tone

Be direct and practical. Manya developers want to understand the architecture quickly so
they can build. Provide concrete file paths, real command examples, and clear explanations
of why things are structured the way they are. Avoid philosophy here — that belongs in
hael-vlm and hael-ecosystem.