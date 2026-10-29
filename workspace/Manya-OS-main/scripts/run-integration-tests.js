#!/usr/bin/env node
/**
 * @manya-os/supabase — Full local integration test runner.
 *
 * 1. Starts embedded PostgreSQL
 * 2. Sets up roles, auth schema, migrations
 * 3. Starts Node.js Supabase-compatible REST proxy
 * 4. Runs integration tests
 * 5. Cleans up
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');

const ROOT = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'packages', 'supabase', 'migrations');
const TEMP_DIR = path.join(ROOT, '.integration');
const PROXY_SCRIPT = path.join(__dirname, 'supabase-proxy.js');
const PG_PORT = 15432;
const PROXY_PORT = 15433;
const JWT_SECRET = 'integration-test-secret-manya-os';
const TEST_DB = 'manya_test';

function log(msg) { console.log(`[it] ${msg}`); }
function err(msg) { console.error(`[it:ERR] ${msg}`); }

function generateJWT(role) {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign({ role, iss: 'supabase', iat: now, exp: now + 365 * 86400, aud: 'authenticated' }, JWT_SECRET, { algorithm: 'HS256' });
}

async function waitForHTTP(port, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/`, { timeout: 2000 }, (res) => { res.resume(); resolve(); });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      });
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 300));
    }
  }
  return false;
}

let proxyProc = null;
let pgInstance = null;

function cleanup() {
  if (proxyProc) { try { proxyProc.kill(); } catch (e) { /* ignore */ } proxyProc = null; }
  if (pgInstance) { try { pgInstance.stop(); } catch (e) { /* ignore */ } pgInstance = null; }
}

async function setupRoles(db) {
  for (const role of ['anon', 'authenticated', 'service_role', 'authenticator']) {
    await db.query(`DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${role}') THEN CREATE ROLE ${role} NOLOGIN; END IF; END $$`);
  }
  await db.query(`GRANT anon TO authenticator`);
  await db.query(`GRANT authenticated TO authenticator`);
  await db.query(`GRANT service_role TO authenticator`);
  await db.query(`CREATE SCHEMA IF NOT EXISTS auth`);
  await db.query(`CREATE OR REPLACE FUNCTION auth.uid() RETURNS TEXT LANGUAGE sql STABLE AS $$
    SELECT COALESCE(current_setting('request.jwt.claims', true)::json->>'sub', '') $$`);
  await db.query(`CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$
    SELECT COALESCE(current_setting('request.jwt.claims', true)::json->>'role', 'anon') $$`);
  await db.query(`GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role`);
}

async function grantRuntimePrivileges(db) {
  await db.query(`GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, authenticator`);
  await db.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role`);
  await db.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role`);
  await db.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role`);
  await db.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role`);
  await db.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO service_role`);
  await db.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role`);
}

process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('SIGTERM', () => { cleanup(); process.exit(0); });
process.on('exit', cleanup);

