#!/usr/bin/env node
/**
 * @manya-os/supabase — Local integration test bootstrap.
 *
 * Starts embedded PostgreSQL, downloads PostgREST, applies all migrations,
 * configures roles and JWT, then starts PostgREST to provide a real
 * Supabase-compatible API surface for integration testing.
 *
 * Usage: node scripts/setup-local-supabase.js
 * Sets env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_INTEGRATION_TEST
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'packages', 'supabase', 'migrations');
const TEMP_DIR = path.join(ROOT, '.integration');
const POSTGREST_DIR = path.join(TEMP_DIR, 'postgrest');
const PORT_PG = 15432;
const PORT_POSTGREST = 15433;

// Fixed JWT secret for local integration tests (matches PostgREST config)
const JWT_SECRET = 'integration-test-secret-manya-os';

function log(msg) { console.log(`[setup] ${msg}`); }
function err(msg) { console.error(`[setup:ERROR] ${msg}`); }

async function downloadPostgREST() {
  if (fs.existsSync(path.join(POSTGREST_DIR, 'postgrest.exe'))) {
    log('PostgREST already downloaded');
    return;
  }

  log('Downloading PostgREST...');
  fs.mkdirSync(POSTGREST_DIR, { recursive: true });

  const version = 'v12.2.3';
  const url = `https://github.com/PostgREST/postgrest/releases/download/${version}/postgrest-${version}-windows-x64.tar.xz`;
  const tarball = path.join(TEMP_DIR, 'postgrest.tar.xz');

  try {
    execSync(`curl -L -o "${tarball}" "${url}"`, { stdio: 'pipe', timeout: 120000 });
    // Extract with tar (comes with Windows)
    execSync(`tar -xf "${tarball}" -C "${POSTGREST_DIR}"`, { stdio: 'pipe', cwd: TEMP_DIR });
    log('PostgREST downloaded and extracted');
  } catch (e) {
    err('Failed to download PostgREST: ' + e.message);
    // Try PowerShell download as fallback
    try {
      execSync(`powershell -Command "Invoke-WebRequest -Uri '${url}' -OutFile '${tarball}'"`, { stdio: 'pipe', timeout: 120000 });
      execSync(`tar -xf "${tarball}" -C "${POSTGREST_DIR}"`, { stdio: 'pipe' });
      log('PostgREST downloaded via PowerShell');
    } catch (e2) {
      err('Failed to download PostgREST via PowerShell: ' + e2.message);
      throw new Error('Cannot download PostgREST');
    }
  }
}

async function startPostgreSQL() {
  const EmbeddedPostgres = require('embedded-postgres').default;
  const pg = new EmbeddedPostgres({
    database_dir: path.join(TEMP_DIR, 'pgdata'),
    port: PORT_PG,
    user: 'postgres',
    password: 'postgres',
  });

  // Check if already running
  try {
    const { Client } = require('pg');
    const testClient = new Client({ host: 'localhost', port: PORT_PG, user: 'postgres', password: 'postgres' });
    await testClient.connect();
    await testClient.end();
    log('PostgreSQL already running on port ' + PORT_PG);
    return pg;
  } catch {
    // Not running, start it
  }

  log('Starting embedded PostgreSQL on port ' + PORT_PG + '...');
  try {
    await pg.initialise();
  } catch (e) {
    // May already be initialized
    log('PG init: ' + (e.message || 'already initialized'));
  }
  await pg.start();
  log('PostgreSQL started');

  // Create the integration test database
  const { Client } = require('pg');
  const adminClient = new Client({ host: 'localhost', port: PORT_PG, user: 'postgres', password: 'postgres' });
  await adminClient.connect();

  // Create database if it doesn't exist
  const dbCheck = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = 'manya_test'");
  if (dbCheck.rows.length === 0) {
    await adminClient.query('CREATE DATABASE manya_test');
    log('Created database: manya_test');
  }

  await adminClient.end();
  return pg;
}

async function setupRoles(dbClient) {
  log('Setting up Supabase-compatible roles...');

  // Create roles that Supabase expects
  const roles = [
    // Supabase uses 'anon' for anonymous/unauthenticated requests
    `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF; END $$`,
    // 'authenticated' for authenticated users
    `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$`,
    // 'service_role' for server-side operations
    `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF; END $$`,
    // 'authenticator' is the role PostgREST connects as
    `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN CREATE ROLE authenticator NOLOGIN; END IF; END $$`,
  ];

  for (const sql of roles) {
    await dbClient.query(sql);
  }

  // Grant usage and create privileges
  await dbClient.query(`GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, authenticator`);
  await dbClient.query(`GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role`);
  await dbClient.query(`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role`);
  await dbClient.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticator`);
  await dbClient.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticator`);
  await dbClient.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role`);
  await dbClient.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon`);
  await dbClient.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated`);
  await dbClient.query(`GRANT anon TO authenticator`);
  await dbClient.query(`GRANT authenticated TO authenticator`);
  await dbClient.query(`GRANT service_role TO authenticator`);

  log('Roles configured');
}

async function createAuthSchema(dbClient) {
  log('Creating auth schema for Supabase compatibility...');

  // Create auth schema
  await dbClient.query(`CREATE SCHEMA IF NOT EXISTS auth`);

  // auth.uid() — returns the user ID from the JWT
  // PostgREST sets current_setting('request.jwt.claims') when a JWT is provided
  await dbClient.query(`
    CREATE OR REPLACE FUNCTION auth.uid()
    RETURNS TEXT
    LANGUAGE sql
    STABLE
    AS $$
      SELECT COALESCE(
        current_setting('request.jwt.claims', true)::json->>'sub',
        ''
      )
    $$;
  `);

  // auth.role() — returns the role from the JWT
  await dbClient.query(`
    CREATE OR REPLACE FUNCTION auth.role()
    RETURNS TEXT
    LANGUAGE sql
    STABLE
    AS $$
      SELECT COALESCE(
        current_setting('request.jwt.claims', true)::json->>'role',
        'anon'
      )
    $$;
  `);

  // Grant usage on auth schema
  await dbClient.query(`GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role`);

  log('Auth schema created');
}

async function applyMigrations(dbClient) {
  log('Applying migrations...');

  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    try {
      await dbClient.query(sql);
      log(`  Applied: ${file}`);
    } catch (e) {
      err(`  Failed: ${file} — ${e.message}`);
      throw e;
    }
  }

  log(`Applied ${migrationFiles.length} migrations`);
}

function generateJWT(role, expiresIn = '365d') {
  const jwt = require('jsonwebtoken');
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    role: role,
    iss: 'supabase',
    iat: now,
    exp: now + 365 * 24 * 3600,
    aud: 'authenticated',
  };
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
}

function waitForPostgREST(port, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const req = http.get(`http://localhost:${port}/`, (res) => {
        // PostgREST returns 200 on root
        resolve(true);
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error('PostgREST startup timeout'));
        } else {
          setTimeout(check, 500);
        }
      });
      req.setTimeout(1000);
    };
    check();
  });
}

async function startPostgREST(databaseUrl) {
  log('Starting PostgREST...');

  const postgrestBin = path.join(POSTGREST_DIR, 'postgrest.exe');
  if (!fs.existsSync(postgrestBin)) {
    // Check for other possible names
    const files = fs.readdirSync(POSTGREST_DIR);
    const bin = files.find(f => f.startsWith('postgrest'));
    if (!bin) {
      throw new Error('PostgREST binary not found in ' + POSTGREST_DIR + ': ' + files.join(', '));
    }
    return startPostgRESTProcess(path.join(POSTGREST_DIR, bin), databaseUrl);
  }
  return startPostgRESTProcess(postgrestBin, databaseUrl);
}

function startPostgRESTProcess(binPath, databaseUrl) {
  return new Promise((resolve, reject) => {
    const anonJWT = generateJWT('anon');
    const dbSchema = 'public';

    const config = `db-uri = "${databaseUrl}"
db-schemas = "${dbSchema}"
db-anon-role = "anon"
server-port = ${PORT_POSTGREST}
server-host = "127.0.0.1"
jwt-secret = "${JWT_SECRET}"
jwt-role-claim-key = "role"
db-pool = 10
`;

    const configFile = path.join(TEMP_DIR, 'postgrest.conf');
    fs.writeFileSync(configFile, config);

    log(`PostgREST config written to ${configFile}`);
    log(`Database URL: ${databaseUrl.replace(/:[^@]+@/, ':***@')}`);
    log(`JWT Secret: [REDACTED]`);

    const proc = spawn(binPath, [configFile], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    proc.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) log('[postgrest] ' + msg);
    });

    proc.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) log('[postgrest:err] ' + msg);
    });

    proc.on('error', (e) => {
      err('PostgREST failed to start: ' + e.message);
      reject(e);
    });

    proc.on('exit', (code) => {
      if (code && code !== 0 && code !== null) {
        err('PostgREST exited with code ' + code);
      }
    });

    // Wait for PostgREST to be ready
    waitForPostgREST(PORT_POSTGREST)
      .then(() => {
        log('PostgREST is ready on port ' + PORT_POSTGREST);
        resolve({ proc, anonJWT });
      })
      .catch(reject);
  });
}

async function main() {
  log('=== Manya-OS Local Supabase Bootstrap ===');
  log('');

  // Step 1: Start PostgreSQL
  const pg = await startPostgreSQL();

  // Step 2: Connect and set up
  const { Client } = require('pg');
  const dbClient = new Client({
    host: 'localhost',
    port: PORT_PG,
    user: 'postgres',
    password: 'postgres',
    database: 'manya_test',
  });
  await dbClient.connect();

  try {
    // Step 3: Set up roles
    await setupRoles(dbClient);

    // Step 4: Create auth schema
    await createAuthSchema(dbClient);

    // Step 5: Apply migrations
    await applyMigrations(dbClient);

    // Step 6: Verify schema
    log('');
    log('Verifying schema...');
    const tables = await dbClient.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `);
    log(`Tables created: ${tables.rows.map(r => r.tablename).join(', ')}`);

    const functions = await dbClient.query(`
      SELECT routine_name FROM information_schema.routines
      WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
      ORDER BY routine_name
    `);
    log(`Functions created: ${functions.rows.map(r => r.routine_name).join(', ')}`);

    const rls = await dbClient.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true ORDER BY tablename
    `);
    log(`RLS-enabled tables: ${rls.rows.map(r => r.tablename).join(', ')}`);
  } finally {
    await dbClient.end();
  }

  // Step 7: Download and start PostgREST
  try {
    await downloadPostgREST();
  } catch (e) {
    err('PostgREST download failed: ' + e.message);
    log('');
    log('Falling back to direct PostgreSQL integration test mode...');
    log('');

    // Write environment for direct pg-based testing
    const envFile = path.join(TEMP_DIR, '.env.integration');
    const envContent = `SUPABASE_INTEGRATION_TEST=true
SUPABASE_URL=http://localhost:${PORT_POSTGREST}
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTczMTUzNjAwMCwiYXVkIjoiYXV0aGVudGljYXRlZCJ9.${crypto.createHmac('sha256', 'fallback').update('service_role').digest('base64')}
PG_HOST=localhost
PG_PORT=${PORT_PG}
PG_DATABASE=manya_test
PG_USER=postgres
PG_PASSWORD=postgres
`;
    fs.writeFileSync(envFile, envContent);
    log('PostgreSQL is running on port ' + PORT_PG);
    log('Environment written to ' + envFile);
    log('');
    log('PostgreSQL is available for direct SQL testing.');
    log('The integration tests require PostgREST which could not be downloaded.');
    process.exit(2);
  }

  const serviceJWT = generateJWT('service_role');
  const anonJWT = generateJWT('anon');

  const databaseUrl = `postgresql://postgres:postgres@localhost:${PORT_PG}/manya_test`;

  let postgrestProc;
  try {
    const result = await startPostgREST(databaseUrl);
    postgrestProc = result.proc;
  } catch (e) {
    err('PostgREST failed: ' + e.message);
    process.exit(1);
  }

  // Step 8: Write environment file
  const envFile = path.join(TEMP_DIR, '.env.integration');
  const envContent = `SUPABASE_INTEGRATION_TEST=true
SUPABASE_URL=http://localhost:${PORT_POSTGREST}
SUPABASE_SERVICE_ROLE_KEY=${serviceJWT}
SUPABASE_ANON_KEY=${anonJWT}
PG_HOST=localhost
PG_PORT=${PORT_PG}
PG_DATABASE=manya_test
PG_USER=postgres
PG_PASSWORD=postgres
POSTGREST_PID=${postgrestProc.pid}
`;
  fs.writeFileSync(envFile, envContent);

  log('');
  log('=== Integration Test Environment Ready ===');
  log(`PostgreSQL: localhost:${PORT_PG}/manya_test`);
  log(`PostgREST:  http://localhost:${PORT_POSTGREST}`);
  log(`SUPABASE_URL=http://localhost:${PORT_POSTGREST}`);
  log(`SUPABASE_SERVICE_ROLE_KEY=${serviceJWT.substring(0, 20)}...`);
  log(`Environment file: ${envFile}`);
  log('');
  log('Run integration tests:');
  log(`  node -e "require('dotenv').config({path:'${envFile.replace(/\\/g, '/')}'}); require('child_process').execSync('npx jest --config jest.config.js --testPathPattern=packages/supabase', {stdio:'inherit', env:process.env})"`);
  log('');

  // Keep alive - write PID for cleanup
  process.on('SIGINT', () => {
    log('Shutting down...');
    if (postgrestProc) postgrestProc.kill();
    process.exit(0);
  });

  // Export vars for child processes
  process.env.SUPABASE_INTEGRATION_TEST = 'true';
  process.env.SUPABASE_URL = `http://localhost:${PORT_POSTGREST}`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceJWT;
  process.env.SUPABASE_ANON_KEY = anonJWT;

  // Keep the process alive
  log('Bootstrap complete. Process will stay alive to keep PostgREST running.');
  log('Press Ctrl+C to stop.');
}

main().catch(e => {
  err('Bootstrap failed: ' + e.message);
  process.exit(1);
});
