# Database/Migration Backbone Architecture

This document describes the complete database and migration backbone for Manya-OS, explaining how it works consistently across local development and production deployments.

## Overview

The Manya-OS database backbone is designed with a **single migration architecture and codepath** that works in both local and production environments. The environment determines:
- Which database is connected
- Which credentials are used
- Which migration executor is used

The application code remains the same regardless of deployment environment.

## Core Principles

1. **One Migration Architecture**: The same migration files and runner logic work everywhere
2. **Environment-Neutral Configuration**: Environment variables determine database connections
3. **Server-Side Migration Execution**: Migration credentials never reach client-side code
4. **Fresh Database Bootstrap**: Support for initializing completely new databases
5. **Existing Database Support**: Graceful fallback for databases with existing schema
6. **No Hardcoded Secrets**: All credentials come from environment configuration

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Code                          │
│                    (same in all environments)                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Environment Configuration                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Local .env    │  │  Staging .env   │  │ Production .env │ │
│  │  localhost:5432 │  │  staging-db.co  │  │  prod-db.supa  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SupabaseClientFacade                            │
│  - Creates Supabase client with environment credentials          │
│  - Optionally runs migrations on startup                         │
│  - Provides ready() method for initialization waiting           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MigrationRunner (Shared Logic)                  │
│  - Reads migration files from disk                               │
│  - Tracks applied migrations in schema_migrations table          │
│  - Executes pending migrations in order                          │
│  - Handles SQL statement splitting and error recovery            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              MigrationSqlExecutor (Environment-Specific)          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  PostgresMigrationExecutor                               │   │
│  │  - Direct PostgreSQL connection                          │   │
│  │  - Used for fresh databases                               │   │
│  │  - Required before RPC helpers exist                     │   │
│  │  - Server-side only                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           OR                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Supabase RPC Fallback                                    │   │
│  │  - Uses exec_sql/record_migration RPCs                    │   │
│  │  - For existing databases with helpers installed          │   │
│  │  - Requires Supabase client                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Database                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Local Postgres │  │  Staging Supa   │  │  Production Supa│ │
│  │  (embedded or   │  │  (test project) │  │  (live project) │ │
│  │  external)      │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Environment Configuration

**Location**: `packages/supabase/src/config.ts`

The configuration system reads from environment variables or config objects:

```typescript
// From environment variables
const config = configFromEnv();

// From config object
const config = resolveConfig({
  url: 'https://project.supabase.co',
  serviceRoleKey: 'your-service-role-key',
  databaseUrl: 'postgresql://user:pass@host:5432/db',
  migrateOnStart: true,
});
```

**Environment Variables**:
- `SUPABASE_URL`: Supabase project URL (required)
- `SUPABASE_SERVICE_ROLE_KEY`: Service-role key (required, server-side only)
- `SUPABASE_DB_URL` or `DATABASE_URL`: Direct PostgreSQL URL (recommended for migrations)
- `SUPABASE_ANON_KEY`: Anonymous key (optional, client-safe)
- `SUPABASE_MIGRATE_ON_START`: Auto-migrate on connection (default: false)
- `SUPABASE_MIGRATION_DIR`: Custom migration directory (default: ./migrations)

### 2. SupabaseClientFacade

**Location**: `packages/supabase/src/client.ts`

The facade wraps the Supabase client with lifecycle management:

```typescript
const facade = new SupabaseClientFacade(config, logger);
await facade.ready(); // Waits for migrations if migrateOnStart=true
const client = facade.getClient();
```

**Key Features**:
- Creates Supabase client with configured credentials
- Optionally runs migrations on startup
- Provides `ready()` method to wait for initialization
- Manages connection lifecycle (dispose method)
- Supports trusted migration executor for fresh databases

### 3. MigrationRunner

**Location**: `packages/supabase/src/migrations/runner.ts`

Shared migration logic that works in all environments:

```typescript
const runner = new MigrationRunner(
  client,
  logger,
  migrationDir,
  sqlExecutor, // Optional: PostgresMigrationExecutor for fresh databases
);

const status = await runner.status(); // Check migration state
const results = await runner.runPending(); // Apply pending migrations
```

**Key Features**:
- Reads numbered SQL files from migration directory
- Tracks applied migrations in `schema_migrations` table
- Executes pending migrations in order
- Handles SQL statement splitting (supports PL/pgSQL, comments, etc.)
- Supports both direct SQL executor and Supabase RPC fallback
- Idempotent operations (safe to run multiple times)

### 4. PostgresMigrationExecutor

