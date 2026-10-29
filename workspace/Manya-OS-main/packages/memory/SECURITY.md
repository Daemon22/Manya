# @manya-os/memory Security Policy

## Scope
`@manya-os/memory` runs entirely locally. Memory contents never leave the host process unless explicitly exported by the caller.

## Threat model
- **Adversary:** anyone with read access to a memory export/backup.
- **Asset:** the raw memory contents (events, facts, skills, long-term records).
- **Goal:** ensure memory is only accessible to authorized subjects.

## Security guarantees
1. **Local-only.** No telemetry, no remote calls.
2. **Per-record permissions.** Use `PermissionModel` to restrict read/write/delete.
3. **Backup integrity.** SHA-256 hash verification detects tampering.
4. **No secrets in logs.** Scrubbed fields: `secret`, `token`, `apiKey`, `password`, `privateKey`.

## Known limitations
- **Permissions are advisory.** They are enforced by `assertRead`/`assertWrite`, but the underlying store is in-process — a compromised host can read all memory directly.
- **Backups are not encrypted.** Use `@manya-os/keyring` to encrypt backups before transmission.
- **Procedural skill handlers are functions.** They cannot be serialized; restored snapshots will have `handler: undefined`.

## Reporting a vulnerability
See root [SECURITY.md](../../SECURITY.md). Do NOT open a public issue for security vulnerabilities.
