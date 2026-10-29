# @manya/weave — API Reference

> Complete TypeScript API reference for `@manya/weave` v1.0.0.

## Contents
- [Types](#types)
- [Errors](#errors)
- [Logging](#logging)
- [Graph](#graph)
- [Layout](#layout)
- [Filter](#filter)
- [Search](#search)
- [Export](#export)
- [Render](#render)
- [Topology](#topology)
- [Interactive](#interactive)

---

## Types

### `NodeID`
```ts
type NodeID = string;
```

### `EdgeID`
```ts
type EdgeID = string;
```

### `Node`
```ts
interface Node {
  id: NodeID;
  label: string;
  type?: string;
  properties?: Record<string, unknown>;
}
```

### `Edge`
```ts
interface Edge {
  id: EdgeID;
  source: NodeID;
  target: NodeID;
  label?: string;
  type?: string;
  weight?: number;
  properties?: Record<string, unknown>;
}
```

### `Point`
```ts
interface Point { x: number; y: number; }
```

### `Layout`
```ts
type Layout = Map<NodeID, Point>;
```

### `RenderConfig`
```ts
interface RenderConfig {
  width: number;
  height: number;
  nodeRadius: number;
  fontSize: number;
  nodeColor: string;
  edgeColor: string;
  backgroundColor: string;
  showLabels: boolean;
}
```

### `TopologySnapshot`
```ts
interface TopologySnapshot {
  takenAt: string;       // ISO 8601
  graph: Graph;
}
```

### `TopologyDiff`
```ts
interface TopologyDiff {
  addedNodes: Node[];
  removedNodes: NodeID[];
  addedEdges: Edge[];
  removedEdges: EdgeID[];
}
```

### `Viewport`
```ts
interface Viewport {
  centerX: number;
  centerY: number;
  zoom: number;  // must be > 0
}
```

### `SearchResult`
```ts
interface SearchResult {
  nodeId: NodeID;
  score: number;          // [0, 1]
  matchedField: string;   // 'label' | 'type' | property key
}
```

### `Graph` (interface — structural shape)
```ts
interface Graph {
  readonly directed: boolean;
  readonly nodes: Node[];
  readonly edges: Edge[];
}
```
The canonical implementation is the `Graph` class (see [Graph](#graph)).

---

## Errors

All errors extend `WeaveError` and carry a stable `code` string.

| Class | Code | When |
| --- | --- | --- |
| `WeaveError` | `WEAVE_ERROR` | Base class |
| `GraphError` | `GRAPH_ERROR` | Invalid graph operations (duplicate ids, missing nodes, self-loops, cycle in topo sort, undirected topo sort) |
| `LayoutError` | `LAYOUT_ERROR` | Layout failure (empty graph, missing root) |
| `ExportError` | `EXPORT_ERROR` | Export/render failure (missing layout positions, etc.) |

```ts
class WeaveError extends Error {
  readonly code: string;
  readonly cause?: unknown;
}
```

---

## Logging

### `Logger`
```ts
interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}
```

### `LogLevel`
```ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
```

### `ConsoleLogger`
```ts
new ConsoleLogger(level?: LogLevel)  // default 'info'
```
Emits JSON lines to stdout/stderr. Secrets are scrubbed before emission.

### `SilentLogger`
No-op logger.

### Secret scrubbing
- `SCRUBBED_FIELD_NAMES: readonly string[]` — `['token', 'secret', 'apiKey', 'password', 'credentials', 'cookie']`
- `shouldScrubField(name: string): boolean`
- `scrubMetadata(meta: unknown): unknown` — recursively redacts sensitive fields, replacing values with `'[redacted]'`.

---

## Graph

### `class Graph`
```ts
new Graph(directed?: boolean)  // default false
```

#### Node operations
- `addNode(node: Node): this` — throws `GraphError` on duplicate id.
- `addNodes(nodes: Iterable<Node>): this`
- `removeNode(id: NodeID): this` — also removes incident edges. No-op if missing.
- `getNode(id: NodeID): Node | undefined`
- `hasNode(id: NodeID): boolean`
- `updateNode(id: NodeID, patch: Partial<Omit<Node, 'id'>>): this` — throws if missing.

#### Edge operations
- `addEdge(edge: Edge): this` — throws if endpoints missing or self-loop.
- `addEdges(edges: Iterable<Edge>): this`
- `removeEdge(id: EdgeID): this` — no-op if missing.
- `getEdge(id: EdgeID): Edge | undefined`
- `hasEdge(id: EdgeID): boolean`

#### Queries
- `nodes: Node[]` (getter, snapshot)
- `edges: Edge[]` (getter, snapshot)
- `size(): number` — node count
- `edgeCount(): number`
- `successors(id): NodeID[]`
- `predecessors(id): NodeID[]`
- `neighbors(id): NodeID[]`
- `outDegree(id): number`
- `inDegree(id): number`
- `degree(id): number`
- `directed: boolean` (readonly)

#### Algorithms
- `hasCycle(): boolean`
- `topologicalSort(): NodeID[]` — throws `GraphError` if undirected or cyclic. Deterministic (Kahn's algorithm with sorted queue).
- `findConnectedComponents(): NodeID[][]` — weakly connected for directed graphs.
- `componentOf(id: NodeID): NodeID[]` — sorted ids of the component containing `id`.
- `bfsDepths(start: NodeID, maxDepth?: number): Map<NodeID, number>`
- `clone(): Graph` — deep copy.

### `createGraph(nodes, edges?, directed?)`
```ts
function createGraph(
  nodes: Iterable<Node>,
  edges?: Iterable<Edge>,
  directed?: boolean,
): Graph
```

---

## Layout

All layouts return `Layout = Map<NodeID, Point>`. All throw `LayoutError` on empty input.

### `mulberry32(seed: number): () => number`
Seeded PRNG returning floats in [0, 1).

### `forceDirected(graph, opts?): Layout`
```ts
interface ForceDirectedOptions extends LayoutOptions {
  iterations?: number;   // default 300
  seed?: number;         // default 1
  idealLength?: number;  // default min(width, height) / sqrt(n)
  repulsion?: number;    // default 1.0
}
```
Fruchterman-Reingold force simulation. Deterministic for a given `seed`.

### `hierarchical(graph, opts?): Layout`
```ts
interface HierarchicalOptions extends LayoutOptions {
  layerGap?: number;  // default 80
  nodeGap?: number;   // default 80
  root?: NodeID;      // optional; otherwise in-degree-0 nodes
}
```
Top-down layered layout via longest-path layering (directed) or BFS depth (undirected).

### `radial(graph, opts?): Layout`
```ts
interface RadialOptions extends LayoutOptions {
  root?: NodeID;     // default: first node
  ringGap?: number;  // default 100
}
```
Concentric rings; root at canvas center. Throws `LayoutError` if `root` is missing.

### `grid(graph, opts?): Layout`
```ts
interface GridOptions extends LayoutOptions {
  columns?: number;     // default ceil(sqrt(n))
  cellWidth?: number;   // default 80
  cellHeight?: number;  // default 80
}
```
Regular grid in row-major id-sorted order.

### `LayoutOptions` (base)
```ts
interface LayoutOptions {
  width?: number;    // default 800
  height?: number;   // default 600
  padding?: number;  // default 40
}
```

---

## Filter

All filters return a **new** `Graph` (subgraph) preserving the original `directed` flag.

- `filterByLabel(graph, predicate: (label: string) => boolean): Graph`
- `filterByType(graph, type: string | undefined): Graph` — `undefined` matches nodes with no type.
- `filterByEdgeType(graph, type: string | undefined): Graph` — keeps all nodes, only matching edges.
- `filterByComponent(graph, nodeId: NodeID): Graph` — the connected component containing `nodeId`.
- `filterByDepth(graph, rootId: NodeID, maxDepth: number): Graph` — BFS-reachable nodes within `maxDepth` hops.
- `filterByProperty(graph, predicate: (props?) => boolean): Graph`
- `filterNodes(graph, predicate: (node: Node) => boolean): Graph`
- `filterEdges(graph, predicate: (edge: Edge) => boolean): Graph` — keeps all nodes.

---

## Search

### `levenshtein(a: string, b: string): number`
Edit distance.

### `similarity(a: string, b: string): number`
Levenshtein-based similarity in [0, 1]. `similarity('', '')` is 1.

### `search(graph, query: string): SearchResult[]`
Case-insensitive, punctuation-normalized text search across node labels, type, and stringified property values. Exact match scores 1; substring match scores `query.length / value.length` (lowercased, normalized). Results sorted by score desc, then node id asc. Empty query returns `[]`.

### `fuzzySearch(graph, query: string, threshold?: number): SearchResult[]`
Token-level fuzzy match using Levenshtein similarity. Default threshold 0.3. For each node, takes the max of (best per-token similarity averaged over query tokens) and (whole-string similarity) across all searchable fields.

### `bfsPath(graph, start, target): NodeID[] | null`
Shortest unweighted path (BFS). Returns `[start]` if `start === target`. Returns `null` if no path or if either node is missing.

### `dijkstra(graph, start, target): { path: NodeID[] | null; distance: number }`
Shortest weighted path. Edge weights default to 1. Negative weights are treated as 1. Returns `{ path: null, distance: Infinity }` if no path. Returns `{ path: [start], distance: 0 }` if `start === target`.

---

## Export

### `toJSON(graph): string`
Indented JSON of `{ directed, nodes, edges }`.

### `toDot(graph, name?): string`
Graphviz DOT. `digraph` for directed, `graph` for undirected. Edge operators `->` and `--` respectively. Node labels always quoted. Bare ids (alphanumeric + underscore, not starting with a digit) are emitted unquoted; others are JSON-quoted.

### `toMermaid(graph): string`
Mermaid flowchart. `flowchart TD` for directed graphs, `flowchart LR` for undirected. Node ids are sanitized to `[A-Za-z0-9_]+`. Edge labels rendered with `-- "label" -->` syntax.

### `toSVG(graph, layout, width?, height?): string`
Minimal SVG. Computes the bounding box from layout positions and clamps to at least `[0,width] × [0,height]`. Nodes are `<circle r="15">` with text labels above. Throws `ExportError` if the layout is missing a node position.

---

## Render

### `RenderConfig`
See [Types](#renderconfig).

### `DEFAULT_RENDER_CONFIG`
```ts
{
  width: 800, height: 600,
  nodeRadius: 18, fontSize: 12,
  nodeColor: '#6ba8d6', edgeColor: '#888888',
  backgroundColor: '#ffffff', showLabels: true,
}
```

### `mergeRenderConfig(partial?: Partial<RenderConfig>): RenderConfig`
Merge a partial config with defaults.

### `renderToSVG(graph, layout, config?): string`
Full SVG document with:
- configurable canvas size and colors,
- `<rect>` background,
- `<marker>` arrowhead for directed graphs (edges get `marker-end`),
- edges shortened to node boundaries,
- node labels above each circle,
- edge labels at the midpoint.

Throws `ExportError` if the layout is missing any node position. All text content is XML-escaped.

---

## Topology

### `takeSnapshot(graph, takenAt?): TopologySnapshot`
Deep-copy the graph's nodes/edges into an immutable snapshot. `takenAt` defaults to `new Date().toISOString()`.

### `diffSnapshots(a, b): TopologyDiff`
Structural diff comparing two snapshots by node/edge id. Added entries are taken from `b`.

### `class TopologyTracker`
```ts
new TopologyTracker(maxHistory?: number)  // default 10; must be >= 1
```
- `snapshot(graph, takenAt?): TopologySnapshot` — record current state; returns the new snapshot. Trims history to `maxHistory`.
- `snapshots(): TopologySnapshot[]` — chronological copy.
- `current(): TopologySnapshot | undefined`
- `previous(): TopologySnapshot | undefined`
- `diff(): TopologyDiff | null` — diff the two most recent snapshots, or `null` if < 2 exist.
- `diffAt(i, j): TopologyDiff | null` — diff two retained snapshots by index.
- `reset(): void`

---

## Interactive

### `class SelectionModel`
Mutable selection of node and edge ids.

- `selectNode(id): this`
- `selectEdge(id): this`
- `deselectNode(id): this`
- `deselectEdge(id): this`
- `toggleNode(id): boolean` — returns new state.
- `toggleEdge(id): boolean` — returns new state.
- `isNodeSelected(id): boolean`
- `isEdgeSelected(id): boolean`
- `selectedNodeIds(): NodeID[]` — sorted.
- `selectedEdgeIds(): EdgeID[]` — sorted.
- `nodeCount(): number`
- `edgeCount(): number`
- `clear(): this`
- `isEmpty(): boolean`
- `setSelection(nodes: Iterable<NodeID>, edges?: Iterable<EdgeID>): this`
- `toJSON(): { nodes: NodeID[]; edges: EdgeID[] }`

### `Viewport`
See [Types](#viewport).

### `DEFAULT_VIEWPORT`
```ts
{ centerX: 0, centerY: 0, zoom: 1 }
```
Also exported as `IDENTITY_VIEWPORT`.

### `applyViewport(point: Point, viewport: Viewport): Point`
Graph → screen transform: `{ x: (point.x - centerX) * zoom, y: (point.y - centerY) * zoom }`. Throws `RangeError` if `zoom` is non-positive or non-finite.

### `inverseViewport(point: Point, viewport: Viewport): Point`
Screen → graph transform (inverse of `applyViewport`).

### `panTo(graphPoint: Point, screenPoint: Point, zoom: number): Viewport`
Build a viewport that places `graphPoint` at `screenPoint` on screen.

### `zoomAt(viewport: Viewport, anchor: Point, factor: number): Viewport`
Return a new viewport zoomed by `factor` while keeping `anchor` (a screen-space point) fixed at the same graph-space location.
