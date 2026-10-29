# @manya-os/supabase

Supabase/Postgres persistence adapters for the MANYA Intelligence OS.

Optional companion package providing durable storage for ledger, memory, keyring, and attestation packages. Core packages continue to work fully in-memory without Supabase.

## Installation

```bash
npm install @manya-os/supabase
```

### Peer Dependencies (all optional)

The adapter you need depends on which packages you want to persist:

| Adapter | Peer Dependency | Purpose |
|---|---|---|
| `SupabaseLedgerStore` | `@manya-os/ledger` | Append-only audit events |
| `SupabaseMemoryStore` | `@manya-os/memory` | Episodic, semantic, long-term memory |
| `SupabaseSessionStore` | `@manya-os/attest` | Device attestation sessions |
| `SupabaseEncryptedStorage` | `@manya-os/keyring` | Encrypted key-value storage |

## Quick Start

```typescript
import { resolveConfig, SupabaseClientFacade, SupabaseMemoryStore } from '@manya-os/supabase';

// 1. Configure
const config = resolveConfig({
  url: 'https://your-project.supabase.co',
  serviceRoleKey: 'your-service-role-key',
     databaseUrl: 'postgresql://migration-user:password@db-host:5432/database',
  logLevel: 'info',
     migrateOnStart: true,
});

// 2. Create client
const facade = new SupabaseClientFacade(config, logger);
await facade.ready(); // wait for startup migrations

// 3. Create adapter
const store = new SupabaseMemoryStore(facade.getClient(), config, logger);

// 4. Use with a domain package
import { MemorySystem } from '@manya-os/memory';

const memory = new MemorySystem({ store });
```

### Using Environment Variables

```typescript
import { configFromEnv, SupabaseClientFacade } from '@manya-os/supabase';

const config = configFromEnv(); // reads Supabase credentials and optional DATABASE_URL
const facade = new SupabaseClientFacade(config, logger);
await facade.ready();
```

## Configuration

| Field | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | **required** | Supabase project URL |
| `serviceRoleKey` | `string` | **required** | Service-role key (server-side only) |
| `databaseUrl` | `string` | — | Direct PostgreSQL URL for fresh migrations (server-side only) |
| `anonKey` | `string` | — | Anonymous key (client-safe) |
| `migrateOnStart` | `boolean` | `false` | Run pending migrations on first connection |
| `migrationDir` | `string` | `./migrations` | Path to migration SQL files |
| `poolMin` | `number` | `1` | Connection pool minimum |
| `poolMax` | `number` | `10` | Connection pool maximum |
| `timeoutMs` | `number` | `30000` | Query timeout (ms) |
| `tables` | `Partial<TableNames>` | all defaults | Table name overrides |
| `retry` | `Partial<RetryConfig>` | `{ maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 10000 }` | Retry config for transient errors |
| `logLevel` | `LogLevel` | `'info'` | Log level |
| `logger` | `Logger` | — | Custom logger (overrides logLevel) |

`SUPABASE_DB_URL` or `DATABASE_URL` supplies `databaseUrl`. When present,
`migrateOnStart` uses the trusted PostgreSQL executor for the same migrations
in local and live environments. This is required for a fresh database before
the `exec_sql` helper exists. Existing databases may use the locked-down RPC
fallback when no direct URL is supplied.

## Database Setup

### 1. Run Migrations

Migrations are in `packages/supabase/migrations/`. The migration system supports both local development and production deployments using a single codepath.

#### Automatic Migration on Startup

Configure your application to run migrations automatically:

```typescript
import { configFromEnv, SupabaseClientFacade } from '@manya-os/supabase';

const config = configFromEnv();
const facade = new SupabaseClientFacade(config, logger);
await facade.ready(); // Waits for migrations to complete
```

#### Manual Migration Execution

For more control over migration timing:

```typescript
import { MigrationRunner, PostgresMigrationExecutor } from '@manya-os/supabase';

// For fresh databases, use the direct PostgreSQL executor
const executor = new PostgresMigrationExecutor(config.databaseUrl!);
const runner = new MigrationRunner(client, logger, './migrations', executor);
const results = await runner.runPending();
await executor.close();
```

#### Environment Configuration

The migration system works with both local and production databases through environment configuration:

```bash
# Local development
SUPABASE_URL=http://localhost:15433
SUPABASE_SERVICE_ROLE_KEY=<local key>
SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:15432/manya_test
SUPABASE_MIGRATE_ON_START=true

# Production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<production key>
SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres
SUPABASE_MIGRATE_ON_START=true
```