**Location**: `packages/supabase/src/migrations/postgres-executor.ts`

Direct PostgreSQL connection for migration execution:

```typescript
const executor = new PostgresMigrationExecutor(databaseUrl);
await executor.query('CREATE TABLE example (id INTEGER);');
await executor.close();
```

**Key Features**:
- Direct PostgreSQL connection using `pg` library
- Required for fresh databases before RPC helpers exist
- Server-side only (never exposed to clients)
- Explicit lifecycle management (close method)
- Parameterized queries for security

### 5. Migration Files

**Location**: `packages/supabase/migrations/`

Numbered SQL files executed in order:
- `001_initial_schema.sql`: Creates all tables
- `002_rls_policies.sql`: Row-level security policies
- `003_indexes.sql`: Performance indexes
- `004_supabase_helpers.sql`: Supabase-specific RPC functions
- `005_snapshot_transaction.sql`: Snapshot support
- `006_connector_connections.sql`: Connector integration

**Migration Table**:
```sql
CREATE TABLE schema_migrations (
  version    INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  checksum   TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Environment-Specific Flows

### Local Development Flow

**Scenario**: Developer running the application locally with embedded PostgreSQL

```
1. Developer sets local environment variables:
   SUPABASE_URL=http://localhost:15433
   SUPABASE_SERVICE_ROLE_KEY=<local JWT>
   SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:15432/manya_test
   SUPABASE_MIGRATE_ON_START=true

2. Application starts:
   - SupabaseClientFacade created with local credentials
   - PostgresMigrationExecutor created from SUPABASE_DB_URL
   - MigrationRunner initialized with direct SQL executor

3. Fresh database bootstrap:
   - MigrationRunner reads migration files
   - Creates schema_migrations table via direct SQL
   - Executes migrations 001-006 in order
   - Records each migration in schema_migrations

4. Application becomes ready:
   - All migrations applied
   - Database schema current
   - Application ready for use
```

**Tools**:
- `scripts/setup-local-supabase.js`: Automated local environment setup
- `packages/supabase/.env.example`: Template for local configuration
- `packages/supabase/LOCAL_DEVELOPMENT.md`: Detailed local setup guide

### Production Deployment Flow

**Scenario**: Deploying to production Supabase project

```
1. Deployment platform sets production environment variables:
   SUPABASE_URL=https://project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<production service-role key>
   SUPABASE_DB_URL=<private PostgreSQL connection string>
   SUPABASE_MIGRATE_ON_START=true

2. Application starts in production:
   - SupabaseClientFacade created with production credentials
   - PostgresMigrationExecutor created from SUPABASE_DB_URL
   - MigrationRunner initialized with direct SQL executor

3. Production database bootstrap:
   - MigrationRunner reads migration files
   - Creates schema_migrations table via direct SQL
   - Executes migrations 001-006 in order
   - Records each migration in schema_migrations

4. Application becomes ready:
   - All migrations applied
   - Database schema current
   - Application serving production traffic
```

**Tools**:
- `packages/supabase/PRODUCTION_DEPLOYMENT.md`: Production deployment guide
- Environment variable configuration in deployment platform
- Monitoring and logging for migration execution

### Existing Database Flow

**Scenario**: Connecting to a database that already has migrations applied

```
1. Application starts with existing database:
   - SUPABASE_DB_URL may not be set (existing DB has RPC helpers)
   - migrateOnStart=true or false

2. MigrationRunner checks migration state:
   - Reads schema_migrations table via Supabase client
   - Compares with migration files on disk
   - Identifies pending migrations (if any)

3. Pending migrations applied:
   - Uses Supabase RPC (exec_sql, record_migration) if available
   - Falls back to direct SQL if executor provided
   - Records new migrations in schema_migrations

4. No pending migrations:
   - No action taken
   - Application becomes ready immediately
