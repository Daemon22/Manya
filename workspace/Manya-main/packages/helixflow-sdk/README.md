# @manya/helixflow-sdk

Client and workflow helpers for the HelixFlow workflow engine.

## What It Does

This package provides an HTTP client and a set of factory/validation functions for working with HelixFlow workflows. It handles:

- **Workflow definitions** -- create structured workflow DAGs with nodes and edges
- **uSINGA connection references** -- create and validate connection refs that link workflow API nodes back to the uSINGA provider system
- **Shape validation** -- check workflow structure before sending it to the API

This package intentionally does not store API keys, inspect provider balances, or choose providers. Those responsibilities belong to **uSINGA - API NEXUS**.

## API Reference

### `HelixFlowClient`

HTTP client for the HelixFlow API.

```js
const client = new HelixFlowClient({
  baseUrl: "http://localhost:8100/api",  // default
  fetchImpl: globalThis.fetch            // default
});
```

| Method              | Description                            |
|---------------------|----------------------------------------|
| `listWorkflows()`   | Returns all workflows.                 |
| `getWorkflow(id)`   | Returns a single workflow by ID.       |
| `createWorkflow(w)` | Creates a workflow (validates first).  |
| `runWorkflow(id, input?)` | Runs a workflow with optional input. |

### `createWorkflowDefinition(input)`

Creates a workflow definition with sensible defaults.

| Parameter         | Type               | Required | Description                        |
|------------------|--------------------|----------|------------------------------------|
| `name`           | `string`           | Yes      | Workflow name                      |
| `nodes`          | `WorkflowNode[]`   | Yes      | Nodes in the DAG                   |
| `edges`          | `WorkflowEdge[]`   | Yes      | Directed edges connecting nodes    |
| `failurePolicy`  | `string`           | No       | Default: `"stop_workflow"`         |
| `retry`          | `{ attempts, backoff }` | No  | Default: `{ attempts: 3, backoff: "exponential" }` |

Returns a `WorkflowDefinition` with `status: "draft"`.

### `createUsingaConnectionRef(connectionId)`

Creates a uSINGA connection reference string. Prepends `"usinga:"` if not already present.

```js
createUsingaConnectionRef("crm-approved")       // "usinga:crm-approved"
createUsingaConnectionRef("usinga:billing-ok")   // "usinga:billing-ok"
```

Throws if `connectionId` is missing or not a string.

### `createApiRequestNode(input)`

Creates an API request node that uses a uSINGA connection reference.

| Parameter        | Type     | Required | Description                                |
|-----------------|----------|----------|--------------------------------------------|
| `id`            | `string` | Yes      | Node identifier                            |
| `label`         | `string` | Yes      | Human-readable label                       |
| `method`        | `string` | No       | HTTP method (default: `"GET"`)             |
| `connectionRef` | `string` | Yes      | Must be a uSINGA ref (starts with `"usinga:"`) |

Throws if `connectionRef` does not start with `"usinga:"`.

### `validateWorkflowShape(workflow)`

Validates a workflow definition's structure. Checks:

- Workflow has a name
- At least one node exists
- Edges is an array
- No duplicate node IDs
- All API nodes use uSINGA connection references
- All edge sources/targets reference existing nodes

Returns `{ valid: boolean, errors: string[] }`.

## Usage

```js
import {
  HelixFlowClient,
  createWorkflowDefinition,
  createUsingaConnectionRef,
  createApiRequestNode,
  validateWorkflowShape
} from "@manya/helixflow-sdk";

// Build a workflow
const workflow = createWorkflowDefinition({
  name: "Sync CRM Contacts",
  nodes: [
    { id: "trigger", type: "trigger", label: "Daily schedule" },
    createApiRequestNode({
      id: "fetch-contacts",
      label: "Fetch from CRM",
      method: "GET",
      connectionRef: createUsingaConnectionRef("crm-approved")
    }),
    { id: "transform", type: "transform", label: "Map fields", config: {} }
  ],
  edges: [
    { source: "trigger", target: "fetch-contacts" },
    { source: "fetch-contacts", target: "transform" }
  ]
});

// Validate before sending
const check = validateWorkflowShape(workflow);
if (!check.valid) {
  console.error("Workflow errors:", check.errors);
  process.exit(1);
}

// Send to HelixFlow
const client = new HelixFlowClient();
const created = await client.createWorkflow(workflow);
console.log("Created workflow:", created);
```

## Types

### `WorkflowNode`

```ts
{
  id: string;
  type: "trigger" | "api" | "transform" | "condition" | "output" | string;
  label: string;
  config?: Record<string, unknown>;
}
```

### `WorkflowEdge`

```ts
{
  id?: string;
  source: string;
  target: string;
}
```

### `WorkflowDefinition`

```ts
{
  name: string;
  status?: string;
  failurePolicy?: string;
  retry?: { attempts: number; backoff: string };
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}
```

## License

MIT
