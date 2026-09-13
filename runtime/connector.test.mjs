import assert from 'node:assert/strict';
import test from 'node:test';
import { createManyaRuntime } from './connector.mjs';

test('GitHub connector normalizes a safe MCP read and persists mapping', async () => {
  const calls = [];
  const fetchImpl = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      result: { content: [{ type: 'text', text: 'repo ok' }], structuredContent: { name: 'demo' } },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const runtime = createManyaRuntime({
    env: { MANYA_MCP_URL: 'https://example.invalid/mcp', MANYA_IDENTITY: 'test-user' },
    fetchImpl,
  });
  const result = await runtime.connectors.github.execute({
    tool: 'GITHUB_GET_REPOSITORY',
    arguments: { owner: 'demo', repo: 'project' },
  });
  assert.equal(result.ok, true);
  assert.equal(result.structuredContent.name, 'demo');
  assert.equal(calls[0].method, 'initialize');
  assert.equal(calls[1].method, 'tools/call');
  assert.equal((await runtime.connectors.github.status()).persisted, true);
});

test('GitHub connector rejects unsafe tools and missing MCP configuration', async () => {
  const runtime = createManyaRuntime({ env: { MANYA_IDENTITY: 'test-user' } });
  await assert.rejects(
    runtime.connectors.github.execute({ tool: 'GITHUB_DELETE_REPOSITORY', arguments: {} }),
    (error) => error.statusCode === 403,
  );
  await assert.rejects(
    runtime.connectors.github.execute({ tool: 'GITHUB_GET_REPOSITORY', arguments: {} }),
    (error) => error.statusCode === 503,
  );
});
