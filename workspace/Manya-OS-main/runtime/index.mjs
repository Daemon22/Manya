import http from 'node:http';
import { timingSafeEqual, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Cortex } from '@manya-os/cortex';
import { MemorySystem } from '@manya-os/memory';
import { EventFabric, createEvent } from '@manya-os/nervous-system';
import { LedgerChain, verifyChain } from '@manya-os/ledger';
import {
  EnforcementEngine,
  parseCondition,
  validatePermissionModel,
} from '@manya-os/constitution';
import { validateRequest } from '@manya-os/contracts';
import { CollaborationRequestQueue } from '@manya-os/nervous-system';
import { RUNTIME_API_CONTRACT } from './api-contract.mjs';
import { initPersistence } from './persistence.mjs';
import { initBridge } from './bridge.mjs';

const HOST = process.env.MANYA_OS_HOST || '127.0.0.1';
const PORT = Number(process.env.MANYA_OS_PORT || 3200);
const AUTH_TOKEN = process.env.MANYA_OS_AUTH_TOKEN || '';
const AUTH_MODE = process.env.MANYA_OS_AUTH_MODE || 'auto';
const MAX_BODY_BYTES = Number(process.env.MANYA_OS_MAX_BODY_BYTES || 1024 * 1024);
const RATE_LIMIT = Number(process.env.MANYA_OS_RATE_LIMIT || 120);
const RATE_WINDOW_MS = Number(process.env.MANYA_OS_RATE_WINDOW_MS || 60_000);
const OPERATOR_SUBJECT = process.env.MANYA_OS_OPERATOR_SUBJECT || 'operator';
const GOVERNANCE_FILE = process.env.MANYA_OS_GOVERNANCE_FILE || '';

function isLoopbackHost(host) {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
}

if (!['auto', 'required', 'disabled'].includes(AUTH_MODE)) {
  throw new Error('MANYA_OS_AUTH_MODE must be auto, required, or disabled');
}
if (!Number.isInteger(MAX_BODY_BYTES) || MAX_BODY_BYTES <= 0) {
  throw new Error('MANYA_OS_MAX_BODY_BYTES must be a positive integer');
}
if (!Number.isInteger(RATE_LIMIT) || RATE_LIMIT <= 0 || !Number.isInteger(RATE_WINDOW_MS) || RATE_WINDOW_MS <= 0) {
  throw new Error('MANYA_OS_RATE_LIMIT and MANYA_OS_RATE_WINDOW_MS must be positive integers');
}
if (AUTH_TOKEN && AUTH_TOKEN.length < 32) {
  throw new Error('MANYA_OS_AUTH_TOKEN must contain at least 32 characters');
}
if (!isLoopbackHost(HOST) && (!AUTH_TOKEN || AUTH_MODE === 'disabled')) {
  throw new Error('Network exposure requires MANYA_OS_AUTH_TOKEN and authentication enabled');
}
if (AUTH_MODE === 'required' && !AUTH_TOKEN) {
  throw new Error('MANYA_OS_AUTH_MODE=required requires MANYA_OS_AUTH_TOKEN');
}

const authenticationRequired = AUTH_MODE === 'required' || (!isLoopbackHost(HOST) && AUTH_MODE !== 'disabled');
const rateBuckets = new Map();
const MAX_RATE_BUCKETS = 10_000;

const startedAt = new Date().toISOString();
const identity = `manya-os:${randomUUID()}`;
const persistence = initPersistence({ logLevel: 'silent' });
const memory = new MemorySystem(
  persistence.mode === 'supabase' ? { store: persistence.failureTolerantMemoryStore() } : undefined
);
const cortex = new Cortex({ logLevel: 'silent' });
const events = new EventFabric({ recordByDefault: true, logLevel: 'silent' });
const collaborationQueue = new CollaborationRequestQueue();
const bridge = initBridge({ fabric: events, queue: collaborationQueue, identityId: identity });

const DEFAULT_PERMISSION_MODEL = {
  roles: [{ name: 'operator', permissions: ['*'] }],
  assignments: [{ subject: OPERATOR_SUBJECT, role: 'operator' }],
};

