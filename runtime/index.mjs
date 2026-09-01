import http from 'node:http';
import { ConnectorError, createManyaRuntime } from './connector.mjs';

const HOST = process.env.MANYA_HOST || '127.0.0.1';
const PORT = Number(process.env.MANYA_PORT || 3100);
const OS_URL = process.env.MANYA_OS_URL || 'http://127.0.0.1:3200';
const OS_TOKEN = process.env.MANYA_OS_TOKEN || '';
const runtime = createManyaRuntime();

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'cache-control': 'no-store',
  });
  res.end(data);
}

function osHeaders(req) {
  const headers = { 'content-type': req.headers['content-type'] || 'application/json' };
  const authorization = req.headers['authorization'] || (OS_TOKEN ? `Bearer ${OS_TOKEN}` : '');
  if (authorization) headers['authorization'] = authorization;
  return headers;
}

async function proxy(path, init) {
  const response = await fetch(`${OS_URL}${path}`, init);
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ConnectorError('request body must contain valid JSON', 400); }
}

function authorizedConnectorRequest(req) {
  return req.headers['x-manya-identity'] === runtime.identity
    && req.headers['x-manya-capability'] === 'connectors.github.read';
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || HOST}`);

    if (req.method === 'GET' && url.pathname === '/api/health') {
      let os;
      try { os = await proxy('/api/health', { headers: osHeaders(req) }); } catch (error) {
        os = { status: 503, body: { ok: false, error: error instanceof Error ? error.message : String(error) } };
      }
      return json(res, os.status === 200 ? 200 : 503, {
        ok: os.status === 200,
        runtime: 'manya',
        os,
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/connectors') {
      return json(res, 200, { identity: runtime.identity, connectors: ['github'] });
    }

    if (req.method === 'GET' && url.pathname === '/api/connectors/github') {
      return json(res, 200, await runtime.connectors.github.status());
    }

    if (req.method === 'POST' && url.pathname === '/api/connectors/github/execute') {
      if (!authorizedConnectorRequest(req)) return json(res, 403, { error: 'connector capability denied' });
      const input = await readJson(req);
      const result = await runtime.connectors.github.execute(input);
      return json(res, 200, result);
    }

    if (url.pathname.startsWith('/api/os/')) {
      const target = url.pathname.slice('/api/os'.length) + url.search;
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const init = {
        method: req.method,
        headers: osHeaders(req),
        body: chunks.length ? Buffer.concat(chunks) : undefined,
      };
      const result = await proxy(target, init);
      return json(res, result.status, result.body);
    }

    if (req.method === 'GET' && url.pathname === '/') {
      return json(res, 200, {
        name: 'Manya',
        runtime: 'manya',
        os: OS_URL,
        endpoints: ['/api/health', '/api/connectors', '/api/connectors/github', '/api/connectors/github/execute', '/api/os/api/runtime', '/api/os/api/events', '/api/os/api/memory/recall'],
      });
    }

    return json(res, 404, { error: 'not_found' });
  } catch (error) {
    return json(res, error?.statusCode || 502, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Manya runtime listening on http://${HOST}:${PORT}`);
  console.log(`Manya-OS target: ${OS_URL}`);
});
