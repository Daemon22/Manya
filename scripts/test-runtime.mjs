import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const node = process.execPath;
const token = 'runtime-test-token-012345678901234567890123';

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function request(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  let body;
  try { body = await response.json(); } catch { body = null; }
  return { status: response.status, headers: response.headers, body };
}

const port = await freePort();
const child = spawn(node, ['index.mjs'], {
  cwd: new URL('../runtime/', import.meta.url),
  env: { ...process.env, MANYA_OS_PORT: String(port), MANYA_OS_AUTH_MODE: 'required', MANYA_OS_AUTH_TOKEN: token, MANYA_OS_MAX_BODY_BYTES: '128', MANYA_OS_RATE_LIMIT: '100' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let stderr = '';
child.stderr.on('data', chunk => { stderr += chunk.toString(); });
try {
  await once(child.stdout, 'data');
  const base = `http://127.0.0.1:${port}`;
  const auth = { Authorization: `Bearer ${token}` };
  const health = await request(base, '/api/health');
  assert.equal(health.status, 200);
  const unauthorized = await request(base, '/api/runtime');
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.body.error, 'authentication required');
  const malformedAuth = await request(base, '/api/runtime', { headers: { Authorization: 'Basic secret' } });
  assert.equal(malformedAuth.status, 401);
  const runtime = await request(base, '/api/runtime', { headers: auth });
  assert.equal(runtime.status, 200);
  const malformedJson = await request(base, '/api/reason', { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: '{' });
  assert.equal(malformedJson.status, 400);
  assert.equal(malformedJson.body.error, 'request body must contain valid JSON');
  const emptyBody = await request(base, '/api/reason', { method: 'POST', headers: auth });
  assert.equal(emptyBody.status, 400);
  const invalidSchema = await request(base, '/api/reason', { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: '{}' });
  assert.equal(invalidSchema.status, 400);
  const wrongType = await request(base, '/api/reason', { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ description: 42 }) });
  assert.equal(wrongType.status, 400);
  assert.equal(wrongType.body.error, 'request validation failed');
  assert.ok(wrongType.body.errors.length >= 1);
  const oversized = await request(base, '/api/reason', { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ description: 'x'.repeat(200) }) });
  assert.equal(oversized.status, 413);
  const remember = await request(base, '/api/memory/remember', { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ agent: 'runtime-test', event: 'live validation' }) });
  assert.equal(remember.status, 201);
  const recall = await request(base, '/api/memory/recall?q=validation', { headers: auth });
  assert.equal(recall.status, 200);
  const published = await request(base, '/api/events/publish', { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ topic: 'runtime.test', payload: { ok: true } }) });
  assert.equal(published.status, 202);
  const events = await request(base, '/api/events', { headers: auth });
  assert.equal(events.status, 200);
  const reason = await request(base, '/api/reason', { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ description: 'Create a simple validation plan' }) });
  assert.equal(reason.status, 200);
  assert.ok(reason.body.goal.id);
  assert.equal(reason.body.summary.status, 'achieved');
  assert.equal(reason.body.summary.completed, true);
  assert.ok(reason.body.summary.tasks >= 1);
  assert.ok(reason.body.summary.confidence >= 0 && reason.body.summary.confidence <= 1);
  assert.ok(Array.isArray(reason.body.plan.tasks));
  assert.ok(reason.body.events.some(e => e.type === 'plan_created'));
  assert.ok(reason.body.events.some(e => e.type === 'task_scheduled'));
  assert.ok(reason.body.events.some(e => e.type === 'task_completed'));
  const recalledOutcome = await request(base, '/api/memory/recall?q=Reasoned', { headers: auth });
  assert.equal(recalledOutcome.status, 200);
  assert.ok(recalledOutcome.body.results.some(r => r.record && r.record.event.includes('Reasoned about:')));
  const signals = await request(base, '/api/events', { headers: auth });
  assert.equal(signals.status, 200);
  const reasoningSignals = signals.body.filter(e => e.topic === 'cortex.reasoning.completed');
  assert.ok(reasoningSignals.length >= 1);
  assert.ok(reasoningSignals[0].payload.goalId);
  assert.equal(reasoningSignals[0].payload.completed, true);
  const notFound = await request(base, '/api/unknown', { headers: auth });
  assert.equal(notFound.status, 404);
  const statusBody = runtime.body;
  assert.equal(statusBody.subsystems.governance, true);
  assert.equal(statusBody.subsystems.ledger, true);
  assert.ok(Number.isInteger(statusBody.ledger.chainLength));
  const governance = await request(base, '/api/governance', { headers: auth });
  assert.equal(governance.status, 200);
  assert.equal(governance.body.subject, 'operator');
  assert.ok(Array.isArray(governance.body.auditLog));
  const ledgerState = await request(base, '/api/ledger', { headers: auth });
  assert.equal(ledgerState.status, 200);
  assert.equal(ledgerState.body.verified, true);
  const chainTypes = ledgerState.body.events.map((e) => e.type);
  assert.ok(chainTypes.includes('runtime.started'));
  assert.ok(chainTypes.includes('runtime.memory.remembered'));
  assert.ok(chainTypes.includes('runtime.memory.recalled'));
  assert.ok(chainTypes.includes('runtime.event.published'));
  assert.ok(chainTypes.includes('runtime.reason.completed'));
  console.log('Runtime smoke checks passed');
} finally {
  child.kill('SIGTERM');
  await once(child, 'exit');
  if (stderr) process.stderr.write(stderr);
}