function loadGovernance() {
  let permissionModel = DEFAULT_PERMISSION_MODEL;
  let policySet;
  let ruleSet;
  if (GOVERNANCE_FILE) {
    let raw;
    try {
      raw = JSON.parse(readFileSync(GOVERNANCE_FILE, 'utf8'));
    } catch (error) {
      throw new Error(`MANYA_OS_GOVERNANCE_FILE: cannot load ${GOVERNANCE_FILE}: ${error.message}`);
    }
    if (raw.permissions) {
      validatePermissionModel(raw.permissions);
      permissionModel = raw.permissions;
    }
    if (raw.policies) policySet = raw.policies;
    if (raw.rules) ruleSet = raw.rules;
  }
  if (policySet) {
    for (const policy of policySet.policies || []) {
      try {
        parseCondition(policy.condition);
      } catch (error) {
        throw new Error(`MANYA_OS_GOVERNANCE_FILE: policy "${policy.id}" has an invalid condition: ${error.message}`);
      }
    }
  }
  const engine = new EnforcementEngine();
  engine.registerPermissionModel(permissionModel);
  if (policySet) engine.registerPolicySet(policySet);
  if (ruleSet) engine.registerRuleSet(ruleSet);
  return engine;
}

const ledger = new LedgerChain();
const enforcement = loadGovernance();

function publish(topic, payload = {}) {
  events.publish(createEvent(topic, identity, payload));
}

function record(type, actor, payload) {
  const event = ledger.append(type, actor, payload);
  // Best-effort durability mirror into the persistence backbone (no-op in
  // in-memory mode; storage outages are counted, never thrown).
  persistence.mirrorLedgerEvent(event);
  return event;
}

function authorize(action, req, url) {
  const context = {
    subject: OPERATOR_SUBJECT,
    action,
    resource: url.pathname,
    metadata: { method: req.method, path: url.pathname },
    timestamp: new Date().toISOString(),
  };
  const decision = enforcement.evaluate(action, OPERATOR_SUBJECT, context);
  return { decision, context };
}

function deny(res, url, req, action, decision) {
  const denied = record('runtime.policy.denied', OPERATOR_SUBJECT, {
    action,
    subject: OPERATOR_SUBJECT,
    method: req.method,
    path: url.pathname,
    auditId: decision.auditId,
    violations: decision.violations,
  });
  publish('runtime.policy.denied', {
    action,
    subject: OPERATOR_SUBJECT,
    auditId: decision.auditId,
    chainSeq: denied.seq,
  });
  return json(res, 403, {
    error: 'forbidden',
    auditId: decision.auditId,
    violations: decision.violations,
  });
}

function json(res, status, body, headers = {}) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    ...headers,
  });
  res.end(data);
}

function clientAddress(req) {
  return req.socket.remoteAddress || 'unknown';
}

function allowRequest(req) {
  const now = Date.now();
  const key = clientAddress(req);
  const current = rateBuckets.get(key);
  if (!current || current.expiresAt <= now) {
    if (rateBuckets.size >= MAX_RATE_BUCKETS) {
      for (const [bucketKey, bucket] of rateBuckets) {
        if (bucket.expiresAt <= now) rateBuckets.delete(bucketKey);
      }
      if (rateBuckets.size >= MAX_RATE_BUCKETS) rateBuckets.delete(rateBuckets.keys().next().value);
    }
    rateBuckets.set(key, { count: 1, expiresAt: now + RATE_WINDOW_MS });
    return true;
  }
  current.count += 1;
  return current.count <= RATE_LIMIT;
}

