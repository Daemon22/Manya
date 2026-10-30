#!/usr/bin/env node
/**
 * @manya-os/supabase — E2E smoke test runner.
 *
 * Proves the full persistence loop:
 *   Manya-OS → Supabase adapter → Postgres → read-back
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Client } = require('pg');
const EmbeddedPostgres = require('embedded-postgres').default;

const ROOT = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'packages', 'supabase', 'migrations');
const TEMP_DIR = path.join(ROOT, '.integration');
const PG_PORT = 15432;
const PROXY_PORT = 15434;
const JWT_SECRET = 'integration-test-secret-manya-os';
const TEST_DB = 'manya_test_smoke';

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

process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('SIGTERM', () => { cleanup(); process.exit(0); });
process.on('exit', cleanup);

async function setupRoles(db) {
  for (const role of ['anon', 'authenticated', 'service_role', 'authenticator']) {
    await db.query(`DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${role}') THEN CREATE ROLE ${role} NOLOGIN; END IF; END $$`);
  }
  await db.query(`GRANT anon TO authenticator`);
  await db.query(`GRANT authenticated TO authenticator`);
  await db.query(`GRANT service_role TO authenticator`);
  await db.query(`CREATE SCHEMA IF NOT EXISTS auth`);
  await db.query(`CREATE OR REPLACE FUNCTION auth.uid() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT COALESCE(current_setting('request.jwt.claims', true)::json->>'sub', '') $$`);
  await db.query(`CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT COALESCE(current_setting('request.jwt.claims', true)::json->>'role', 'anon') $$`);
  await db.query(`GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role`);
}

async function main() {
  console.log('[smoke] === E2E Smoke Test ===');

  const { Client } = require('pg');
  const EmbeddedPostgres = require('embedded-postgres').default;

  let pgRunning = false;
  try {
    const c = new Client({ host: 'localhost', port: PG_PORT, user: 'postgres', password: 'postgres', database: 'postgres' });
    await c.connect(); await c.end();
    pgRunning = true;
    console.log('[smoke] PG already running');
  } catch (e) { /* ignore */ }

  if (!pgRunning) {
    pgInstance = new EmbeddedPostgres({
      database_dir: path.join(TEMP_DIR, 'pgdata'),
      port: PG_PORT, user: 'postgres', password: 'postgres',
    });
    console.log('[smoke] Starting embedded PostgreSQL...');
    try { await pgInstance.initialise(); } catch (e) { /* ignore */ }
    await pgInstance.start();
    console.log('[smoke] PostgreSQL started');
  }

  const admin = new Client({ host: 'localhost', port: PG_PORT, user: 'postgres', password: 'postgres', database: 'postgres' });
  await admin.connect();
  await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, [TEST_DB]);
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await admin.query(`CREATE DATABASE ${TEST_DB}`);
  await admin.end();

  const db = new Client({ host: 'localhost', port: PG_PORT, user: 'postgres', password: 'postgres', database: TEST_DB });
  await db.connect();

  console.log('[smoke] Setting up database...');
  await setupRoles(db);

  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    await db.query(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
  }

  await db.query(`GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, authenticator`);
  await db.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role`);
  await db.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role`);
  await db.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role`);
  await db.end();

  console.log('[smoke] Starting proxy...');
  proxyProc = spawn(process.execPath, [path.join(ROOT, 'scripts', 'supabase-proxy.js')], {
    env: { ...process.env, PORT: String(PROXY_PORT), JWT_SECRET, PG_HOST: 'localhost', PG_PORT: String(PG_PORT), PG_DATABASE: TEST_DB, PG_USER: 'postgres', PG_PASSWORD: 'postgres' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (!await waitForHTTP(PROXY_PORT)) {
    console.error('[smoke] Proxy failed to start');
    cleanup(); process.exit(1);
  }
  console.log('[smoke] Proxy ready on port ' + PROXY_PORT);

  const serviceJWT = generateJWT('service_role');
  console.log('[smoke] Running E2E smoke tests...');

  try {
    execSync('npx jest --config jest.config.js --testPathPattern="e2e-smoke" --no-cache --forceExit', {
      cwd: ROOT, stdio: 'inherit',
      env: { ...process.env, SUPABASE_INTEGRATION_TEST: 'true', SUPABASE_URL: `http://localhost:${PROXY_PORT}`, SUPABASE_SERVICE_ROLE_KEY: serviceJWT },
      timeout: 120000,
    });
    console.log('[smoke] === E2E SMOKE TEST PASSED ===');
  } catch (e) {
    console.error('[smoke] FAILED with code ' + e.status);
    cleanup();
    process.exit(e.status || 1);
  }

  cleanup();
}

main().catch(e => { console.error('[smoke] Fatal: ' + e.message); cleanup(); process.exit(1); });
