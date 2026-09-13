# Manya Runtime

Manya exposes a small reusable connector runtime on top of the existing HTTP gateway.

## Start

From `Manya/runtime`:

```powershell
$env:MANYA_IDENTITY = 'manya-local'
$env:MANYA_MCP_URL = 'https://your-composio-mcp-endpoint'
$env:MANYA_OS_URL = 'http://127.0.0.1:3200'
$env:MANYA_OS_TOKEN = '<manya-os-bearer-token>'
npm start
```

`MANYA_MCP_URL` must be supplied by deployment configuration. Do not copy provider tokens into source control or application databases. The existing VS Code Composio configuration uses a remote MCP endpoint; provide the endpoint to Manya through this environment variable only.

Without `MANYA_MCP_URL`, the runtime still starts for local and unit testing, but connector execution returns `503`.

`MANYA_OS_URL` points at a Manya-OS runtime. `MANYA_OS_TOKEN` is optional: when set, the gateway authorizes Every OS proxy request with that bearer token. Otherwise an inbound `Authorization` header on the gateway request is forwarded through as-is.

## API

- `GET /api/health`
- `GET /api/connectors`
- `GET /api/connectors/github`
- `POST /api/connectors/github/execute`
- `/api/os/*` — transparent proxy to the Manya-OS runtime at `MANYA_OS_URL` (mounts the Manya-OS API under the gateway, e.g. `/api/os/api/health`, `/api/os/api/reason`, `/api/os/api/memory/recall`, `/api/os/api/ledger`, `/api/os/api/events`)

The execution endpoint accepts an approved read-only GitHub tool and arguments. It requires these headers:

```text
x-manya-identity: <MANYA_IDENTITY>
x-manya-capability: connectors.github.read
```

Example request:

```powershell
$headers = @{
  'x-manya-identity' = 'manya-local'
  'x-manya-capability' = 'connectors.github.read'
}
$body = @{ tool = 'GITHUB_GET_REPOSITORY'; arguments = @{ owner = 'OWNER'; repo = 'REPOSITORY' } } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3100/api/connectors/github/execute -Headers $headers -ContentType 'application/json' -Body $body
```

Publishing OS operations through the proxy merely requires the OS's bearer token as the gateway's inbound `Authorization` (or `MANYA_OS_TOKEN`):

```powershell
$headers = @{ 'Authorization' = 'Bearer <token>' }
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3100/api/os/api/reason -Headers $headers -ContentType 'application/json' -Body '{"description":"Reasoned via the Manya gateway"}'
```

## Operating Flow

```text
HTTP request
  GET/POST /api/os/* ──► forwarded to Manya-OS (auth passed through) ──► 200/401/403/429 JSON
  POST /api/connectors/github/execute ──► identity+capability gate (403) ──►
     approved read-only tool allowlist (403) ──► MCP tools/call ──► normalized { ok, content, structuredContent } ──► connector mapping persisted
  GET /api/connectors/github ──► { provider, identity, configured, persisted }
```

## Persistence

The runtime persists only the Manya identity, provider name, and connector metadata. When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present, it uses the existing Manya-OS Supabase REST layer and the `manya_connector_connections` migration. Otherwise it uses an in-memory store suitable for local tests.

## Tests

```sh
npm test     # node --test connector.test.mjs e2e.test.mjs
```

`connector.test.mjs` covers the connector unit behavior in-process. `e2e.test.mjs` boots the real gateway over HTTP (plus the Manya-OS runtime when it is available next to this workspace) and proves the full operating slice: gateway health, unauthenticated rejection, authenticated OS `reason`, memory recall, connector capability enforcement, allowlist rejection, MCP execution with persistence, and structured `503` for an unconfigured MCP.
