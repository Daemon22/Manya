# @manya/weave

> Interactive visualization substrate for the MANYA Intelligence OS — dependency graphs, knowledge graphs, event flows, architecture diagrams, live system topology, and pan/zoom exploration with multi-format export.

`@manya/weave` is the visualization engine of the **MANYA Intelligence OS** — a sovereign, modular, local-first intelligence operating system conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the **Manya Hael Foundation**.

The package provides an in-memory directed/undirected graph model with cycle detection and topological sort, four deterministic layout algorithms (force-directed, hierarchical, radial, grid), graph filtering by label/type/component/depth, text and fuzzy search with BFS and Dijkstra path finding, export to JSON / Graphviz DOT / Mermaid / SVG, a configurable SVG renderer with arrow markers and labels, a live topology tracker with structural diffing, and interactive primitives (selection model, pan/zoom viewport).

---

## Vision

The Manya Hael Foundation stewards the MANYA Intelligence OS as a long-horizon, mission-driven project. `@manya/weave` extends that sovereignty into the visualization domain: **your graphs, your layouts, your topology history — yours alone.**

- **Sovereign.** No network calls, no DOM dependency, no external rendering service. Pure TypeScript that runs in Node or in the browser.
- **Deterministic.** Every layout algorithm accepts a numeric seed and produces byte-identical output for byte-identical input.
- **Honest.** No magic "auto-layout oracle" — algorithms are simple, well-known, and explicit. Force-directed uses Fruchterman-Reingold with a seeded PRNG.
- **Exportable.** One graph, four formats (JSON, DOT, Mermaid, SVG) plus a full-featured SVG renderer.
- **Composable.** Filter, search, layout, render — each step is a pure function on an immutable graph snapshot.

---

## Features

