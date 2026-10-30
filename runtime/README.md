# Manya-OS HTTP Runtime

The runtime is a small local-first HTTP service boundary. Start it from this directory with `npm start`.

## Exposure and authentication

By default it binds to `127.0.0.1:3200` and runs in local mode without authentication. This default is intended for a trusted local process only. Set `MANYA_OS_HOST` and `MANYA_OS_PORT` explicitly to change the bind address and port.

Authentication uses an operator-provided bearer token from `MANYA_OS_AUTH_TOKEN`; tokens are never logged and are accepted only in the `Authorization: Bearer <token>` header. Tokens must be at least 32 characters. `MANYA_OS_AUTH_MODE=required` enables authentication even on loopback. `MANYA_OS_AUTH_MODE=disabled` is allowed only for loopback binds. The default `auto` mode requires authentication for any non-loopback bind and refuses to start without a token.

`GET /api/health` is public for liveness checks. `/api/runtime`, memory, events, reasoning, ledger, and governance endpoints require authentication whenever authentication is enabled.

## Governance and authorization

Every authenticated call is evaluated by the constitution's `EnforcementEngine` before it executes. Authenticated requests act as the operator subject (`MANYA_OS_OPERATOR_SUBJECT`, default `operator`). With no governance file the operator is granted `*` on every action, so the runtime keeps its previous default behavior.

Load a governance file with `MANYA_OS_GOVERNANCE_FILE` to restrict the operator and/or add policies:

```json
{
  "permissions": {
    "roles": [
      { "name": "limited", "permissions": ["runtime:read", "ledger:read", "events:publish"] }
    ],
    "assignments": [{ "subject": "operator", "role": "limited" }]
  },
  "policies": {
    "id": "runtime-policies",
    "name": "Runtime operational policies",
    "policies": [
      { "id": "no-event-publishing", "name": "No event publishing", "description": "Blocks publishing events", "condition": "context.action == 'events:publish'", "action": "deny", "priority": 10 }
    ]
  }
}
```

Permission strings use `module:action` (`runtime:read`, `memory:remember`, `memory:recall`, `reason:execute`, `events:read`, `events:publish`, `ledger:read`, `governance:read`). Policy conditions use the sandboxed condition language over `context.subject`, `context.action`, `context.resource`, `context.metadata`, and `context.timestamp` (no `eval`). The permission model is validated at startup and policy conditions are pre-parsed; a malformed file aborts startup. Denied actions return `403` with an `auditId` and the contributing `violations`.

`GET /api/governance` exposes the enforcement audit log (subject, action, decision, reasons), registered grants, and grant revocations for the authenticated operator.

## Operating workflow

The primary operating slice is a reasoned objective end-to-end: the cortex decomposes and executes a goal, the outcome is written to memory, the action is audited on the ledger, and nervous-system signals are emitted.

```
POST /api/reason            {"description": "Plan the migration", "options": {...}?}
  → authentication          Authorization: Bearer <token>
  → governance              EnforcementEngine.evaluate('reason:execute', ...)
  → contract validation     validateRequest (api-contract.mjs) → 400 on violation
  → cortex.reason           goal → plan → executed tasks (statuses, results, confidence)
  → memory.remember         episodic record of the reasoned outcome (see recall)
  → ledger.append           runtime.reason.completed
  → publish                 cortex.reasoning.started|completed
  → 200 { goal, plan, events, memoryId, summary { status, tasks, completed, confidence } }
```

To prove the memory behavior after a reason call, recall it through the public interface:

```
GET /api/memory/recall?q=Reasoned     → ranked results whose record.event includes the objective
```

Request bodies are validated against the runtime's API contract (`runtime/api-contract.mjs`) using `@manya-os/contracts` before execution; invalid bodies return `400` with an `errors[]` list. Relevant memory/audit/signals afterwards:

- `GET /api/memory/recall?q=...` — the recorded outcome is retrievable.
- `GET /api/ledger` — contains `runtime.reason.completed` (goal id, status, task count, memory id) and stays cryptographically valid.
- `GET /api/events` — contains `cortex.reasoning.completed` (goal id, status, memory id).
- `GET /api/governance` — the `reason:execute` enforcement audit entry.

## Audit ledger

The runtime appends an immutable, hash-chained event to a `LedgerChain` for every meaningful operation: `runtime.started`, `runtime.shutdown`, `runtime.auth.denied` (with no credential), `runtime.policy.denied`, `runtime.memory.remembered`, `runtime.memory.recalled`, `runtime.event.published`, and `runtime.reason.completed`.

`GET /api/ledger` returns the full chain with a fresh cryptographic verification (hash linkage, sequence contiguity, and timestamp monotonicity). The chain is in-memory, so it reflects the current process lifetime only; enable the package-level anonymous/Supabase ledger stores if durable audit persistence is required.

## Request and rate limits

JSON request bodies default to a maximum of 1 MiB. Configure this with `MANYA_OS_MAX_BODY_BYTES`. Oversized requests return `413`; malformed JSON, empty required bodies, and invalid JSON object schemas return `400`.

A process-local per-client limiter defaults to 120 requests per 60 seconds. Configure it with `MANYA_OS_RATE_LIMIT` and `MANYA_OS_RATE_WINDOW_MS`. Exceeded requests return `429` with `Retry-After`. Counters expire and are bounded in memory. This limiter is not a substitute for a reverse proxy or WAF in a public or horizontally scaled deployment.

Responses use JSON, `Cache-Control: no-store`, and basic anti-sniffing, framing, referrer, and permissions headers. Internal errors return a generic message without stack traces or request payloads.

The runtime is not described as internet-safe by itself. Public deployments need authenticated configuration, TLS termination, a reverse proxy or WAF, access logging, monitoring, and network policy appropriate to the deployment.
