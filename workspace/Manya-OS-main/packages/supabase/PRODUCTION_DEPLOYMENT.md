# Production Deployment Guide for @manya-os/supabase

This guide explains how to deploy the @manya-os/supabase package to production environments with proper security, configuration, and operational best practices.

## Pre-Deployment Checklist

Before deploying to production, ensure you have:

- [ ] A Supabase project (or PostgreSQL database) configured
- [ ] Service-role key and database connection strings
- [ ] Migration strategy planned (automatic vs manual)
- [ ] Environment variables configured in your deployment platform
- [ ] Monitoring and logging configured
- [ ] Backup and recovery procedures documented
- [ ] Security review completed

## Environment Configuration

### Required Environment Variables

```bash
# Supabase project URL
SUPABASE_URL=https://your-project.supabase.co

# Service-role key (server-side only)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Recommended Environment Variables

```bash
# Direct PostgreSQL URL for migrations (recommended for fresh databases)
SUPABASE_DB_URL=postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres

# Alternative: DATABASE_URL (also supported)
# DATABASE_URL=postgresql://user:password@host:5432/database

# Anonymous key (if client-side access is needed)
SUPABASE_ANON_KEY=your-anon-key

# Automatic migration on startup
SUPABASE_MIGRATE_ON_START=true

# Custom migration directory (if needed)
# SUPABASE_MIGRATION_DIR=./migrations

# Query timeout
SUPABASE_TIMEOUT_MS=30000
```

### Getting Credentials from Supabase

1. **Supabase URL**: From your project dashboard (e.g., `https://xyz.supabase.co`)
2. **Service-role key**: Dashboard > Settings > API > service_role (secret)
3. **Anonymous key**: Dashboard > Settings > API > anon/public (public-safe)
4. **Database URL**: Dashboard > Settings > Database > Connection string > URI
   - Use the "Session pooler" or "Direct connection" string
   - Prefer "Direct connection" for migrations
   - Include the password in the connection string

## Deployment Platforms

### Vercel

```bash
# Set environment variables via Vercel CLI
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_DB_URL production
vercel env add SUPABASE_MIGRATE_ON_START production
```

### AWS (ECS, Lambda, etc.)

```bash
# Using AWS Secrets Manager (recommended)
aws secretsmanager create-secret \
  --name manya-os/supabase \
  --secret-string '{"SUPABASE_URL":"...","SUPABASE_SERVICE_ROLE_KEY":"...","SUPABASE_DB_URL":"..."}'

# Reference in task definition or environment
```

### Docker

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
ENV SUPABASE_URL=${SUPABASE_URL}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
ENV SUPABASE_DB_URL=${SUPABASE_DB_URL}
ENV SUPABASE_MIGRATE_ON_START=true
CMD ["node", "index.js"]
```

```bash
# Run with environment variables
docker run -e SUPABASE_URL="..." -e SUPABASE_SERVICE_ROLE_KEY="..." your-app
```

### Kubernetes

```yaml
# ConfigMap for non-sensitive config
apiVersion: v1
kind: ConfigMap
metadata:
  name: supabase-config
data:
  SUPABASE_URL: "https://your-project.supabase.co"
  SUPABASE_MIGRATE_ON_START: "true"
---
# Secret for sensitive data
apiVersion: v1
kind: Secret
metadata:
  name: supabase-secrets
type: Opaque
stringData:
  SUPABASE_SERVICE_ROLE_KEY: "your-service-role-key"
  SUPABASE_DB_URL: "postgresql://..."
---
# Pod specification
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    envFrom:
    - configMapRef:
        name: supabase-config
    - secretRef:
        name: supabase-secrets
```

## Migration Strategy

### Option 1: Automatic Migration on Startup (Recommended)

Configure your application to run migrations automatically when it starts:

```typescript
import { configFromEnv, SupabaseClientFacade } from '@manya-os/supabase';
import { ConsoleLogger } from '@manya-os/supabase';