| Area | What you get |
| --- | --- |
| **Graph model** | `Graph` class with directed/undirected modes, add/remove nodes & edges, O(1) adjacency queries, in/out degree, neighbors, predecessors, successors. |
| **Algorithms** | Cycle detection (DFS for directed, union-find for undirected), topological sort (Kahn's, deterministic), connected components, BFS depths. |
| **Layouts** | `forceDirected` (Fruchterman-Reingold, seeded), `hierarchical` (longest-path layering), `radial` (concentric rings), `grid` (regular grid). All return `Map<nodeId, {x, y}>`. |
| **Filtering** | By label predicate, by node type, by edge type, by connected component, by BFS depth-from-root, by property predicate, plus generic `filterNodes`/`filterEdges`. |
| **Search** | Exact text search across labels/types/properties, fuzzy search with Levenshtein-based token scoring, BFS shortest path, Dijkstra weighted shortest path. |
| **Export** | `toJSON`, `toDot` (Graphviz), `toMermaid` (Mermaid flowchart), `toSVG` (basic positional). |
| **Render** | `renderToSVG` with `RenderConfig` (width, height, nodeRadius, fontSize, colors, showLabels), arrow markers for directed graphs, edge label rendering. |
| **Topology** | `TopologySnapshot`, `diffSnapshots` for added/removed nodes & edges, `TopologyTracker` with rolling history and `diff()`. |
| **Interactive** | `SelectionModel` (toggle/select/clear nodes & edges), `Viewport` (centerX/centerY/zoom), `applyViewport`/`inverseViewport`/`panTo`/`zoomAt`. |
| **Logging** | `Logger` interface, `ConsoleLogger` with secret-scrubbing, `SilentLogger`. |

---

## Install

```bash
npm install @manya/weave
```

Requires Node.js 18+. No external runtime dependencies — only Node built-ins.

---

## Quick start

### 1. Build and lay out a dependency graph

```ts
import { createGraph, hierarchical, renderToSVG } from '@manya/weave';

const graph = createGraph(
  [
    { id: 'web',  label: 'Web Client',   type: 'service' },
    { id: 'api',  label: 'API Gateway',  type: 'service' },
    { id: 'auth', label: 'Auth Service', type: 'service' },
    { id: 'db',   label: 'Database',     type: 'db' },
  ],
  [
    { id: 'e1', source: 'web',  target: 'api',  label: 'calls' },
    { id: 'e2', source: 'api',  target: 'auth', label: 'verifies' },
    { id: 'e3', source: 'api',  target: 'db',   label: 'queries' },
  ],
  true, // directed
);

const layout = hierarchical(graph, { width: 800, height: 600 });
const svg = renderToSVG(graph, layout, { nodeColor: '#5b8def' });
console.log(svg); // full <svg>...</svg> document
```

### 2. Detect cycles and topologically sort

```ts
import { createGraph } from '@manya/weave';

const dag = createGraph(
  [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
  [
    { id: 'e1', source: 'a', target: 'b' },
    { id: 'e2', source: 'b', target: 'c' },
  ],
  true,
);

console.log(dag.hasCycle());             // false
console.log(dag.topologicalSort());      // ['a', 'b', 'c']
```

### 3. Filter, search, and find the shortest path

```ts
import { createGraph, filterByType, search, bfsPath, dijkstra } from '@manya/weave';

const graph = createGraph(
  [
    { id: 'auth',    label: 'Auth',    type: 'service' },
    { id: 'billing', label: 'Billing', type: 'service' },
    { id: 'db',      label: 'DB',      type: 'db' },
  ],
  [
    { id: 'e1', source: 'auth',    target: 'db', weight: 1 },
    { id: 'e2', source: 'billing', target: 'db', weight: 5 },
  ],
  false,
);

const services = filterByType(graph, 'service');   // 2 nodes, 0 edges (db dropped)
const hits = search(graph, 'DB');                  // [{ nodeId: 'db', score: 1, matchedField: 'label' }]
const path = bfsPath(graph, 'auth', 'db');         // ['auth', 'db']
const shortest = dijkstra(graph, 'billing', 'db'); // { path: ['billing', 'db'], distance: 5 }
```

### 4. Track live topology over time

```ts
import { createGraph, TopologyTracker } from '@manya/weave';

const tracker = new TopologyTracker(10);
const v1 = createGraph(
  [{ id: 'api', label: 'API' }, { id: 'db', label: 'DB' }],
  [{ id: 'e1', source: 'api', target: 'db' }],
);
tracker.snapshot(v1, '2024-01-01T00:00:00Z');

const v2 = v1.clone();
v2.addNode({ id: 'cache', label: 'Cache' });
v2.addEdge({ id: 'e2', source: 'api', target: 'cache' });
tracker.snapshot(v2, '2024-01-01T00:01:00Z');

const diff = tracker.diff()!;
console.log(diff.addedNodes.map(n => n.id));   // ['cache']
console.log(diff.addedEdges.map(e => e.id));   // ['e2']
console.log(diff.removedNodes);                // []
```

### 5. Export to Graphviz DOT, Mermaid, and JSON

```ts
import { createGraph, toDot, toMermaid, toJSON } from '@manya/weave';

const g = createGraph(
  [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }],
  [{ id: 'e1', source: 'a', target: 'b', label: 'calls' }],
  true,
);

console.log(toDot(g));      // digraph G { ... "a" -> "b" [label="calls"]; }
console.log(toMermaid(g));  // flowchart TD \n  a["Alpha"] \n  b["Beta"] \n  a -- "calls" --> b
console.log(toJSON(g));     // { "directed": true, "nodes": [...], "edges": [...] }
```

---

## Configuration

### `RenderConfig`

```ts
export interface RenderConfig {
  width: number;            // SVG width, default 800
  height: number;           // SVG height, default 600
  nodeRadius: number;       // node circle radius, default 18
  fontSize: number;         // label font size, default 12
  nodeColor: string;        // node fill, default '#6ba8d6'
  edgeColor: string;        // edge stroke, default '#888888'
  backgroundColor: string;  // canvas fill, default '#ffffff'
  showLabels: boolean;      // render node & edge labels, default true
}
```

Pass a partial config to `renderToSVG` — unspecified fields fall back to `DEFAULT_RENDER_CONFIG` via `mergeRenderConfig`.

### Layout options

All layouts accept `{ width?, height?, padding? }`. Additionally:

| Function | Extra options |
| --- | --- |
| `forceDirected` | `iterations?`, `seed?`, `idealLength?`, `repulsion?` |
| `hierarchical` | `layerGap?`, `nodeGap?`, `root?` |
| `radial` | `root?`, `ringGap?` |
| `grid` | `columns?`, `cellWidth?`, `cellHeight?` |

### `Viewport`

```ts
export interface Viewport {
  centerX: number;
  centerY: number;
  zoom: number; // must be > 0
}
```

`applyViewport(point, viewport)` returns `{ x: (point.x - centerX) * zoom, y: (point.y - centerY) * zoom }`. `inverseViewport` is the inverse. `panTo(graphPoint, screenPoint, zoom)` builds a viewport anchoring a graph point at a screen point. `zoomAt(viewport, anchorScreenPoint, factor)` zooms while keeping an anchor point fixed.

---

## Extending

### Add a custom layout algorithm

```ts
import type { Graph } from '@manya/weave';
import type { Layout, Point } from '@manya/weave';

export function circular(graph: Graph, radius = 200): Layout {
  const layout = new Map<string, Point>();
  const ids = graph.nodes.map(n => n.id).sort();
  const step = (2 * Math.PI) / ids.length;
  ids.forEach((id, i) => {
    layout.set(id, { x: radius * Math.cos(i * step), y: radius * Math.sin(i * step) });
  });
  return layout;
}
```

Layouts return a plain `Map<NodeID, Point>`, so custom algorithms drop in seamlessly with `renderToSVG`, `toSVG`, and any downstream consumer.

---

## Security notes

- **Local-only.** No data leaves the host process. No DOM, no network, no telemetry.
- **No secrets in logs.** `token`, `secret`, `apiKey`, `password`, `credentials`, `cookie` fields are scrubbed by `scrubMetadata`.
- **Safe SVG output.** `renderToSVG` and `toSVG` XML-escape all label text. Do not embed untrusted user input as raw SVG attributes without additional sanitization.
- **Reproducibility.** Identical inputs + identical seeds → identical outputs.

For threat models, see [SECURITY.md](./SECURITY.md) and the root [SECURITY.md](../../SECURITY.md).

---

## Documentation

- [docs/API.md](./docs/API.md) — full TypeScript API reference.
- [CHANGELOG.md](./CHANGELOG.md) — release history.
- [CONTRIBUTING.md](./CONTRIBUTING.md) — package-specific contributor notes.
- [SECURITY.md](./SECURITY.md) — package-specific security surface.
- [LICENSE](./LICENSE) — Apache-2.0.

---

## License

Apache-2.0. Copyright 2024 Manya Hael Foundation. All rights reserved.

Conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the Manya Hael Foundation.
