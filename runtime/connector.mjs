import { randomUUID } from 'node:crypto';

const READ_ONLY_GITHUB_TOOLS = new Set([
  'GITHUB_GET_REPOSITORY',
  'GITHUB_LIST_REPOSITORIES_FOR_USER',
  'GITHUB_GET_ISSUE',
  'GITHUB_GET_PULL_REQUEST',
]);

export class ConnectorError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'ConnectorError';
    this.statusCode = statusCode;
  }
}

export function createMcpTransport({ url, headers = {}, fetchImpl = fetch }) {
  if (!url) throw new ConnectorError('MANYA_MCP_URL is required', 503);
  let sessionId;
  let requestId = 0;
  let initialized = false;

  async function request(method, params = {}) {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        ...headers,
        ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: ++requestId,
        method,
        params,
      }),
    });
    const text = await response.text();
    sessionId = response.headers.get('mcp-session-id') || sessionId;
    const payload = parseMcpPayload(text);
    if (!response.ok) throw new ConnectorError(payload?.error?.message || `MCP request failed (${response.status})`, response.status);
    if (payload?.error) throw new ConnectorError(payload.error.message || 'MCP error', 502);
    return payload?.result ?? payload;
  }

  return {
    async initialize() {
      const result = await request('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'manya-runtime', version: '0.9.0' },
      });
      initialized = true;
      return result;
    },
    listTools() {
      return request('tools/list', {});
    },
    async callTool(name, arguments_) {
      if (!initialized) await this.initialize();
      return request('tools/call', { name, arguments: arguments_ });
    },
  };
}

function parseMcpPayload(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const data = text.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).filter(Boolean).pop();
  if (!data) throw new ConnectorError('MCP returned an unreadable response', 502);
  try { return JSON.parse(data); } catch { throw new ConnectorError('MCP returned invalid JSON', 502); }
}

export function createMemoryConnectorStore() {
  const records = new Map();
  return {
    async save(record) { records.set(`${record.identity}:${record.provider}`, { ...record }); return record; },
    async get(identity, provider) { return records.get(`${identity}:${provider}`) || null; },
  };
}

export function createSupabaseConnectorStore({ url, serviceRoleKey, fetchImpl = fetch }) {
  if (!url || !serviceRoleKey) throw new ConnectorError('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for Supabase persistence', 503);
  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/manya_connector_connections`;
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'content-type': 'application/json' };
  return {
    async save(record) {
      const response = await fetchImpl(endpoint, { method: 'POST', headers: { ...headers, Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(record) });
      if (!response.ok) throw new ConnectorError('connector persistence failed', 503);
      return record;
    },
    async get(identity, provider) {
      const response = await fetchImpl(`${endpoint}?identity=eq.${encodeURIComponent(identity)}&provider=eq.${encodeURIComponent(provider)}&select=*`, { headers });
      if (!response.ok) throw new ConnectorError('connector persistence lookup failed', 503);
      return (await response.json())[0] || null;
    },
  };
}

export function createGitHubConnector({ mcp, identity, capability = 'connectors.github.read', authorize = () => true, persistence = createMemoryConnectorStore(), configured = true }) {
  if (!identity) throw new ConnectorError('Manya identity is required', 500);
  return {
    provider: 'github',
    identity,
    capability,
    async execute({ tool, arguments: arguments_ = {} }) {
      if (!READ_ONLY_GITHUB_TOOLS.has(tool)) throw new ConnectorError('only approved GitHub read tools may be executed', 403);
      if (!authorize({ identity, provider: 'github', capability, tool })) throw new ConnectorError('connector capability denied', 403);
      const result = await mcp.callTool(tool, arguments_);
      await persistence.save({ identity, provider: 'github', metadata: { tool, updatedAt: new Date().toISOString() } });
      return normalizeToolResult(result);
    },
    async status() {
      return { provider: 'github', identity, configured, persisted: Boolean(await persistence.get(identity, 'github')) };
    },
  };
}

function normalizeToolResult(result) {
  return {
    ok: !result?.isError,
    content: Array.isArray(result?.content) ? result.content : [],
    structuredContent: result?.structuredContent ?? null,
  };
}

export function createManyaRuntime({ env = process.env, fetchImpl = fetch, persistence } = {}) {
  const identity = env.MANYA_IDENTITY || 'manya-local';
  const mcp = env.MANYA_MCP_URL ? createMcpTransport({ url: env.MANYA_MCP_URL, fetchImpl }) : null;
  const store = persistence || (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseConnectorStore({ url: env.SUPABASE_URL, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl })
    : createMemoryConnectorStore());
  const github = createGitHubConnector({
    mcp: mcp || { callTool: async () => { throw new ConnectorError('MANYA_MCP_URL is not configured', 503); } },
    identity,
    persistence: store,
    configured: Boolean(mcp),
    authorize: ({ capability }) => capability === 'connectors.github.read' && (env.MANYA_CONNECTOR_CAPABILITY || 'connectors.github.read') === capability,
  });
  return { identity, mcp, persistence: store, connectors: { github } };
}

export function requestId() { return randomUUID(); }
