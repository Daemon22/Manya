/**
 * Manya runtime — HTTP gateway.
 *
 * Boots the Manya-side gateway (default 127.0.0.1:3100) that:
 *   - exposes its own health endpoint,
 *   - transparently proxies /api/os/* to the Manya-OS runtime
 *     (MANYA_OS_URL, default http://127.0.0.1:3200),
 *   - optionally attaches an OS bearer token (MANYA_OS_TOKEN) and identity
 *     headers (MANYA_IDENTITY) on proxied requests.
 *
 * Repaired: the /api/health handler previously lost its try block and the
 * module failed to parse; the catch-all was also silent. Errors now return
 * structured 502 responses.
 */

import http from 'node:http';

const HOST = process.env.MANYA_HOST || '127.0.0.1';
const PORT = Number(process.env.MANYA_PORT || 3100);
const OS_URL = process.env.MANYA_OS_URL || 'http://127.0.0.1:3200';
const OS_TOKEN = process.env.MANYA_OS_TOKEN || '';
const IDENTITY = process.env.MANYA_IDENTITY || '';

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'cache-control': 'no-store',
  });
  res.end(data);
}

async function proxy(path, init = {}) {
  const headers = { ...(init.headers || {}) };
  if (OS_TOKEN) headers.authorization = `Bearer ${OS_TOKEN}`;
  if (IDENTITY) headers['x-manya-identity'] = IDENTITY;
  if (init.body && !headers['content-type']) headers['content-type'] = 'application/json';
  const response = await fetch(`${OS_URL}${path}`, { ...init, headers });
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  return { status: response.status, body };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || HOST}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      let os = { status: 503, body: { ok: false, error: 'probe failed' } };
      try {
        os = await proxy('/api/health');
      } catch (error) {
        os = { status: 503, body: { ok: false, error: error instanceof Error ? error.message : String(error) } };
      }
      return json(res, os.status === 200 ? 200 : 503, {
        ok: os.status === 200,
        runtime: 'manya',
        os,
      });
    }

    if (url.pathname.startsWith('/api/os/')) {
      const target = url.pathname.slice('/api/os'.length) + url.search;
      const body = await readBody(req);
      const result = await proxy(target, {
        method: req.method,
        body: body && body.length ? body : undefined,
        headers: { accept: req.headers.accept || 'application/json' },
      });
      return json(res, result.status, result.body);
    }

    if (req.method === 'GET' && url.pathname === '/') {
      return json(res, 200, {
        name: 'Manya',
        runtime: 'manya',
        os: OS_URL,
        endpoints: ['/api/health', '/api/os/*'],
      });
    }

    return json(res, 404, { error: 'not_found' });
  } catch (error) {
    return json(res, 502, {
      error: 'gateway_error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Manya runtime listening on http://${HOST}:${PORT}`);
  console.log(`Manya-OS target: ${OS_URL}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1000).unref();
  });
}

export default server;
