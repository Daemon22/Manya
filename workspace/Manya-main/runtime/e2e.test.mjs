import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RUNTIME_DIR = path.dirname(fileURLToPath(import.meta.url));
const MANYA_ROOT = path.resolve(RUNTIME_DIR, '..');
const OS_ROOT = process.env.MANYA_OS_ROOT || path.resolve(MANYA_ROOT, '..', 'Manya-OS');
const OS_AVAILABLE = existsSync(path.join(OS_ROOT, 'runtime', 'index.mjs'))
  && existsSync(path.join(OS_ROOT, 'node_modules', '@manya-os', 'cortex'));

const E2E_TOKEN = 'manya-e2e-token-0123456789abcdef';

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function spawnNode(cwd, env) {
  const child = spawn(process.execPath, ['index.mjs'], { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  child.once('error', (error) => { child.__error = error; });
  return child;
}

async function waitFor(url, { headers = {}, timeoutMs = 15000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { headers });
      if (response.status === 200) return response;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`timeout waiting for ${url}`);
}

function createMcpServer() {
  const calls = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString('utf8'); });
    req.on('end', () => {
      let request;
      try { request = JSON.parse(body); } catch { res.writeHead(400); return res.end('{}'); }
      calls.push(request);
      let result;
      if (request.method === 'initialize') {
        result = { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: { name: 'e2e-mcp', version: '1.0.0' } };
      } else if (request.method === 'tools/list') {
        result = { tools: [{ name: 'GITHUB_GET_REPOSITORY', description: 'read-only' }] };
      } else if (request.method === 'tools/call') {
        result = {
          content: [{ type: 'text', text: `repo ${request.params.arguments.repo} ok` }],
          structuredContent: { name: request.params.arguments.repo, owner: request.params.arguments.owner },
        };
      } else {
        result = {};
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }));
    });
  });
  return { calls, server };
}

const state = {
  os: { proc: null, url: null, skip: !OS_AVAILABLE, reason: 'Manya-OS runtime not built/available for this environment' },
  gateway: { proc: null, url: null },
  unconfigured: { proc: null, url: null },
  mcp: null,
  mcpUrl: null,
};

function childKill(child) {
  if (child && !child.killed) child.kill('SIGTERM');
}

before(async () => {
  const mcpPort = await freePort();
  state.mcp = createMcpServer();
  await new Promise((resolve, reject) => {
    state.mcp.server.once('error', reject);
    state.mcp.server.listen(mcpPort, '127.0.0.1', resolve);
  });
  state.mcpUrl = `http://127.0.0.1:${mcpPort}`;

  if (OS_AVAILABLE) {
    const osPort = await freePort();
    state.os.url = `http://127.0.0.1:${osPort}`;
    state.os.proc = spawnNode(path.join(OS_ROOT, 'runtime'), {
      MANYA_OS_PORT: String(osPort),
      MANYA_OS_AUTH_MODE: 'required',
      MANYA_OS_AUTH_TOKEN: E2E_TOKEN,
      MANYA_OS_RATE_LIMIT: '10000',
    });
    await waitFor(`${state.os.url}/api/health`, { headers: { authorization: `Bearer ${E2E_TOKEN}` } });
  }

  const gwPort = await freePort();
  state.gateway.url = `http://127.0.0.1:${gwPort}`;
  state.gateway.proc = spawnNode(RUNTIME_DIR, {
    MANYA_PORT: String(gwPort),
    MANYA_IDENTITY: 'manya-e2e',
    MANYA_OS_URL: state.os.url || 'http://127.0.0.1:9',
    MANYA_MCP_URL: state.mcpUrl,
  });
  await waitFor(`${state.gateway.url}/api/health`);

  state.unconfigured.url = `http://127.0.0.1:${await freePort()}`;
  state.unconfigured.proc = spawnNode(RUNTIME_DIR, {
    MANYA_PORT: new URL(state.unconfigured.url).port,
    MANYA_IDENTITY: 'manya-e2e',
    MANYA_OS_URL: state.os.url || 'http://127.0.0.1:9',
  });
  await waitFor(`${state.unconfigured.url}/api/health`);
});

after(async () => {
  childKill(state.gateway.proc);
  childKill(state.unconfigured.proc);
  childKill(state.os.proc);
  if (state.mcp) await new Promise((resolve) => state.mcp.server.close(resolve));
  await Promise.all([state.gateway.proc, state.unconfigured.proc, state.os.proc].filter(Boolean).map(
    (child) => new Promise((resolve) => child.once('exit', resolve)),
  ));
});

