# Changelog

All notable changes to `@manya-os/supabase` will be documented in this file.

## [1.1.0] - 2024-01-01

### Added
- **`src/index.ts` barrel file** — package is now importable; exports all public types, classes, and functions.
- **`SupabaseSessionStore`** adapter implementing `SessionStore` from `@manya-os/attest` with full CRUD + expiry pruning.
- **`SupabaseEncryptedStorage`** adapter implementing `EncryptedStorage` from `@manya-os/keyring` with base64-encoded binary blob storage and prefix listing.
- **`withRetry` utility** — all adapter operations now wrapped with configurable exponential-backoff retry for transient errors.
- **Migration 004** (`004_supabase_helpers.sql`) — adds `increment_longterm_access()`, `prune_expired_sessions()`, and `record_migration()` RPC functions.
- **`.env.example`** — documents all required and optional environment variables.
- **Unit tests** (10 files, ~200+ tests) — config, errors, logging, client, retry, ledger-store, memory-store, session-store, encrypted-storage, migration-runner, types.
- **Integration tests** (7 files) — connection, migrations, ledger CRUD, memory CRUD, session CRUD, encrypted-storage CRUD, error handling, cleanup.

### Fixed
- **SQL injection vulnerability** in `SupabaseMemoryStore.touchLongterm` — replaced raw string interpolation with parameterized `increment_longterm_access` RPC call.
- **Migration runner robustness** — SQL statement splitter now correctly handles dollar-quoted PL/pgSQL blocks, single-quoted strings, and SQL comments. Removed dead-code fallback retry.
- **LedgerStore interface mismatch** — added `AsyncLedgerStore` interface to `@manya-os/ledger` for network-backed stores. `SupabaseLedgerStore` now has a clear async contract.

### Changed
- All adapter methods in `SupabaseLedgerStore` and `SupabaseMemoryStore` are now wrapped with retry logic using the configured `RetryConfig`.
- `SupabaseMemoryStore` constructor now stores `retryConfig` for use by all methods.

## [1.0.0] - 2024-01-01

### Added
- Initial release of `@manya-os/supabase`.
- `SupabaseClientFacade` — lifecycle-managed Supabase client wrapper.
- `SupabaseLedgerStore` — async append-only ledger store.
- `SupabaseMemoryStore` — full memory store implementation (episodic, semantic, long-term, links, permissions, snapshots).
- `MigrationRunner` — versioned, checksummed migration execution.
- Typed configuration (`SupabaseConfig`, `ResolvedConfig`) with `resolveConfig` and `configFromEnv`.
- Error hierarchy (`SupabaseError`, `ConnectionError`, `QueryTimeoutError`, `ConflictError`, `ValidationError`, `MigrationError`, `ConfigError`) with `classifyError` and `isRetryable`.
- Structured logging with sensitive field redaction.
- Row-mapping types for all 15 database tables.
- SQL migrations: initial schema (15 tables), RLS policies, performance indexes.
- Peer dependencies on `@manya-os/ledger`, `@manya-os/memory`, `@manya-os/keyring`, `@manya-os/attest` (all optional).
