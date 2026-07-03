/**
 * Manya CLI — HTTP server with REST API + SSE event stream.
 *
 * Boots an HTTP server that exposes the unify mesh, federation, and event
 * bus via REST endpoints, streams events in real time via Server-Sent
 * Events (SSE), and serves the Weave and Live dashboards.
 *
 * Endpoints:
 *   GET    /                          → Manya Live dashboard (HTML)
 *   GET    /weave                     → Manya Weave visualization (HTML)
 *   GET    /api/mesh                  → list registered tools
 *   POST   /api/mesh/register         → register a tool by id
 *   POST   /api/mesh/register-all     → register all known tools
 *   POST   /api/mesh/dispatch         → dispatch a capability call
 *   GET    /api/mesh/channels         → list sync channels
 *   GET    /api/identities            → list federated identities
 *   POST   /api/identities            → create an identity
 *   POST   /api/identities/:id/link   → link an identifier
 *   GET    /api/identities/resolve    → resolve by ?type=&value=
 *   POST   /api/identities/merge      → merge two identities
 *   GET    /api/bus/stats             → bus statistics
 *   POST   /api/bus/publish           → publish an event
 *   POST   /api/bus/route             → route via a tool's sync channels
 *   GET    /api/translate             → translate ?from=&to=&value=
 *   GET    /api/translations          → list supported translation pairs
 *   GET    /api/events                → SSE stream of live events
 *   GET    /api/health                → health check
 */

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  registerTool,
  listTools,
  dispatch,
  getSyncChannels,
  _resetMesh,
  createIdentity,
  linkIdentity,
  resolveIdentity,
  mergeIdentities,
  listIdentities,
  _resetFederation,
  _hydrateIdentities,
  createBus,
  subscribe,
  publish,
  routeEvent,
  busStats,
  translate,
  listTranslations,
} from '@manya/unify';

import { getToolDef, knownToolIds, allToolDefs } from './registry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Creates and starts the Manya HTTP server.
 * @param {object} [options]
 * @param {number} [options.port=3100] - Port to listen on.
 * @param {string} [options.host='0.0.0.0'] - Host to bind.
 * @param {boolean} [options.autoRegister=true] - Whether to register all tools on startup.
 * @param {boolean} [options.seedIdentities=true] - Whether to seed sample identities.
 * @param {object} [options.bus] - Pre-existing event bus (otherwise created).
 * @returns {Promise<{ server: import('node:http').Server, url: string, bus: object }>}
 */
