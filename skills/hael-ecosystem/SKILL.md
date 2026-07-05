---
name: hael-ecosystem
description: >
  The complete HAEL Foundation ecosystem — all 6 repositories (HAEL Foundation, Orren, Manya,
  Manya-OS, Gqobonco, OMNIMIND) in one skill. Covers the nature-people-technology philosophy,
  Orren's four-layer Supreme Intelligence Language, Manya-OS sovereign intelligence services
  (keyring, cortex, nervous-system, constitution), Manya's 16 tools, 20+ packages, CLI with 8
  subcommands, Unify's 4 connective services (mesh, federation, event bus, vocabularies), Lycon
  privacy browser, development patterns, and HAEL VLM image analysis. Use this skill whenever
  the user asks about HAEL, Manya, Orren, Manya-OS, Gqobonco, the ecosystem, Uviwe Menyiwe,
  nature-people-technology harmony, or any aspect of the Daemon22 GitHub account. Also trigger
  on image analysis requests, CLI commands (manya *), or development questions about any repo.
---

# HAEL Ecosystem — The Complete Tree

The HAEL Foundation, founded by Uviwe Menyiwe, is built on a philosophy of aligning **Nature,
People, and Technology** into a cohesive living system. This skill contains everything: the
philosophy, every repository, every tool, every command, and the patterns that connect them.

## The Tree Architecture

The ecosystem is structured as a living tree:

- **Roots** — HAEL Foundation (`haelfoundation`): the public gateway and philosophical grounding.
  HTML/JS static site — the face the world sees first, rooted in the triad.
- **Trunk** — Orren (`Orren`): the universal mediator language. Every branch communicates through
  Orren's four-layer syntax (Raw, Symbolic, Natural, Meta). Zero external dependencies — pure
  Python StdLib — embodying the sovereignty principle.
- **Main Branches** — Manya (`Manya`) and Manya-OS (`Manya-OS`): the functional intelligence.
  Manya is the public-facing hub (16 tools, 20+ packages, CLI, browser). Manya-OS is the
  sovereign, local-first operating system layer (keyring, cortex, nervous-system, constitution).
  Apache-2.0 licensed — technology that belongs to the people who use it.
- **Knowledge Root** — Gqobonco (`Gqobonco`): "The River of Lineage." The deep taproot drawing
  from ancestral wisdom, Xhosa NLP, historical records, and cultural intelligence.
- **Intelligence Canopy** — OMNIMIND: the supreme intelligence core — the outermost reach where
  all branches converge into unified intelligence.

## The Six Repositories

| Repository | Role | Tech | License |
|---|---|---|---|
| **HAEL Foundation** | Public gateway and philosophical grounding | HTML/JS | — |
| **Orren** | Universal mediator language ("Sacred Tongue") | Pure Python StdLib | — |
| **Manya** | Connective hub: 16 tools, 20+ packages, CLI, browser | Node.js/TypeScript | MIT |
| **MANYA Intelligence OS** | Sovereign, local-first intelligence operating system | Node.js/TypeScript | Apache-2.0 |
| **Gqobonco** | Research, intelligence, ancestral-knowledge preservation | Data/Research | — |
| **OMNIMIND** | The supreme intelligence core | — | — |

Each repo is independently buildable and testable; none depend on another at the code level.

## Core Philosophy: The Triad of Harmony

At the heart of HAEL lies a triad — **Nature, People, and Technology** — woven together into a
single living system. This is not a mere metaphor but a design principle: every project, every
line of code, every decision is measured against whether it brings these three forces into
closer alignment or pushes them further apart.

- **Nature** represents the organic world, ecosystems, growth patterns, the wisdom of natural
  systems, and the environment that sustains all life.
- **People** represent humanity, community, culture, interconnectedness, lineage, and collective
  well-being.
- **Technology** represents tools, systems, intelligence, innovation, and the digital infrastructure
  that can amplify human potential when rooted in natural principles.

### Founder: Uviwe Menyiwe

Uviwe Menyiwe is the visionary founder of the HAEL Foundation. His work is profoundly rooted in
the philosophy of aligning nature, people, and technology into a cohesive living system.

