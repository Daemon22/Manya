/**
 * Manya CLI — HTTP server with REST API + SSE event stream + WebSocket wire.
 *
 * Boots an HTTP server that exposes the unify mesh, federation, and event
 * bus via REST endpoints, streams events in real time via Server-Sent
 * Events (SSE), serves the Weave and Live dashboards, and — since Manya 1.1
 * — hosts the connective core: a live @manya/core-runtime instance with the
 * knowledge registry, the HAEL Foundation domain, and a WebSocket wire
 * endpoint (/wire) for remote peers.
 *
 * Connective endpoints (Manya 1.1):
 *   GET    /api/runtime/status        → core runtime status
 *   GET    /api/knowledge/query       → discover knowledge (?viewer=&text=&collection=&tag=&owner=)
 *   POST   /api/knowledge/publish     → publish a knowledge record
 *   POST   /api/knowledge/grant       → grant discover/read/copy to a subject
 *   POST   /api/knowledge/lease       → issue a bounded lease {ref, subject, ...}
 *   POST   /api/knowledge/read        → read through a lease {leaseId}
 *   GET    /api/foundation/profiles   → Foundation profiles (?viewer=&kind=)
 *   POST   /api/foundation/profiles   → upsert profile {actor, subjectId, ...}
 *   GET    /api/foundation/directory  → organization directory (?viewer=&q=&sector=)
 *   POST   /api/foundation/directory  → register organization {actor, orgId, ...}
 *   GET    /api/foundation/graph      → relationship map (?viewer=&format=json|svg|dot|mermaid)
 *   GET    /api/foundation/stats      → Foundation domain stats
 *   GET    /api/presence              → connected entities (technical domain)
 *   WS     /wire                      → remote peer endpoint (Manya wire protocol)
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
import { createManyaCore } from '@manya/core-runtime';

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
      } catch { /* skip tools that can't load */ }
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

  // -- Connective core (knowledge + foundation + transport/wire) --
  const server = createServer(async (req, res) => {
    try {
      await handleRequest(req, res, { bus, sseClients, core });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
  });

  let core = options.core || null;
  if (!core && options.core !== false) {
    core = createManyaCore({
      identity: {
        id: process.env.MANYA_IDENTITY || `manya-serve-${port}`,
        kind: 'service',
        displayName: 'Manya Serve',
        domains: ['technical', 'foundation'],
      },
      listen: { path: '/wire', server }, // wire endpoint rides THIS server
      secret: process.env.MANYA_WIRE_SECRET || undefined,
      stewards: (process.env.MANYA_STEWARDS || '').split(',').map((s) => s.trim()).filter(Boolean),
    });
  }

  if (core) {
    core.registerSelf();
    if (core.transport.mode === 'server') {
      await core.start(); // attaches the /wire WebSocket endpoint to `server`
    }
  }

  return new Promise((resolve) => {
    server.listen(port, host, () => {
      resolve({ server, url: `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`, bus, core });
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
      } catch { /* skip */ }
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

  // -- Connective core endpoints (Manya 1.1) --
  if (ctx.core) {
    const core = ctx.core;

    if (path === '/api/runtime/status' && method === 'GET') {
      return sendJson(res, 200, core.status());
    }

    if (path === '/api/knowledge/query' && method === 'GET') {
      const viewer = url.searchParams.get('viewer');
      const results = core.knowledge.query(core.knowledge, viewer, {
        text: url.searchParams.get('text') || undefined,
        collection: url.searchParams.get('collection') || undefined,
        tag: url.searchParams.get('tag') || undefined,
        owner: url.searchParams.get('owner') || undefined,
      });
      return sendJson(res, 200, { viewer: viewer || null, count: results.length, results });
    }
    if (path === '/api/knowledge/publish' && method === 'POST') {
      const body = await readBody(req);
      try {
        const result = core.knowledge.publish(core.knowledge, body.owner, body);
        return sendJson(res, 201, result);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }
    if (path === '/api/knowledge/grant' && method === 'POST') {
      const body = await readBody(req);
      try {
        const result = core.knowledge.grantAccess(core.knowledge, body.grantor, body.ref, body.subject, body.actions);
        return sendJson(res, 201, result);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }
    if (path === '/api/knowledge/lease' && method === 'POST') {
      const body = await readBody(req);
      try {
        const leaseRecord = core.knowledge.lease(core.knowledge, body.ref, body.subject, {
          ttlMs: body.ttlMs, maxReads: body.maxReads,
        });
        return sendJson(res, 201, leaseRecord);
      } catch (err) {
        return sendJson(res, err.code === 'KNOWLEDGE_ACCESS_DENIED' ? 403 : 400, { error: err.message });
      }
    }
    if (path === '/api/knowledge/read' && method === 'POST') {
      const body = await readBody(req);
      try {
        const view = core.knowledge.read(core.knowledge, body.leaseId);
        return sendJson(res, 200, view);
      } catch (err) {
        return sendJson(res, 410, { error: err.message });
      }
    }

    if (path === '/api/foundation/profiles' && method === 'GET') {
      const viewer = url.searchParams.get('viewer');
      const kind = url.searchParams.get('kind') || undefined;
      const profiles = core.foundation.listProfiles(core.foundation, viewer, { kind });
      return sendJson(res, 200, { viewer: viewer || null, count: profiles.length, profiles });
    }
    if (path === '/api/foundation/profiles' && method === 'POST') {
      const body = await readBody(req);
      try {
        const profile = core.foundation.upsertProfile(core.foundation, body.actor, body);
        return sendJson(res, 201, profile);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }
    if (path === '/api/foundation/directory' && method === 'GET') {
      const viewer = url.searchParams.get('viewer');
      const organizations = core.foundation.searchDirectory(core.foundation, viewer, {
        q: url.searchParams.get('q') || undefined,
        sector: url.searchParams.get('sector') || undefined,
      });
      return sendJson(res, 200, { viewer: viewer || null, count: organizations.length, organizations });
    }
    if (path === '/api/foundation/directory' && method === 'POST') {
      const body = await readBody(req);
      try {
        const org = core.foundation.registerOrganization(core.foundation, body.actor, body);
        return sendJson(res, 201, org);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }
    if (path === '/api/foundation/graph' && method === 'GET') {
      const viewer = url.searchParams.get('viewer');
      const format = url.searchParams.get('format') || 'json';
      const graph = core.foundation.relationshipGraph(core.foundation, viewer, { format });
      if (format === 'svg') {
        res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' });
        res.end(graph.svg);
        return;
      }
      return sendJson(res, 200, graph);
    }
    if (path === '/api/foundation/stats' && method === 'GET') {
      return sendJson(res, 200, core.foundation.stats(core.foundation));
    }
    if (path === '/api/presence' && method === 'GET') {
      const entities = core.transport.presence.list({
        kind: url.searchParams.get('kind') || undefined,
        domain: url.searchParams.get('domain') || undefined,
      });
      return sendJson(res, 200, { count: entities.length, entities });
    }
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
      try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON body')); }
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
    try { client.write(data); } catch { clients.delete(client); }
  }
}