export async function startServer(options = {}) {
  const port = options.port || 3100;
  const host = options.host || '0.0.0.0';

  // Single shared event bus for the server's lifetime
  const bus = options.bus || createBus({ replay: true, maxHistory: 1000 });

  // Auto-register all tools
  if (options.autoRegister !== false) {
    _resetMesh();
    for (const def of allToolDefs()) {
      try {
        const api = await def.apiLoader();
        registerTool({ manifest: def.manifest, api });
      } catch (err) { /* skip tools that can't load */ }
    }
  }

  // Seed sample identities for demo purposes
  if (options.seedIdentities !== false) {
    _resetFederation();
    const jc = createIdentity({ type: 'orcid', value: '0000-0002-1825-0097', metadata: { name: 'Josiah Carberry' } });
    linkIdentity(jc.id, { type: 'doi', value: '10.1000/182', source: 'research-academic' });
    linkIdentity(jc.id, { type: 'email', value: 'j.carberry@brown.edu', source: 'pulse' });
    const mit = createIdentity({ type: 'ror', value: '0454n3r47', metadata: { name: 'Massachusetts Institute of Technology' } });
    linkIdentity(mit.id, { type: 'doi', value: '10.1038/nature12373', source: 'research-academic' });
    const vessel = createIdentity({ type: 'imo', value: '9074729', metadata: { name: 'MV Ever Given' } });
    linkIdentity(vessel.id, { type: 'container', value: 'MSCU6639870', source: 'transport-logistics' });
  }

  // SSE clients
  const sseClients = new Set();

  // Subscribe to ALL sync channels so events flow to SSE clients
  const allChannels = new Set();
  for (const def of allToolDefs()) {
    for (const ch of def.manifest.syncChannels || []) allChannels.add(ch);
  }
  for (const channel of allChannels) {
    subscribe(bus, channel, (event) => {
      broadcastSse(sseClients, event);
    });
  }

  const server = createServer(async (req, res) => {
    try {
      await handleRequest(req, res, { bus, sseClients });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
  });

  return new Promise((resolve) => {
    server.listen(port, host, () => {
      resolve({ server, url: `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`, bus });
    });
  });
}

/**
 * Handles a single HTTP request.
 */
async function handleRequest(req, res, ctx) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;
  const method = req.method;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // -- Static files --
  if (path === '/' && method === 'GET') return serveHtml(res, getDashboardPath('manya-live.html'));
  if (path === '/weave' && method === 'GET') return serveHtml(res, getDashboardPath('manya-weave-live.html'));
  if (path === '/live' && method === 'GET') return serveHtml(res, getDashboardPath('manya-live.html'));

  // -- Health --
  if (path === '/api/health' && method === 'GET') return sendJson(res, 200, { ok: true, ts: new Date().toISOString() });

  // -- SSE event stream --
  if (path === '/api/events' && method === 'GET') return startSse(req, res, ctx.sseClients);

  // -- Mesh endpoints --
  if (path === '/api/mesh' && method === 'GET') return sendJson(res, 200, { count: listTools().length, tools: listTools() });
  if (path === '/api/mesh/register' && method === 'POST') {
    const body = await readBody(req);
    const toolId = body.toolId;
    if (!toolId) return sendJson(res, 400, { error: 'toolId is required' });
    const def = getToolDef(toolId);
    if (!def) return sendJson(res, 404, { error: `Unknown tool: ${toolId}. Known: ${knownToolIds().join(', ')}` });
    if (listTools().some(t => t.toolId === toolId)) return sendJson(res, 409, { error: `Tool ${toolId} already registered` });
    const api = await def.apiLoader();
    registerTool({ manifest: def.manifest, api });
    return sendJson(res, 201, { registered: toolId, owns: def.manifest.owns, syncChannels: def.manifest.syncChannels });
  }
  if (path === '/api/mesh/register-all' && method === 'POST') {
    const registered = [];
    for (const def of allToolDefs()) {
      if (listTools().some(t => t.toolId === def.id)) continue;
      try {
        const api = await def.apiLoader();
        registerTool({ manifest: def.manifest, api });
        registered.push(def.id);
      } catch (err) { /* skip */ }
    }
    return sendJson(res, 200, { registered, totalRegistered: listTools().length });
  }
  if (path === '/api/mesh/dispatch' && method === 'POST') {
    const body = await readBody(req);
    if (!body.capability || !body.method) return sendJson(res, 400, { error: 'capability and method are required' });
    try {
      const args = Array.isArray(body.args) ? body.args : [];
      const result = dispatch(body.capability, body.method, args);
      return sendJson(res, 200, { capability: body.capability, method: body.method, args, result });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }
  if (path === '/api/mesh/channels' && method === 'GET') {
    const channels = getSyncChannels();
    return sendJson(res, 200, { count: channels.length, channels });
  }

  // -- Identity endpoints --
  if (path === '/api/identities' && method === 'GET') {
    const ids = listIdentities();
    return sendJson(res, 200, { count: ids.length, identities: ids });
  }
  if (path === '/api/identities' && method === 'POST') {
    const body = await readBody(req);
    if (!body.type || !body.value) return sendJson(res, 400, { error: 'type and value are required' });
    try {
      const id = createIdentity({ type: body.type, value: body.value, metadata: body.metadata || {} });
      return sendJson(res, 201, id);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }
  if (path.startsWith('/api/identities/') && path.endsWith('/link') && method === 'POST') {
    const identityId = path.split('/')[3];
    const body = await readBody(req);
    if (!body.type || !body.value) return sendJson(res, 400, { error: 'type and value are required' });
    try {
      const linkInput = { type: body.type, value: body.value };
      if (body.confidence !== undefined) linkInput.confidence = body.confidence;
      if (body.source) linkInput.source = body.source;
      const id = linkIdentity(identityId, linkInput);
      return sendJson(res, 200, id);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }
  if (path === '/api/identities/resolve' && method === 'GET') {
    const type = url.searchParams.get('type');
    const value = url.searchParams.get('value');
    if (!type || !value) return sendJson(res, 400, { error: 'type and value query params are required' });
    const id = resolveIdentity(type, value);
    return sendJson(res, 200, { resolved: !!id, identity: id });
  }
  if (path === '/api/identities/merge' && method === 'POST') {
    const body = await readBody(req);
    if (!body.idA || !body.idB) return sendJson(res, 400, { error: 'idA and idB are required' });
    try {
      const merged = mergeIdentities(body.idA, body.idB);
      return sendJson(res, 200, merged);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // -- Bus endpoints --
  if (path === '/api/bus/stats' && method === 'GET') {
    return sendJson(res, 200, busStats(ctx.bus));
  }
  if (path === '/api/bus/publish' && method === 'POST') {
    const body = await readBody(req);
    if (!body.topic) return sendJson(res, 400, { error: 'topic is required' });
    const eventInput = { type: body.type, sourceToolId: body.sourceToolId, payload: body.payload };
    const result = publish(ctx.bus, body.topic, eventInput);
    return sendJson(res, 200, { topic: body.topic, ...result });
  }
  if (path === '/api/bus/route' && method === 'POST') {
    const body = await readBody(req);
    if (!body.toolId) return sendJson(res, 400, { error: 'toolId is required' });
    const def = getToolDef(body.toolId);
    if (!def) return sendJson(res, 404, { error: `Unknown tool: ${body.toolId}` });
    const eventInput = { type: body.type, sourceToolId: body.toolId, payload: body.payload };
    const result = routeEvent(ctx.bus, eventInput, def.manifest.syncChannels);
    return sendJson(res, 200, { toolId: body.toolId, ...result });
  }

  // -- Vocabulary endpoints --
  if (path === '/api/translate' && method === 'GET') {
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const value = url.searchParams.get('value');
    if (!from || !to || !value) return sendJson(res, 400, { error: 'from, to, and value query params are required' });
    const result = translate(from, to, value);
    return sendJson(res, 200, { from, to, input: value, ...result });
  }
  if (path === '/api/translations' && method === 'GET') {
    return sendJson(res, 200, { translations: listTranslations() });
  }

  // -- 404 --
  sendJson(res, 404, { error: `Not found: ${method} ${path}` });
}

// -- Helpers --

function sendJson(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) });
  res.end(json);
}

function serveHtml(res, filePath) {
  if (!existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found: ' + filePath);
    return;
  }
  const html = readFileSync(filePath, 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': Buffer.byteLength(html) });
  res.end(html);
}

function getDashboardPath(filename) {
  // Try a few candidate locations: site public dir, then download dir
  const candidates = [
    join(__dirname, '..', '..', '..', 'site', 'manya', 'public', filename),
    join(__dirname, '..', '..', '..', 'download', filename),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0]; // default to first (will 404)
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; if (data.length > 1024 * 1024) reject(new Error('Body too large')); });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

/**
 * Starts an SSE connection.
 */
function startSse(req, res, clients) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  res.write('event: connected\ndata: {"message":"SSE connected"}\n\n');
  clients.add(res);
  req.on('close', () => { clients.delete(res); });
}

/**
 * Broadcasts an event to all SSE clients.
 */
function broadcastSse(clients, event) {
  const data = `event: message\ndata: ${JSON.stringify(event)}\n\n`;
  for (const client of clients) {
    try { client.write(data); } catch (err) { clients.delete(client); }
  }
}