function hasValidAuthorization(req) {
  const value = req.headers.authorization;
  if (typeof value !== 'string' || !value.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(value.slice(7), 'utf8');
  const expected = Buffer.from(AUTH_TOKEN, 'utf8');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function body(req, required = true) {
  if (req.headers['content-length'] && Number(req.headers['content-length']) > MAX_BODY_BYTES) {
    req.resume();
    const error = new Error('request body exceeds maximum size');
    error.statusCode = 413;
    throw error;
  }
  if (req.headers['content-type'] && !req.headers['content-type'].toLowerCase().startsWith('application/json')) {
    const error = new Error('content-type must be application/json');
    error.statusCode = 400;
    throw error;
  }
  const chunks = [];
  let size = 0;
  let tooLarge = false;
  for await (const chunk of req) {
    size += chunk.length;
    if (size <= MAX_BODY_BYTES) chunks.push(chunk);
    else tooLarge = true;
  }
  if (tooLarge) {
    const error = new Error('request body exceeds maximum size');
    error.statusCode = 413;
    throw error;
  }
  if (!chunks.length) {
    if (!required) return {};
    const error = new Error('request body is required');
    error.statusCode = 400;
    throw error;
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('request body must contain valid JSON');
    error.statusCode = 400;
    throw error;
  }
}

function requireObject(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    const error = new Error('request body must be a JSON object');
    error.statusCode = 400;
    throw error;
  }
  return input;
}

function invalidRequest(res, result) {
  return json(res, 400, { error: 'request validation failed', errors: result.errors });
}

function validateApi(method, path, body) {
  return validateRequest(RUNTIME_API_CONTRACT, method, path, body);
}

function status() {
  return {
    ok: true,
    runtime: 'manya-os',
    version: '1.0.0',
    identity,
    startedAt,
    uptimeMs: Math.round(process.uptime() * 1000),
    subsystems: {
      cortex: true,
      memory: true,
      nervousSystem: true,
      governance: true,
      ledger: true,
      bridge: bridge.mode === 'bridged',
      persistence: persistence.mode === 'supabase',
      collaborationQueue: true,
    },
    bridge: bridge.status(),
    persistence: persistence.status(),
    collaboration: { queued: collaborationQueue.size(), capacity: 256 },
    ledger: {
      chainLength: ledger.length(),
      latestSeq: ledger.tail()?.seq ?? 0,
    },
    auditEntries: enforcement.getAuditLog().length,
    events: events.metrics.snapshot(),
  };
}

const server = http.createServer(async (req, res) => {
  try {
    if (!allowRequest(req)) {
      return json(res, 429, { error: 'rate limit exceeded' }, { 'retry-after': String(Math.ceil(RATE_WINDOW_MS / 1000)) });
    }
    const url = new URL(req.url || '/', `http://${req.headers.host || HOST}`);

    if (req.method === 'GET' && url.pathname === '/api/health') {
      return json(res, 200, status());
    }

    if (authenticationRequired && !hasValidAuthorization(req)) {
      ledger.append('runtime.auth.denied', 'anonymous', { method: req.method, path: url.pathname });
      return json(res, 401, { error: 'authentication required' }, { 'www-authenticate': 'Bearer' });
    }

    if (req.method === 'GET' && url.pathname === '/api/runtime') {
      const { decision } = authorize('runtime:read', req, url);
      if (!decision.allowed) return deny(res, url, req, 'runtime:read', decision);
      return json(res, 200, {
        ...status(),
        memory: memory.snapshot(),
        eventCount: events.recorder.size(),
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/events') {
      const { decision } = authorize('events:read', req, url);
      if (!decision.allowed) return deny(res, url, req, 'events:read', decision);
      return json(res, 200, events.recorder.getEvents());
    }

    if (req.method === 'POST' && url.pathname === '/api/memory/remember') {
      const { decision } = authorize('memory:remember', req, url);
      if (!decision.allowed) return deny(res, url, req, 'memory:remember', decision);
      const input = requireObject(await body(req));
      const contract = validateApi(req.method, url.pathname, input);
      if (!contract.valid) return invalidRequest(res, contract);
      const id = memory.remember(
        input.agent || identity,
        String(input.event || ''),
        input.context,
        input.options,
      );
      record('runtime.memory.remembered', OPERATOR_SUBJECT, { id, agent: input.agent || identity });
      publish('memory.remembered', { id, agent: input.agent || identity });
      return json(res, 201, { id });
    }

    if (req.method === 'GET' && url.pathname === '/api/memory/recall') {
      const { decision } = authorize('memory:recall', req, url);
      if (!decision.allowed) return deny(res, url, req, 'memory:recall', decision);
      const query = url.searchParams.get('q') || '';
      const limit = Math.min(Number(url.searchParams.get('limit') || 10), 100);
      const results = memory.recall(query, limit);
      record('runtime.memory.recalled', OPERATOR_SUBJECT, { query, count: results.length });
      return json(res, 200, { query, results });
    }

    if (req.method === 'POST' && url.pathname === '/api/reason') {
      const { decision } = authorize('reason:execute', req, url);
      if (!decision.allowed) return deny(res, url, req, 'reason:execute', decision);
      const input = requireObject(await body(req));
      const contract = validateApi(req.method, url.pathname, input);
      if (!contract.valid) return invalidRequest(res, contract);
      publish('cortex.reasoning.started', { description: input.description.slice(0, 200) });
      const result = await cortex.reason(input.description, input.options);
      const memoryId = memory.remember(identity, `Reasoned about: ${input.description}`, {
        goalId: result.goal.id,
        completed: result.plan.tasks.every((task) => task.status === 'completed'),
      });
      const completed = result.plan.tasks.every((task) => task.status === 'completed');
      const summary = {
        goal: result.goal.description,
        status: result.goal.status,
        tasks: result.plan.tasks.length,
        completed,
        confidence: result.plan.confidence,
        memoryId,
      };
      record('runtime.reason.completed', OPERATOR_SUBJECT, {
        goalId: result.goal.id,
        memoryId,
        status: result.goal.status,
        tasks: result.plan.tasks.length,
        completed,
      });
      publish('cortex.reasoning.completed', {
        goalId: result.goal.id,
        memoryId,
        status: result.goal.status,
        completed,
      });
      return json(res, 200, { ...result, memoryId, summary });
    }

    if (req.method === 'POST' && url.pathname === '/api/events/publish') {
      const { decision } = authorize('events:publish', req, url);
      if (!decision.allowed) return deny(res, url, req, 'events:publish', decision);
      const input = requireObject(await body(req));
      const contract = validateApi(req.method, url.pathname, input);
      if (!contract.valid) return invalidRequest(res, contract);
      const event = createEvent(input.topic, input.source || identity, input.payload);
      const delivered = events.publish(event);
      record('runtime.event.published', OPERATOR_SUBJECT, { topic: input.topic, eventId: event.id });
      return json(res, 202, { event, delivered });
    }

    if (req.method === 'GET' && url.pathname === '/api/ledger') {
      const { decision } = authorize('ledger:read', req, url);
      if (!decision.allowed) return deny(res, url, req, 'ledger:read', decision);
      const eventsList = ledger.all();
      const verification = verifyChain(eventsList);
      return json(res, 200, {
        chainLength: eventsList.length,
        verified: verification.valid,
        verify: verification,
        events: eventsList,
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/governance') {
      const { decision } = authorize('governance:read', req, url);
      if (!decision.allowed) return deny(res, url, req, 'governance:read', decision);
      return json(res, 200, {
        subject: OPERATOR_SUBJECT,
        auditLog: enforcement.getAuditLog(),
        grants: enforcement.getGrants(),
        grantRevocations: enforcement.getGrantRevocations(),
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/bridge') {
      const { decision } = authorize('events:read', req, url);
      if (!decision.allowed) return deny(res, url, req, 'events:read', decision);
      return json(res, 200, bridge.status());
    }

    if (req.method === 'POST' && url.pathname === '/api/bridge/publish') {
      const { decision } = authorize('events:publish', req, url);
      if (!decision.allowed) return deny(res, url, req, 'events:publish', decision);
      const input = requireObject(await body(req));
      const contract = validateApi(req.method, url.pathname, input);
      if (!contract.valid) return invalidRequest(res, contract);
      const sent = bridge.publishEvent({
        topic: input.topic,
        type: input.type || 'runtime-event',
        sourceToolId: input.source || identity,
        payload: input.payload || {},
      });
      if (sent) record('runtime.bridge.published', OPERATOR_SUBJECT, { topic: input.topic });
      return json(res, sent ? 202 : 503, sent
        ? { topic: input.topic, delivered: true }
        : { error: 'bridge not connected' });
    }

    if (req.method === 'GET' && url.pathname === '/api/persistence') {
      const { decision } = authorize('ledger:read', req, url);
      if (!decision.allowed) return deny(res, url, req, 'ledger:read', decision);
      return json(res, 200, persistence.status());
    }

    if (req.method === 'GET' && url.pathname === '/api/collaboration') {
      const { decision } = authorize('events:read', req, url);
      if (!decision.allowed) return deny(res, url, req, 'events:read', decision);
      return json(res, 200, {
        size: collaborationQueue.size(),
        requests: collaborationQueue.all(),
      });
    }

    return json(res, 404, { error: 'not_found' });
  } catch (error) {
    const statusCode = error?.statusCode === 413 ? 413 : error?.statusCode === 400 ? 400 : 500;
    const message = statusCode === 500 ? 'internal server error' : error.message;
    return json(res, statusCode, { error: message });
  }
});

function shutdown(signal) {
  publish('runtime.shutdown', { signal });
  record('runtime.shutdown', identity, { signal });
  bridge.stop();
  collaborationQueue.stop();
  persistence.close();
  events.shutdown();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 3000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

server.listen(PORT, HOST, () => {
  publish('runtime.started', { host: HOST, port: PORT, bridge: bridge.mode, persistence: persistence.mode });
  record('runtime.started', identity, { host: HOST, port: PORT, bridge: bridge.mode, persistence: persistence.mode });
  console.log(`Manya-OS runtime listening on http://${HOST}:${PORT}`);
  console.log(`  bridge: ${bridge.mode}${bridge.mode === 'bridged' ? ` -> ${process.env.MANYA_OS_BRIDGE_URL}` : ''}`);
  console.log(`  persistence: ${persistence.mode}`);
});
