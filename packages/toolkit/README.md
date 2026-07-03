# @manya/toolkit

Shared manifests, capability boundaries, and sync contracts for Manya tools.

## What It Does

This package provides the shared contract layer for the Manya tool ecosystem. Each tool in Manya declares a **manifest** that specifies:

- **Identity** -- who the tool is (`id`, `name`, `purpose`)
- **Owned capabilities** -- what the tool is responsible for (`owns`)
- **Off-limits capabilities** -- what the tool must not touch (`handsOff`)
- **Sync channels** -- how the tool communicates with other tools (`syncChannels`)

The core rule: no two tools may own the same capability. This package provides the types and helpers to declare and enforce that rule.

## API Reference

### `MANYA_FOUNDATION`

```js
{ name: "Manya", principle: "synchronized tools with distinct product ownership" }
```

Foundation identity referenced by all tool manifests.

### `capabilityOwners`

```js
{ apiKeyVault: "usinga-api-nexus", providerHealth: "usinga-api-nexus", ... }
```

Maps every known capability to the tool that owns it.

### `createToolManifest(input)`

Creates a frozen, immutable tool manifest.

| Parameter      | Type       | Required | Description                        |
|---------------|------------|----------|------------------------------------|
| `id`          | `string`   | Yes      | Unique tool identifier             |
| `name`        | `string`   | Yes      | Human-readable tool name           |
| `purpose`     | `string`   | Yes      | What the tool does                 |
| `owns`        | `string[]` | No       | Capabilities this tool owns        |
| `handsOff`    | `string[]` | No       | Capabilities this tool must avoid  |
| `syncChannels`| `string[]` | No       | Cross-tool sync channel names      |

Returns a `Readonly<ToolManifest>`. Throws if `id`, `name`, or `purpose` is missing.

### `assertDistinctCapabilities(manifests)`

Checks whether a set of manifests have non-overlapping capability ownership.

| Parameter   | Type              | Description                    |
|------------|-------------------|--------------------------------|
| `manifests`| `ToolManifest[]`  | Manifests to validate          |

Returns `{ distinct: boolean, overlaps: CapabilityOverlap[] }`. If `distinct` is `false`, `overlaps` lists each capability claimed by more than one tool.

### `usingaManifest`

Pre-built manifest for **uSINGA - API NEXUS**. Owns `apiKeyVault`, `providerHealth`, `providerCredits`, and `smartProviderRouting`.

### `helixFlowManifest`

Pre-built manifest for **HelixFlow**. Owns `workflowDagBuilder`, `dependencyScheduler`, `workflowExecutionLogs`, and `workflowFailurePolicies`.

## Usage

```js
import {
  createToolManifest,
  assertDistinctCapabilities,
  usingaManifest,
  helixFlowManifest
} from "@manya/toolkit";

// Create a custom tool manifest
const myTool = createToolManifest({
  id: "my-tool",
  name: "My Tool",
  purpose: "Handles custom reporting.",
  owns: ["customReports"],
  handsOff: ["apiKeyVault", "workflowDagBuilder"],
  syncChannels: ["report-generated"]
});

// Validate that no two tools own the same capability
const result = assertDistinctCapabilities([usingaManifest, helixFlowManifest, myTool]);

if (!result.distinct) {
  for (const overlap of result.overlaps) {
    console.error(`Conflict: "${overlap.capability}" claimed by ${overlap.owners.join(" and ")}`);
  }
}
```

## Types

### `ToolManifest`

```ts
Readonly<{
  foundation: string;
  id: string;
  name: string;
  purpose: string;
  owns: string[];
  handsOff: string[];
  syncChannels: string[];
}>
```

### `CapabilityOverlap`

```ts
{
  capability: string;
  owners: string[];
}
```

## License

MIT