const config = configFromEnv();
const logger = new ConsoleLogger('info');

const facade = new SupabaseClientFacade(config, logger);
await facade.ready(); // Waits for migrations to complete

console.log('Application ready with migrations applied');
```

**Pros:**
- Zero-downtime deployments
- Automatic schema updates
- Simple configuration

**Cons:**
- Slightly longer startup time
- Requires database access during startup

### Option 2: Manual Migration Before Deployment

Run migrations manually before deploying:

```typescript
import { configFromEnv, SupabaseClientFacade, MigrationRunner, PostgresMigrationExecutor } from '@manya-os/supabase';
import { ConsoleLogger } from '@manya-os/supabase';

const config = configFromEnv();
const logger = new ConsoleLogger('info');

// Create executor for fresh database support
const executor = new PostgresMigrationExecutor(config.databaseUrl!);

const facade = new SupabaseClientFacade(config, logger);
const runner = new MigrationRunner(
  facade.getClient(),
  logger,
  config.migrationDir,
  executor,
);

const results = await runner.runPending();
console.log(`Applied ${results.length} migrations`);

await executor.close();
facade.dispose();
```

**Pros:**
- Controlled migration timing
- Can review migration results before deployment
- Separates migration from application runtime

**Cons:**
- Additional deployment step
- Potential for schema/application version mismatch

### Option 3: Supabase Dashboard

For simple deployments, you can apply migrations manually via the Supabase SQL Editor:

1. Open Supabase Dashboard > SQL Editor
2. Copy migration files from `packages/supabase/migrations/`
3. Execute each migration in order (001, 002, 003, etc.)
4. Verify tables are created correctly

**Pros:**
- No code changes required
- Visual feedback
- Good for one-time setup

**Cons:**
- Manual process
- Error-prone for frequent updates
- Not suitable for automated deployments

## Security Considerations

### Credential Management

1. **Never hardcode credentials** in source code
2. **Use environment variables** for all sensitive data
3. **Rotate credentials regularly** (especially service-role keys)
4. **Use read-only credentials** where possible (e.g., for reporting)
5. **Implement credential rotation** in your deployment pipeline

### Network Security

1. **Use private network connections** where possible
2. **Enable SSL/TLS** for all database connections
3. **Restrict database access** by IP whitelist
4. **Use VPC peering** for cloud providers (AWS, GCP, Azure)
5. **Enable connection pooling** to reduce connection overhead

### Application Security

1. **Never expose service-role keys** to client-side code
2. **Use anonymous keys** for client-side operations (if needed)
3. **Implement row-level security (RLS)** in the database
4. **Validate all inputs** before database operations
5. **Use parameterized queries** (handled by Supabase client)

### Audit and Monitoring

1. **Enable audit logging** in Supabase/PostgreSQL
2. **Monitor migration execution** in application logs
3. **Set up alerts** for failed migrations
4. **Track database performance** metrics
5. **Review access logs** regularly

## Monitoring and Observability

### Application Metrics

Track these metrics in production:

- Migration execution time
- Database connection pool utilization
- Query latency and error rates
- Migration success/failure rates
- Application startup time (including migrations)

### Logging

Configure structured logging for production:

```typescript
import { configFromEnv, SupabaseClientFacade } from '@manya-os/supabase';
import { createLogger } from '@manya-os/supabase';

const config = configFromEnv({
  logLevel: 'warn', // Reduce verbosity in production
  logger: createLogger('production'), // Custom logger for your platform
});

const facade = new SupabaseClientFacade(config, config.logger!);
```

### Health Checks

Implement health checks that verify database connectivity:

```typescript
import { SupabaseClientFacade } from '@manya-os/supabase';