```

## Security Model

### Credential Management

1. **Service-Role Keys**: Server-side only, never exposed to clients
2. **Database URLs**: Server-side only, use private connection strings in production
3. **Anonymous Keys**: Client-safe, used for client-side operations (if needed)
4. **Environment Variables**: All credentials from environment, never hardcoded

### Migration Execution Security

1. **Server-Side Only**: Migration executor never exposed to client code
2. **Trusted Connection**: Uses service-role or direct database connection
3. **No Public SQL Execution**: RPC helpers are protected by RLS policies
4. **Parameterized Queries**: All queries use parameterized execution
5. **Audit Trail**: All migrations recorded in schema_migrations table

### Row-Level Security

The database enforces access control at the table level:
- **Ledger tables**: Append-only (INSERT + SELECT only)
- **Other tables**: Service-role only by default
- **RLS policies**: Enforce access control based on application needs

## Package Structure

### Database-Using Packages

Only one package directly uses the database:

- **@manya-os/supabase**: Database adapters and migration infrastructure

### Core Packages (Database-Agnostic)

Core packages define interfaces but have no database dependencies:

- **@manya-os/ledger**: Defines `LedgerStore` interface
- **@manya-os/memory**: Defines `MemoryStore` interface
- **@manya-os/attest**: Defines `SessionStore` interface
- **@manya-os/keyring**: Defines `EncryptedStorage` interface

These packages work with in-memory defaults by default, and can optionally use database adapters from @manya-os/supabase.

## Testing Strategy

### Unit Tests

- Test migration logic without database connection
- Mock Supabase client and SQL executor
- Test SQL statement splitting and parsing
- Test error handling and recovery

### Integration Tests

- Test against real PostgreSQL/Supabase instance
- Test full migration flow (fresh and existing databases)
- Test adapter implementations (SupabaseLedgerStore, etc.)
- Test environment configuration loading

### Local Testing

```bash
# Automated local environment setup
node scripts/setup-local-supabase.js

# Run integration tests
npm test -- --testPathPattern=packages/supabase/tests/integration
```

### Production Testing

- Test migrations in staging environment first
- Use database snapshots for rollback testing
- Monitor migration execution in production logs
- Have rollback procedures documented

## Migration Lifecycle

### Adding a New Migration

1. Create new SQL file in `packages/supabase/migrations/`
2. Use next sequential number (e.g., `007_new_feature.sql`)
3. Test migration locally with fresh database
4. Test migration rollback (manual procedure)
5. Commit migration file with application code
6. Deploy to staging for verification
7. Deploy to production (automatic or manual migration)

### Migration Best Practices

1. **Idempotent Operations**: Migrations should be safe to run multiple times
2. **Backward Compatible**: Avoid breaking changes that require data migration
3. **Test Thoroughly**: Test with both fresh and existing databases
4. **Document Changes**: Explain what each migration does in comments
5. **Use Transactions**: Wrap related changes in transactions
6. **Add Indexes**: Include performance indexes for new queries

## Troubleshooting

### Migration Fails with "exec_sql RPC not found"

**Cause**: Trying to run migrations on fresh database without direct PostgreSQL connection

**Solution**:
- Set `SUPABASE_DB_URL` or `DATABASE_URL` environment variable
- Use `PostgresMigrationExecutor` when running migrations manually
- Apply migrations manually via SQL Editor first

### Migration Already Applied

**Cause**: Migration recorded in schema_migrations but needs to be re-run

**Solution**:
- Check schema_migrations table for migration state
- Manually remove entry if safe to re-run
- Re-run migration

### Connection Timeout

**Cause**: Database connectivity issues or incorrect credentials

**Solution**:
- Verify database is running and accessible
- Check connection string format
- Increase timeout values if needed
- Check network/firewall settings

## Monitoring and Observability

### Key Metrics

- Migration execution time
- Database connection pool utilization
- Query latency and error rates
- Migration success/failure rates
- Application startup time (including migrations)

### Logging

Configure structured logging for production:

```typescript
const config = configFromEnv({
  logLevel: 'warn', // Reduce verbosity in production
  logger: createLogger('production'), // Custom logger
});
```

### Health Checks

Implement health checks that verify database connectivity:

```typescript
async function healthCheck(facade: SupabaseClientFacade): Promise<boolean> {
  try {
    await facade.ready();
    return await facade.ping();
  } catch {
    return false;
  }
}
```

## Documentation References

- **@manya-os/supabase README**: Package documentation and usage examples
- **Local Development Guide**: Setting up local PostgreSQL and testing
- **Production Deployment Guide**: Production security and deployment best practices
- **Migration Files**: SQL files in `packages/supabase/migrations/`
- **Environment Examples**: `packages/supabase/.env.example`

## Conclusion

The Manya-OS database backbone provides a robust, environment-neutral migration system that works consistently across local development and production deployments. By using a single codepath with environment-specific configuration, it ensures that:

- Developers can test locally with minimal setup
- Production deployments are secure and reliable
- Migration state is tracked and reproducible
- Credentials are never hardcoded or exposed
- The system is maintainable and extensible

This architecture allows the Manya-OS project to scale across different deployment environments while maintaining consistency and security.