async function main() {
  log('=== Manya-OS Integration Test Runner ===');

  // ── Step 1: Start PostgreSQL ──
  const { Client } = require('pg');
  const EmbeddedPostgres = require('embedded-postgres').default;

  let pgRunning = false;
  try {
    const c = new Client({ host: 'localhost', port: PG_PORT, user: 'postgres', password: 'postgres', database: 'postgres' });
    await c.connect(); await c.end();
    pgRunning = true;
    log('PostgreSQL already running on port ' + PG_PORT);
  } catch { /* not running */ }

  if (!pgRunning) {
    pgInstance = new EmbeddedPostgres({
      database_dir: path.join(TEMP_DIR, 'pgdata'),
      port: PG_PORT, user: 'postgres', password: 'postgres',
    });
    log('Starting embedded PostgreSQL...');
    try { await pgInstance.initialise(); } catch (e) { /* ok */ }
    await pgInstance.start();
    log('PostgreSQL started on port ' + PG_PORT);
  }

  // ── Step 2: Setup database ──
  const admin = new Client({ host: 'localhost', port: PG_PORT, user: 'postgres', password: 'postgres', database: 'postgres' });
  await admin.connect();
  await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, [TEST_DB]);
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await admin.query(`CREATE DATABASE ${TEST_DB}`);
  log(`Recreated ${TEST_DB}`);
  await admin.end();

  const db = new Client({ host: 'localhost', port: PG_PORT, user: 'postgres', password: 'postgres', database: TEST_DB });
  await db.connect();

  log('Setting up database from scratch...');
  await setupRoles(db);
  await grantRuntimePrivileges(db);
  // ── Step 3: Start Supabase REST proxy ──
  log('Starting Supabase REST proxy on port ' + PROXY_PORT + '...');
  proxyProc = spawn(process.execPath, [PROXY_SCRIPT], {
    env: {
      ...process.env,
      PORT: String(PROXY_PORT),
      JWT_SECRET,
      PG_HOST: 'localhost',
      PG_PORT: String(PG_PORT),
      PG_DATABASE: TEST_DB,
      PG_USER: 'postgres',
      PG_PASSWORD: 'postgres',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  proxyProc.stdout.on('data', d => { const m = d.toString().trim(); if (m) log('[proxy] ' + m); });
  proxyProc.stderr.on('data', d => { const m = d.toString().trim(); if (m) log('[proxy:err] ' + m); });
  proxyProc.on('exit', (code) => { log('[proxy] exited ' + code); });

  if (!await waitForHTTP(PROXY_PORT)) {
    err('Proxy failed to start');
    cleanup();
    process.exit(1);
  }
  log('Proxy is ready');

  // ── Step 4: Run integration tests ──
  const serviceJWT = generateJWT('service_role');
  const anonJWT = generateJWT('anon');
  execSync(`"${process.execPath}" scripts/build-package.js supabase`, { cwd: ROOT, stdio: 'inherit' });
  const { SupabaseClientFacade, SilentLogger } = require(path.join(ROOT, 'packages', 'supabase', 'dist', 'cjs', 'index.js'));
  const facade = new SupabaseClientFacade({
    url: `http://localhost:${PROXY_PORT}`,
    serviceRoleKey: serviceJWT,
    migrateOnStart: true,
    migrationDir: MIGRATIONS_DIR,
    migrationExecutor: db,
    poolMin: 1,
    poolMax: 1,
    timeoutMs: 30000,
    tables: {},
    retry: { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 1 },
    logLevel: 'silent',
  }, new SilentLogger());
  await facade.ready();
  await grantRuntimePrivileges(db);

  const tables = await db.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  log('Tables (' + tables.rows.length + '): ' + tables.rows.map(r => r.tablename).join(', '));
  const fns = await db.query("SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION' ORDER BY routine_name");
  log('Functions (' + fns.rows.length + '): ' + fns.rows.map(r => r.routine_name).join(', '));
  const rls = await db.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true");
  log('RLS (' + rls.rows.length + '): ' + rls.rows.map(r => r.tablename).join(', '));
  facade.dispose();
  await db.end();
  const envVars = {
    ...process.env,
    SUPABASE_INTEGRATION_TEST: 'true',
    SUPABASE_URL: `http://localhost:${PROXY_PORT}`,
    SUPABASE_SERVICE_ROLE_KEY: serviceJWT,
    SUPABASE_ANON_KEY: anonJWT,
  };

  log('');
  log('Running integration tests...');
  log('');

  try {
    execSync(`npx jest --config jest.config.js --testPathPattern="packages/supabase" --no-cache --forceExit --runInBand`, {
      cwd: ROOT, stdio: 'inherit', env: envVars, timeout: 120000,
    });
    log('');
    log('=== ALL INTEGRATION TESTS PASSED ===');
  } catch (e) {
    log('');
    err('Tests exited with code ' + e.status);
    cleanup();
    process.exit(e.status || 1);
  }

  cleanup();
}

main().catch(e => { err('Fatal: ' + e.message); cleanup(); process.exit(1); });
