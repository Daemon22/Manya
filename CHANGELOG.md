# Changelog

All notable changes to the MANYA Intelligence OS monorepo are documented here.

Each package also maintains its own `CHANGELOG.md` under `packages/<pkg>/`. This file records changes to the monorepo root (tooling, build, conventions, cross-package refactors).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial monorepo scaffolding with TypeScript project references.
- Root `package.json` with workspaces configuration.
- Root `tsconfig.json` with path mappings for all 12 `@manya-os/*` packages.
- Jest configuration for cross-package test runner.
- Root `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`.
- Initial release of all 12 packages at version `1.0.0`.

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Security
- Established root-level security policy and disclosure workflow.

## [1.0.0] — 2026-07-04

### Added
- `@manya-os/keyring` v1.0.0 — sovereign identity and credential wallet.
- `@manya-os/attest` v1.0.0 — device and session attestation.
- `@manya-os/ledger` v1.0.0 — immutable audit ledger with Merkle proofs.
- `@manya-os/anonymize` v1.0.0 — research-grade anonymization.
- `@manya-os/customs-shield` v1.0.0 — compliance and supply-chain intelligence.
- `@manya-os/weave` v1.0.0 — interactive visualization.
- `@manya-os/contracts` v1.0.0 — universal contract and schema validation.
- `@manya-os/cortex` v1.0.0 — reasoning orchestration engine.
- `@manya-os/memory` v1.0.0 — unified memory system.
- `@manya-os/constitution` v1.0.0 — governance package.
- `@manya-os/council` v1.0.0 — multi-agent consensus engine.
- `@manya-os/nervous-system` v1.0.0 — universal event infrastructure.