const ratePort = await freePort();
const rateChild = spawn(node, ['index.mjs'], {
  cwd: new URL('../runtime/', import.meta.url),
  env: { ...process.env, MANYA_OS_PORT: String(ratePort), MANYA_OS_AUTH_TOKEN: token, MANYA_OS_RATE_LIMIT: '2', MANYA_OS_RATE_WINDOW_MS: '50' },
  stdio: ['ignore', 'pipe', 'ignore'],
});
try {
  await once(rateChild.stdout, 'data');
  const rateBase = `http://127.0.0.1:${ratePort}`;
  assert.equal((await request(rateBase, '/api/health')).status, 200);
  assert.equal((await request(rateBase, '/api/health')).status, 200);
  const limited = await request(rateBase, '/api/health');
  assert.equal(limited.status, 429);
  await new Promise(resolve => setTimeout(resolve, 75));
  assert.equal((await request(rateBase, '/api/health')).status, 200);
} finally {
  rateChild.kill('SIGTERM');
  await once(rateChild, 'exit');
}
console.log('Rate-limit expiry checks passed');

const govDir = mkdtempSync(join(tmpdir(), 'manya-gov-'));
const govFile = join(govDir, 'governance.json');
writeFileSync(govFile, JSON.stringify({
  permissions: {
    roles: [
      { name: 'limited', permissions: ['runtime:read', 'events:read', 'ledger:read', 'governance:read', 'events:publish'] },
    ],
    assignments: [{ subject: 'operator', role: 'limited' }],
  },
  policies: {
    id: 'runtime-policies',
    name: 'Runtime operational policies',
    policies: [
      {
        id: 'no-event-publishing',
        name: 'No event publishing',
        description: 'Blocks publishing events through the runtime',
        condition: "context.action == 'events:publish'",
        action: 'deny',
        priority: 10,
      },
    ],
  },
}), 'utf8');
const govPort = await freePort();
const govChild = spawn(node, ['index.mjs'], {
  cwd: new URL('../runtime/', import.meta.url),
  env: {
    ...process.env,
    MANYA_OS_PORT: String(govPort),
    MANYA_OS_AUTH_MODE: 'required',
    MANYA_OS_AUTH_TOKEN: token,
    MANYA_OS_GOVERNANCE_FILE: govFile,
    MANYA_OS_RATE_LIMIT: '100',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let govStderr = '';
govChild.stderr.on('data', chunk => { govStderr += chunk.toString(); });
try {
  await once(govChild.stdout, 'data');
  const govBase = `http://127.0.0.1:${govPort}`;
  const govAuth = { Authorization: `Bearer ${token}` };
  const govRuntime = await request(govBase, '/api/runtime', { headers: govAuth });
  assert.equal(govRuntime.status, 200);
  const deniedRemember = await request(govBase, '/api/memory/remember', { method: 'POST', headers: { ...govAuth, 'content-type': 'application/json' }, body: JSON.stringify({ agent: 'gov-test', event: 'blocked' }) });
  assert.equal(deniedRemember.status, 403);
  assert.equal(deniedRemember.body.error, 'forbidden');
  assert.ok(deniedRemember.body.auditId);
  assert.ok(deniedRemember.body.violations.length >= 1);
  const deniedPublish = await request(govBase, '/api/events/publish', { method: 'POST', headers: { ...govAuth, 'content-type': 'application/json' }, body: JSON.stringify({ topic: 'gov.events', payload: { ok: true } }) });
  assert.equal(deniedPublish.status, 403);
  const govLedger = await request(govBase, '/api/ledger', { headers: govAuth });
  assert.equal(govLedger.status, 200);
  assert.equal(govLedger.body.verified, true);
  const deniedEntries = govLedger.body.events.filter(e => e.type === 'runtime.policy.denied');
  assert.ok(deniedEntries.some(e => e.payload.action === 'memory:remember'));
  assert.ok(deniedEntries.some(e => e.payload.action === 'events:publish'));
  const govAudit = await request(govBase, '/api/governance', { headers: govAuth });
  assert.equal(govAudit.status, 200);
  assert.ok(govAudit.body.auditLog.length >= 1);
  console.log('Governance and ledger checks passed');
} finally {
  govChild.kill('SIGTERM');
  await once(govChild, 'exit');
  if (govStderr) process.stderr.write(govStderr);
  rmSync(govDir, { recursive: true, force: true });
}