**For detailed setup guides:**
- [Local Development Guide](./LOCAL_DEVELOPMENT.md) - Setting up local PostgreSQL and testing
- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT.md) - Production security and deployment best practices

### 2. Schema Overview

### 2. Schema Overview

17 tables across 6 domains plus migration tracking:

| Domain | Tables | Owner |
|---|---|---|
| Ledger | `ledger_events` | `@manya-os/ledger` |
| Memory | `memory_episodic`, `memory_semantic`, `memory_longterm`, `memory_links`, `memory_permissions` | `@manya-os/memory` |
| Attest | `attest_sessions` | `@manya-os/attest` |
| Keyring | `keyring_identities`, `keyring_credentials`, `keyring_role_assignments`, `keyring_kv` | `@manya-os/keyring` |
| Council | `council_debates`, `council_decisions` | `@manya-os/council` |
| Constitution | `constitution_audit` | `@manya-os/constitution` |
| Customs | `customs_reports` | `@manya-os/customs-shield` |
| Migrations | `schema_migrations` | `@manya-os/supabase` |

### 3. Row Level Security

- **Ledger**: Append-only (INSERT + SELECT only, no UPDATE/DELETE)
- **All other tables**: Service-role only
- RLS is enforced at the database level

## Security Model

- **Service-role key** is server-side only. Never expose to clients.
- **No secrets are logged** — all sensitive fields are redacted in structured logging.
- **EncryptedStorage stores only encrypted blobs** — decryption happens at the KeyringWallet layer.
- **`.env` files are gitignored** — use `.env.example` as a template.
- **RLS policies** enforce access control at the database level.

## Testing

### Unit Tests

```bash
npm test -- --testPathPattern=packages/supabase
```

### Integration Tests

Integration tests require a real Supabase/Postgres instance. Two options:

**Option A — Local (no Docker required):**

```bash
# Starts embedded Postgres + Supabase-compatible REST proxy, applies
# migrations, runs all tests, then cleans up:
node scripts/run-integration-tests.js
```

**Option B — Remote Supabase project:**

```bash
# 1. Set up environment
cp packages/supabase/.env.example packages/supabase/.env
# Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

# 2. Run migrations first
# 3. Run integration tests
SUPABASE_INTEGRATION_TEST=true npm test -- --testPathPattern=packages/supabase/tests/integration
```

## Architecture

```
core packages (@manya-os/ledger, memory, keyring, attest)
        |
   store interfaces (LedgerStore, MemoryStore, EncryptedStorage, SessionStore)
        |
   @manya-os/supabase adapters
        |
   SupabaseClientFacade (environment-neutral)
        |
   MigrationRunner (shared migration logic)
        |
   MigrationSqlExecutor (environment-specific)
        ├─ PostgresMigrationExecutor (local/production PostgreSQL)
        └─ Supabase RPC fallback (existing databases)
        |
   Database (local PostgreSQL or production Supabase)
```

### Environment-Neutral Design

The migration and database architecture uses a single codepath for both local and production environments:

- **Environment Configuration**: Reads from environment variables or config objects
- **Shared Migration Logic**: `MigrationRunner` works identically in all environments
- **Environment-Specific Execution**: `MigrationSqlExecutor` adapts to the available database connection
- **Fresh Database Support**: `PostgresMigrationExecutor` for bootstrapping before RPC helpers exist
- **Existing Database Support**: Falls back to Supabase RPC when direct connection unavailable

### Key Components

- Core packages define store interfaces
- In-memory defaults ship with each core package
- `@manya-os/supabase` provides database-backed implementations
- Adapters are injected via config (no hard coupling)
- All adapters include retry logic for transient errors
- Migration system supports both local and production environments

## Failure Behavior

When Supabase is unavailable:
- All adapters throw typed errors (`ConnectionError`, `QueryTimeoutError`, etc.)
- Retry logic handles transient failures (exponential backoff, configurable attempts)
- Core packages continue to work with in-memory defaults if no store is provided

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service-role key |
| `SUPABASE_ANON_KEY` | No | Anonymous key |
| `SUPABASE_MIGRATE_ON_START` | No | Auto-migrate on connection (`true`/`false`) |
| `SUPABASE_MIGRATION_DIR` | No | Custom migration directory |
| `SUPABASE_TIMEOUT_MS` | No | Query timeout in ms |
| `SUPABASE_INTEGRATION_TEST` | No | Enable integration tests (`true`/`false`) |

## License

Apache-2.0. See [LICENSE](../../LICENSE) for details.
