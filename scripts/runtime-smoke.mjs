#!/usr/bin/env node
/**
 * Runtime wiring smoke test:
 *   1. Boot the OS runtime standalone (no bridge, no supabase) on an ephemeral
 *      port and exercise health, runtime, persistence, collaboration, bridge
 *      status, memory, and bridge-publish (expect 503 when standalone).
 *   2. Boot a @manya-os/bridge relay, restart the runtime with
 *      MANYA_OS_BRIDGE_URL set, verify /api/bridge reports connected, publish
 *      onto the wire, and observe the frame on a relay-side probe client.
 * Exits non-zero on any failure.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import net from 'node:net';
import { createRelay, createBridgeClient } from '@manya-os/bridge';

const RUNTIME = '/home/z/my-project/workspace/Manya-OS-main/runtime/index.mjs';
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const freePort = () => new Promise((resolve) => {
  const srv = net.createServer();
  srv.listen(0, '127.0.0.1', () => { const p = srv.address().port; srv.close(() => resolve(p)); });
});

function bootRuntime(env) {
  const child = spawn(process.execPath, [RUNTIME], {
    env: { ...process.env, MANYA_OS_HOST: '127.0.0.1', MANYA_OS_PORT: String(env.port), ...env.vars },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let bootLog = '';
  child.stdout.on('data', (d) => { bootLog += d; });
  child.stderr.on('data', (d) => { bootLog += d; });
  child.bootLog = () => bootLog;
  return child;
}

async function waitHealth(port, timeoutMs = 20000) {
  const start = Date.now();
  for (;;) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (res.ok) return await res.json();
    } catch { /* not up yet */ }
    if (Date.now() - start > timeoutMs) throw new Error(`runtime did not boot on :${port}`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

// -- Phase 1: standalone boot -------------------------------------------------
const portA = await freePort();
const procA = bootRuntime({ port: portA, vars: {} });
try {
  const health = await waitHealth(portA);
  check('health ok (standalone)', health.ok === true);
  check('subsystems report bridge=false standalone', health.subsystems.bridge === false);
  check('subsystems report persistence=false standalone', health.subsystems.persistence === false);
  check('collaboration queue reported', typeof health.collaboration?.queued === 'number');

  const persistence = await (await fetch(`http://127.0.0.1:${portA}/api/persistence`)).json();
  check('persistence mode in-memory', persistence.mode === 'in-memory');

  const bridgeStatus = await (await fetch(`http://127.0.0.1:${portA}/api/bridge`)).json();
  check('bridge mode standalone', bridgeStatus.mode === 'standalone');

  const collab = await (await fetch(`http://127.0.0.1:${portA}/api/collaboration`)).json();
  check('collaboration endpoint lists zero requests', collab.size === 0 && Array.isArray(collab.requests));

  const remember = await fetch(`http://127.0.0.1:${portA}/api/memory/remember`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ agent: 'smoke', event: 'runtime wiring smoke test' }),
  });
  check('memory remember works with wiring in place', remember.status === 201, `status ${remember.status}`);

  const publish = await fetch(`http://127.0.0.1:${portA}/api/bridge/publish`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ topic: 'smoke.test' }),
  });
  check('bridge publish returns 503 when standalone', publish.status === 503, `status ${publish.status}`);

  const badBody = await fetch(`http://127.0.0.1:${portA}/api/bridge/publish`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nope: true }),
  });
  check('bridge publish validates against contract', badBody.status === 400, `status ${badBody.status}`);
} finally {
  procA.kill('SIGTERM');
}

// -- Phase 2: bridged boot ----------------------------------------------------
const relay = await createRelay({}).start();
const probe = createBridgeClient({ url: relay.url(), identity: { id: 'probe-observer' } });
const seen = [];
probe.onFrame((frame) => { if (frame.type === 'event' && frame.payload?.topic) seen.push(frame); });

const portB = await freePort();
const procB = bootRuntime({ port: portB, vars: { MANYA_OS_BRIDGE_URL: relay.url() } });
try {
  const health = await waitHealth(portB);
  check('health ok (bridged)', health.ok === true);

  for (let i = 0; i < 50 && !seen.length; i++) await new Promise((r) => setTimeout(r, 100));
  const bridgeStatus = await (await fetch(`http://127.0.0.1:${portB}/api/bridge`)).json();
  check('bridge reports connected', bridgeStatus.mode === 'bridged' && bridgeStatus.connected === true,
    `framesIn=${bridgeStatus.stats?.framesIn} framesOut=${bridgeStatus.stats?.framesOut}`);

  for (let i = 0; i < 50 && !seen.some((f) => f.payload.topic === 'runtime.bridge.connected'); i++) {
    await new Promise((r) => setTimeout(r, 100));
  }
  check('runtime.bridge.connected announcement flowed across the wire',
    seen.some((f) => f.payload.topic === 'runtime.bridge.connected'),
    `topics seen: ${[...new Set(seen.map((f) => f.payload.topic))].join(', ') || 'none'}`);

  // Fabric -> bridge -> wire path (distinct from the direct publish path).
  const fabricPub = await fetch(`http://127.0.0.1:${portB}/api/events/publish`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ topic: 'os.fabric-flow', payload: { path: 'fabric-to-wire' } }),
  });
  check('fabric event publish accepted', fabricPub.status === 202, `status ${fabricPub.status}`);

  for (let i = 0; i < 50 && !seen.some((f) => f.payload.topic === 'os.fabric-flow'); i++) {
    await new Promise((r) => setTimeout(r, 100));
  }
  check('fabric event flowed to the wire', seen.some((f) => f.payload.topic === 'os.fabric-flow'));

  const pub = await fetch(`http://127.0.0.1:${portB}/api/bridge/publish`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ topic: 'os.smoke', payload: { from: 'runtime' } }),
  });
  check('bridge publish returns 202 when connected', pub.status === 202, `status ${pub.status}`);
  for (let i = 0; i < 50 && !seen.some((f) => f.payload.topic === 'os.smoke'); i++) await new Promise((r) => setTimeout(r, 100));
  check('published frame observed on the wire', seen.some((f) => f.payload.topic === 'os.smoke'));
} finally {
  await probe.stop();
  await relay.stop();
  procB.kill('SIGTERM');
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
