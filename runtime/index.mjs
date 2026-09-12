import http from 'node:http';

const HOST = process.env.MANYA_HOST || '127.0.0.1';
const PORT = Number(process.env.MANYA_PORT || 3100);
const OS_URL = process.env.MANYA_OS_URL || 'http://127.0.0.1:3200';

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'cache-control': 'no-store',
  });
  res.end(data);
}

async function proxy(path, init) {
  const response = await fetch(`${OS_URL}${path}`, init);
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || HOST}`);

    if (req.method === 'GET' && url.pathname === '/api/health') {
      let os;
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
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const init = {
        method: req.method,
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
      });
    }

    return json(res, 404, { error: 'not_found' });
  } catch (error) {
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Manya runtime listening on http://${HOST}:${PORT}`);
  console.log(`Manya-OS target: ${OS_URL}`);
});