---

# Development Guidance — Building with the Ecosystem

Manya is designed as composable tools, not a monolithic framework. When developing, the first step
is understanding which layer you're working in.

## Key Architecture Patterns

### Tools Are Independent
Each of the 16 tools lives in `tools/` and is independently buildable and testable. Tools do
not import each other directly. Instead, they communicate through Manya Unify's mesh, event
bus, and federation services.

### Packages Compose Tools
Higher-level packages in `packages/` combine core tools into useful compositions:
- `@manya/keyring` = vault + forge + signal + shield (identity wallet)
- `@manya/attest` = hawk + signal + shield (device attestation)
- `@manya/ledger` = stamp + unify (audit trail)
- `@manya/memory` = vault + stamp + unify (multi-tier memory engine)
- `@manya/cortex` = memory + unify + shield + stamp (task routing + decision auditing)

### The 7×7 Integration Tests
Manya has a cross-tool integration test suite: 27 test files × 7 tools each = 190 tests.
These verify that tools work correctly when composed through Unify. Point to `npm run test:7x7`
for integration tests and `npm run tools:test` for individual tool tests.

### Manifests and Capability Boundaries
Every tool declares a manifest (via `@manya/toolkit`) that specifies capabilities, sync channels,
identity types, and vocabularies. This is how the mesh knows where to route calls.

## Common Development Tasks

### Adding a New Tool
1. Create a directory under `tools/` with the tool's name.
2. Write the tool's core functionality.
3. Declare a manifest using `@manya/toolkit`.
4. Write unit tests and add to the 7×7 integration test matrix.
5. Register with `manya mesh register-all`.

### Running the Full Test Suite
```bash
npm install
npm run test:all        # Everything (987 tests)
npm run tools:test      # All 16 tools + Lycon
npm run packages:test   # All packages
npm run test:7x7        # 190 cross-tool integration tests
```

---

# Orren — The Supreme Intelligence Language

Orren is the universal mediator language of the HAEL ecosystem. Written in pure Python with zero
external dependencies, it embodies the sovereignty principle at the language level.

## Four-Layer Syntax
1. **Raw**: Unprocessed input, data in its fundamental form. (Nature)
2. **Symbolic**: Transforms raw input into structured symbols and relationships. (Technology)
3. **Natural**: Bridges symbolic structures to human-readable language. (People)
4. **Meta Language**: The convergence point — a self-describing, executable language.

---

# MANYA Intelligence OS — The Sovereign Layer

Manya-OS provides foundational services (identity, reasoning, events, governance) upon which
Manya's tools operate. Licensed Apache-2.0.

## Core Services
- **Keyring**: Sovereign identity backbone (`@manya/keyring`).
- **Cortex**: Reasoning and decision-making layer (`@manya/cortex`).
- **Nervous System**: Cross-source event fabric (`@manya/nervous-system`).
- **Constitution**: Rules engine governing behaviour (`@manya/constitution`).

---

# Manya — The Connective Hub

Manya is the public-facing monorepo: 16 tools, 20+ packages, CLI, HTTP server, and Lycon browser.

## The 16 Tools (Summary)
- **Security**: Vault, Forge, Signal, Shield, Cybersecurity.
- **Operations**: uSINGA, HelixFlow, Hawk, Craft Engine, Stamp.
- **Intelligence**: Lens, Pulse, Manya Unify.
- **Sectors**: Primary Sector, Transport & Logistics, Research & Academic.

## The CLI (`manya`)
Subcommands: `mesh`, `identity`, `bus`, `translate`, `weave`, `serve`, `repl`, `browse`.

---

# HAEL Lens — Image Analysis

Use this specialized lens to interpret images through the HAEL philosophy.

1. **Observe**: Look for the Triad (Nature, People, Technology).
2. **Read Relationships**: Does technology serve people and honour nature?
3. **Tell the Story**: Weave observations into a narrative of interconnectedness.
4. **Reflect**: Close with an invitation to see the possibilities for harmony.

## Tone
Warm, narrative, specific, honest, and grounded. Write as a thoughtful companion.