async function healthCheck(facade: SupabaseClientFacade): Promise<boolean> {
  try {
    await facade.ready();
    return await facade.ping();
  } catch {
    return false;
  }
}
```

## Backup and Recovery

### Database Backups

1. **Enable automated backups** in Supabase/PostgreSQL
2. **Test restore procedures** regularly
3. **Document backup retention policies**
4. **Consider point-in-time recovery** for critical data
5. **Backup migration state** (schema_migrations table)

### Disaster Recovery

1. **Document recovery procedures** step-by-step
2. **Test disaster recovery scenarios** quarterly
3. **Maintain off-site backups** for critical data
4. **Plan for database migration** (if provider changes)
5. **Document rollback procedures** for failed deployments

## Performance Optimization

### Connection Pooling

Configure connection pooling for production:

```typescript
const config = configFromEnv({
  poolMin: 5,      // Minimum connections
  poolMax: 20,     // Maximum connections
  timeoutMs: 30000 // Query timeout
});
```

### Query Optimization

1. **Use indexes** defined in migrations (003_indexes.sql)
2. **Monitor slow queries** in Supabase/PostgreSQL
3. **Optimize frequently accessed queries**
4. **Consider read replicas** for read-heavy workloads
5. **Use materialized views** for complex aggregations

### Caching

1. **Cache frequently accessed data** at the application level
2. **Use Supabase edge functions** for distributed caching
3. **Implement cache invalidation** strategies
4. **Monitor cache hit rates**

## Troubleshooting Production Issues

### Migration Failures

**Symptom:** Application fails to start with migration errors

**Diagnosis:**
1. Check migration logs in application output
2. Verify database connectivity
3. Check `schema_migrations` table state
4. Test with a manual migration execution

**Resolution:**
1. Fix the failing migration SQL
2. Manually apply or rollback the migration
3. Restart the application

### Connection Issues

**Symptom:** Database connection timeouts or failures

**Diagnosis:**
1. Check network connectivity
2. Verify credentials are correct
3. Check database is accepting connections
4. Review connection pool configuration

**Resolution:**
1. Increase timeout values
2. Check firewall/security group rules
3. Verify database is not at capacity
4. Restart connection pool if needed

### Performance Issues

**Symptom:** Slow query performance or high latency

**Diagnosis:**
1. Check database query logs
2. Review index usage
3. Monitor connection pool utilization
4. Check for long-running transactions

**Resolution:**
1. Add missing indexes
2. Optimize slow queries
3. Increase connection pool size
4. Implement caching

## Rollback Procedures

### Application Rollback

If a deployment causes issues:

1. **Stop the new deployment**
2. **Restore previous application version**
3. **Verify database compatibility**
4. **Monitor for issues**

### Database Rollback

If migrations need to be reversed:

1. **Identify the problematic migration**
2. **Create a rollback migration** (reverse the changes)
3. **Apply the rollback migration**
4. **Verify data integrity**
5. **Document the incident**

**Note:** The current migration system doesn't support automatic rollbacks. Plan migrations carefully and test thoroughly in staging.

## Compliance and Governance

### Data Governance

1. **Document data retention policies**
2. **Implement data classification** (public, internal, confidential)
3. **Comply with GDPR/CCPA** if handling personal data
4. **Implement data deletion procedures**
5. **Regular security audits**

### Change Management

1. **Document all schema changes**
2. **Require approval for production migrations**
3. **Test migrations in staging** first
4. **Maintain migration audit trail**
5. **Communicate changes** to stakeholders

## Support and Escalation

### Internal Support

1. **Document common issues** and resolutions
2. **Create runbooks** for standard procedures
3. **Train team members** on deployment procedures
4. **Establish on-call rotation** for production issues

### External Support

1. **Supabase support**: https://supabase.com/support
2. **PostgreSQL community**: https://www.postgresql.org/support/
3. **Manya-OS documentation**: [Main README](./README.md)

## Additional Resources

- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/platform-checklist)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Database Security Best Practices](https://owasp.org/www-community/attacks/SQL_Injection)
