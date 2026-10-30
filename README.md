# MANYA Intelligence OS

> A sovereign, modular, local-first Intelligence Operating System.
>
> Conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the **Manya Hael Foundation**.

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D18-green.svg)](https://nodejs.org/)

## Database/Migration Backbone

Manya-OS includes a complete database and migration backbone that works consistently across local development and production deployments. The backbone uses a single migration architecture and codepath, with environment-specific configuration determining database connections and migration execution.

**Key Documentation:**
- [Database Backbone Architecture](./DATABASE_BACKBONE.md) - Complete architecture overview and design principles
- [@manya-os/supabase Local Development Guide](./packages/supabase/LOCAL_DEVELOPMENT.md) - Setting up local PostgreSQL and testing
- [@manya-os/supabase Production Deployment Guide](./packages/supabase/PRODUCTION_DEPLOYMENT.md) - Production security and deployment best practices

**Quick Start:**
```bash
# Local development with automated setup
node scripts/setup-local-supabase.js

# Run integration tests
npm test -- --testPathPattern=packages/supabase/tests/integration
```

## Vision

MANYA is not simply an npm workspace, a collection of JavaScript libraries, or an AI framework. It is the **technological foundation** of the MANYA Intelligence Operating System — a sovereign platform capable of supporting an entire family of Supreme Intelligences that collaborate through shared identity, memory, governance, communication, reasoning, and execution.

The ecosystem is layered:

```
Foundation     →  Manya Hael Foundation (steward)
Ecosystem      →  MANYA (umbrella for all projects)
Platform       →  MANYA Intelligence OS (this repository)
Packages       →  @manya-os/* (reusable building blocks)
Applications   →  Ara, Sire, Atlas, Nova, Sentinel, …
Agents         →  individual intelligences that run within those applications
```

## Packages

| Package | Purpose |
| --- | --- |
| [`@manya-os/keyring`](packages/keyring) | Sovereign identity & credential wallet — key generation, derivation, encrypted storage, signing, role management, multi-device sync, hardware-backed keys. |
| [`@manya-os/attest`](packages/attest) | Device & session attestation — fingerprinting, signed challenge-response, hardware validation, remote attestation, trust evaluation. |
| [`@manya-os/ledger`](packages/ledger) | Immutable audit ledger — cryptographic event chaining, tamper-evident timestamps, Merkle proofs, replay, export, distributed sync. |
| [`@manya-os/anonymize`](packages/anonymize) | Research-grade anonymization — PII/PHI detection & removal, OCR scrubbing, document metadata stripping, validation reports, reproducible publication. |
| [`@manya-os/customs-shield`](packages/customs-shield) | Compliance & supply-chain intelligence — HS code verification, sanctions screening, cargo risk scoring, regulatory reporting. |
| [`@manya-os/weave`](packages/weave) | Interactive visualization — dependency graphs, knowledge graphs, event flows, architecture diagrams, search, export. |
| [`@manya-os/contracts`](packages/contracts) | Universal contract & schema validation — interface definitions, manifest validation, compatibility rules, boundary enforcement, validation reports. |
| [`@manya-os/cortex`](packages/cortex) | Reasoning orchestration engine — task decomposition, planning, tool selection, confidence estimation, workflow orchestration. |
| [`@manya-os/memory`](packages/memory) | Unified memory system — working, episodic, semantic, procedural memory; indexing, aging, retrieval ranking, sync, import/export. |
| [`@manya-os/constitution`](packages/constitution) | Governance — ethical rules, operational policies, permission models, decision hierarchies, emergency procedures, runtime enforcement. |
| [`@manya-os/council`](packages/council) | Multi-agent consensus — specialist routing, independent analyses, weighted confidence, structured debate, minority opinions, synthesis. |
| [`@manya-os/nervous-system`](packages/nervous-system) | Universal event infrastructure — pub/sub, filtering, routing, recording; filesystem, OS, USB, Bluetooth, network, sensor, app producers. |
| [`@manya-os/supabase`](packages/supabase) | Optional durable Supabase/Postgres persistence adapters for ledger, memory, keyring, and attestation. |

## Ecosystem

MANYA Intelligence OS is one repository within the HAEL Foundation ecosystem — independently maintained, with no code-level dependency on the others:

- **[Manya](https://github.com/Daemon22/Manya)** — the public face and connective hub: tools, packages, and Lycon Browser. Six of this repository's packages (`constitution`, `contracts`, `council`, `customs-shield`, `nervous-system`, `weave`) are also mirrored there under their original Apache-2.0 terms; see that repo's [NOTICE](https://github.com/Daemon22/Manya/blob/master/NOTICE) file.
- **[Gqobonco](https://github.com/Daemon22/Gqobonco)** — the Supreme Prince of Research, Intelligence & Information: research initiatives, the Xhosa NLP Database, and ancestral-knowledge preservation.

This repository stays independently buildable and testable, as do the others; none depend on another at the code level today.

## Principles

- **Long-term maintainability** — every module is small, testable, and replaceable.
- **Modularity** — packages compose; nothing is hardcoded to a single consumer.
- **Security by default** — secure primitives, defensive validation, least privilege.
- **Local-first operation** — works fully offline; cloud is optional.
- **Extensibility** — every subsystem exposes extension points.
- **Interoperability** — clean public APIs, stable versioning.
- **Comprehensive documentation** — README, CHANGELOG, API reference per package.
- **Backward compatibility** — semver discipline; deprecate before removing.

## Quick Start

```bash
git clone https://github.com/manya-hael/intelligence-os.git manya-os
cd manya-os
npm install
npm run build
npm test
```

Use a single package:

```bash
cd packages/keyring
npm install
npm run build
```

## Architecture

```
manya-os/
├── packages/
│   ├── keyring/         # identity & crypto
│   ├── attest/          # device trust
│   ├── ledger/          # immutable audit
│   ├── anonymize/       # privacy
│   ├── customs-shield/  # compliance
│   ├── weave/           # visualization
│   ├── contracts/       # schema & boundaries
│   ├── cortex/          # reasoning
│   ├── memory/          # storage & recall
│   ├── constitution/    # governance
│   ├── council/         # consensus
│   ├── nervous-system/  # event fabric
│   └── supabase/        # persistence adapters
├── package.json
├── tsconfig.json
├── jest.config.js
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
├── CHANGELOG.md
└── LICENSE
```

Each package is a standalone project with its own `src/`, `tests/`, `README.md`, `CHANGELOG.md`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, and `docs/API.md`.

## Governance & Ownership

This project is stewarded by the **Manya Hael Foundation**. All architectural decisions, releases, and long-term direction are the responsibility of **Uviwe Menyiwe (Azura Daemon)** as founder and director. See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution model.

## License

Apache-2.0. See [LICENSE](LICENSE). Commercial use, modification, and redistribution are permitted under the terms of the license. The Manya Hael Foundation retains trademark rights over the MANYA name and brand.

## Acknowledgements

This codebase is the result of a multi-year vision. Thanks to the collaborators, reviewers, and future contributors who will help build the family of Supreme Intelligences envisioned from the start.
