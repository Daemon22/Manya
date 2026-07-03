/**
 * Manya CLI — Tests for the HTTP server (serve.js).
 * Boots a real server on a random port, exercises all REST endpoints,
 * and verifies the SSE stream delivers events.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { startServer } from '../src/serve.js';

let serverInfo;
let baseUrl;

async function fetchJson(path, options = {}) {
  const res = await fetch(baseUrl + path, options);
  const body = await res.json();
  return { status: res.status, body };
}

async function fetchText(path, options = {}) {
  const res = await fetch(baseUrl + path, options);
  const body = await res.text();
  return { status: res.status, body };
}

// Boot server once for all tests in this file
test('Serve: boot server', async () => {
  serverInfo = await startServer({ port: 0, host: '127.0.0.1' });
  const address = serverInfo.server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
  assert.ok(baseUrl);
});

// -- Health --
test('Serve: GET /api/health returns ok', async () => {
  const { status, body } = await fetchJson('/api/health');
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.ok(body.ts);
});

// -- Static dashboards --
test('Serve: GET / serves the Live dashboard HTML', async () => {
  const { status, body } = await fetchText('/');
  assert.equal(status, 200);
  assert.ok(body.includes('Manya Live'));
});

test('Serve: GET /weave serves the Weave Live HTML', async () => {
  const { status, body } = await fetchText('/weave');
  assert.equal(status, 200);
  assert.ok(body.includes('Manya Weave'));
});

test('Serve: GET /live serves the Live dashboard HTML', async () => {
  const { status, body } = await fetchText('/live');
  assert.equal(status, 200);
  assert.ok(body.includes('Manya Live'));
});

// -- Mesh endpoints --
test('Serve: GET /api/mesh returns seeded tools', async () => {
  const { status, body } = await fetchJson('/api/mesh');
  assert.equal(status, 200);
  assert.ok(body.count >= 5); // server auto-registers all tools on boot
  assert.ok(body.tools.some(t => t.toolId === 'research-academic'));
});

test('Serve: POST /api/mesh/register rejects unknown tool', async () => {
  const { status, body } = await fetchJson('/api/mesh/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolId: 'nonexistent' }),
  });
  assert.equal(status, 404);
  assert.match(body.error, /Unknown tool/);
});

test('Serve: POST /api/mesh/register rejects duplicate', async () => {
  const { status, body } = await fetchJson('/api/mesh/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolId: 'forge' }),
  });
  assert.equal(status, 409);
  assert.match(body.error, /already registered/);
});

test('Serve: POST /api/mesh/register-all is idempotent', async () => {
  const { status, body } = await fetchJson('/api/mesh/register-all', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(status, 200);
  assert.equal(body.registered.length, 0); // all already registered
});

test('Serve: POST /api/mesh/dispatch invokes capability', async () => {
  const { status, body } = await fetchJson('/api/mesh/dispatch', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ capability: 'citationValidation', method: 'validateDOI', args: ['10.1000/182'] }),
  });
  assert.equal(status, 200);
  assert.equal(body.capability, 'citationValidation');
  assert.equal(body.result.valid, true);
});

test('Serve: POST /api/mesh/dispatch rejects missing fields', async () => {
  const { status, body } = await fetchJson('/api/mesh/dispatch', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ capability: 'x' }),
  });
  assert.equal(status, 400);
});

test('Serve: GET /api/mesh/channels returns sync channels', async () => {
  const { status, body } = await fetchJson('/api/mesh/channels');
  assert.equal(status, 200);
  assert.ok(body.count >= 5);
  const names = body.channels.map(c => c.channel);
  assert.ok(names.includes('citation-verified'));
});

// -- Identity endpoints --
test('Serve: GET /api/identities returns seeded identities', async () => {
  const { status, body } = await fetchJson('/api/identities');
  assert.equal(status, 200);
  assert.ok(body.count >= 3); // server seeds 3 identities
});

test('Serve: POST /api/identities creates a new identity', async () => {
  const { status, body } = await fetchJson('/api/identities', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'orcid', value: '0000-0003-1415-9265', metadata: { name: 'Test User' } }),
  });
  assert.equal(status, 201);
  assert.ok(body.id.startsWith('id-'));
  assert.equal(body.primary.type, 'orcid');
});

test('Serve: POST /api/identities rejects missing fields', async () => {
  const { status, body } = await fetchJson('/api/identities', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'orcid' }),
  });
  assert.equal(status, 400);
});

test('Serve: POST /api/identities/:id/link adds a linked identifier', async () => {
  // Create an identity first
  const create = await fetchJson('/api/identities', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'orcid', value: '0000-0001-0002-0003' }),
  });
  const id = create.body.id;
  const { status, body } = await fetchJson(`/api/identities/${id}/link`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'doi', value: '10.2000/xyz', source: 'research-academic' }),
  });
  assert.equal(status, 200);
  assert.equal(body.linked.length, 1);
  assert.equal(body.linked[0].type, 'doi');
});

test('Serve: GET /api/identities/resolve resolves by type+value', async () => {
  const { status, body } = await fetchJson('/api/identities/resolve?type=orcid&value=0000-0002-1825-0097');
  assert.equal(status, 200);
  assert.equal(body.resolved, true);
  assert.ok(body.identity.id.startsWith('id-'));
});

test('Serve: GET /api/identities/resolve returns resolved=false for unknown', async () => {
  const { status, body } = await fetchJson('/api/identities/resolve?type=orcid&value=0000-0009-9999-9999');
  assert.equal(status, 200);
  assert.equal(body.resolved, false);
});

test('Serve: POST /api/identities/merge consolidates two identities', async () => {
  const a = await fetchJson('/api/identities', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'orcid', value: '0000-0001-1111-1111', metadata: { name: 'A' } }),
  });
  const b = await fetchJson('/api/identities', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'doi', value: '10.3000/aaa', metadata: { affiliation: 'X' } }),
  });
  const { status, body } = await fetchJson('/api/identities/merge', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idA: a.body.id, idB: b.body.id }),
  });
  assert.equal(status, 200);
  assert.ok(body.linked.some(l => l.type === 'doi'));
  assert.equal(body.metadata.name, 'A');
  assert.equal(body.metadata.affiliation, 'X');
});

// -- Bus endpoints --
test('Serve: GET /api/bus/stats returns stats', async () => {
  const { status, body } = await fetchJson('/api/bus/stats');
  assert.equal(status, 200);
  assert.equal(typeof body.eventCount, 'number');
});

test('Serve: POST /api/bus/publish publishes an event', async () => {
  const { status, body } = await fetchJson('/api/bus/publish', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'citation-verified', type: 'test', sourceToolId: 'research-academic', payload: { hello: 'world' } }),
  });
  assert.equal(status, 200);
  assert.equal(body.topic, 'citation-verified');
  assert.ok(body.eventId.startsWith('evt-'));
});

test('Serve: POST /api/bus/route routes via tool sync channels', async () => {
  const { status, body } = await fetchJson('/api/bus/route', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolId: 'research-academic', type: 'review-submitted', payload: { ms: 'ms-001' } }),
  });
  assert.equal(status, 200);
  assert.equal(body.toolId, 'research-academic');
  assert.ok(body.routes.length >= 5); // research-academic has 5 sync channels
});

test('Serve: POST /api/bus/route rejects unknown tool', async () => {
  const { status, body } = await fetchJson('/api/bus/route', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolId: 'nonexistent' }),
  });
  assert.equal(status, 404);
});

// -- Vocabulary endpoints --
test('Serve: GET /api/translate translates HS code to industry', async () => {
  const { status, body } = await fetchJson('/api/translate?from=hs_code&to=industry&value=300490');
  assert.equal(status, 200);
  assert.equal(body.value, 'healthcare');
  assert.equal(body.translated, true);
});

test('Serve: GET /api/translations lists translation pairs', async () => {
  const { status, body } = await fetchJson('/api/translations');
  assert.equal(status, 200);
  assert.ok(body.translations.length >= 8);
});

// -- 404 --
test('Serve: unknown endpoint returns 404', async () => {
  const { status, body } = await fetchJson('/api/nonexistent');
  assert.equal(status, 404);
  assert.match(body.error, /Not found/);
});

// -- SSE event stream --
test('Serve: GET /api/events streams events via SSE', async () => {
  // Open SSE connection
  const res = await fetch(baseUrl + '/api/events');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/event-stream');
  const reader = res.body.getReader();
  // Read the initial connected event
  const { value: firstChunk } = await reader.read();
  const text = new TextDecoder().decode(firstChunk);
  assert.ok(text.includes('event: connected'));
  // Publish an event
  await fetchJson('/api/bus/publish', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'citation-verified', type: 'sse-test', payload: { x: 1 } }),
  });
  // Read the next chunk — should contain the event
  const { value: secondChunk } = await reader.read();
  const text2 = new TextDecoder().decode(secondChunk);
  assert.ok(text2.includes('event: message'));
  assert.ok(text2.includes('citation-verified'));
  await reader.cancel();
});

// -- Shutdown --
test('Serve: shutdown server', async () => {
  await new Promise((resolve) => serverInfo.server.close(resolve));
  assert.ok(true);
});