const capableHeaders = {
  'x-manya-identity': 'manya-e2e',
  'x-manya-capability': 'connectors.github.read',
};

const execute = (base, body, headers = {}) => fetch(`${base}/api/connectors/github/execute`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

test('gateway health reflects the Manya-OS runtime', { skip: state.os.skip }, async () => {
  const response = await fetch(`${state.gateway.url}/api/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.runtime, 'manya');
  assert.equal(body.os.status, 200);
  assert.equal(body.os.body.ok, true);
});

test('unauthenticated OS request is rejected through the gateway proxy', { skip: state.os.skip }, async () => {
  const response = await fetch(`${state.gateway.url}/api/os/api/reason`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ description: 'must be rejected without a token' }),
  });
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.error, 'authentication required');
});

test('authenticated OS reason operation completes through the gateway proxy', { skip: state.os.skip }, async () => {
  const response = await fetch(`${state.gateway.url}/api/os/api/reason`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${E2E_TOKEN}` },
    body: JSON.stringify({ description: 'Manya gateway operating slice proof' }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.summary.status, 'achieved');
  assert.equal(body.summary.completed, true);
  assert.ok(Number.isInteger(body.summary.tasks) && body.summary.tasks >= 1);
  assert.ok(Number.isFinite(body.summary.confidence));
  assert.ok(body.memoryId);
});

test('memory recall round-trips through the gateway proxy', { skip: state.os.skip }, async () => {
  const response = await fetch(`${state.gateway.url}/api/os/api/memory/recall?q=gateway`, {
    headers: { authorization: `Bearer ${E2E_TOKEN}` },
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(Array.isArray(body.results));
  assert.ok(body.results.length >= 1);
  assert.match(body.results[0].record.event, /Reasoned about: Manya gateway operating slice proof/);
});

test('gateway lists registered connectors', async () => {
  const response = await fetch(`${state.gateway.url}/api/connectors`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.identity, 'manya-e2e');
  assert.deepEqual(body.connectors, ['github']);
});

test('github connector status reports configuration and persistence', async () => {
  const response = await fetch(`${state.gateway.url}/api/connectors/github`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.provider, 'github');
  assert.equal(body.identity, 'manya-e2e');
  assert.equal(body.configured, true);
  assert.equal(body.persisted, false);
});

test('connector execution requires identity and capability headers', async () => {
  const denied = await execute(state.gateway.url, { tool: 'GITHUB_GET_REPOSITORY', arguments: { owner: 'demo', repo: 'project' } });
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).error, 'connector capability denied');

  const wrong = await execute(state.gateway.url, { tool: 'GITHUB_GET_REPOSITORY', arguments: {} }, { 'x-manya-identity': 'manya-e2e', 'x-manya-capability': 'connectors.github.write' });
  assert.equal(wrong.status, 403);
  assert.equal((await wrong.json()).error, 'connector capability denied');
});

test('connector rejects unsafe tools and malformed bodies', async () => {
  const unsafe = await execute(state.gateway.url, { tool: 'GITHUB_DELETE_REPOSITORY', arguments: {} }, capableHeaders);
  assert.equal(unsafe.status, 403);
  assert.equal((await unsafe.json()).error, 'only approved GitHub read tools may be executed');

  const malformed = await fetch(`${state.gateway.url}/api/connectors/github/execute`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...capableHeaders },
    body: '{not json',
  });
  assert.equal(malformed.status, 400);
});

test('connector executes an approved read-only tool via MCP and persists the mapping', async () => {
  const response = await execute(state.gateway.url, { tool: 'GITHUB_GET_REPOSITORY', arguments: { owner: 'demo', repo: 'e2e-repo' } }, capableHeaders);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.structuredContent.name, 'e2e-repo');
  assert.equal(body.content[0].text, 'repo e2e-repo ok');
  assert.equal(state.mcp.calls[0].method, 'initialize');
  assert.equal(state.mcp.calls[1].method, 'tools/call');

  const status = await (await fetch(`${state.gateway.url}/api/connectors/github`)).json();
  assert.equal(status.persisted, true);
});

test('unconfigured MCP execution returns a structured 503', async () => {
  const response = await execute(state.unconfigured.url, { tool: 'GITHUB_GET_REPOSITORY', arguments: { owner: 'demo', repo: 'project' } }, capableHeaders);
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /MANYA_MCP_URL/);
});