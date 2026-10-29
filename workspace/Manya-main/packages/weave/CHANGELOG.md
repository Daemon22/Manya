# Changelog

All notable changes to `@manya/weave` are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Adheres to [SemVer](https://semver.org/).

## [1.0.0] — 2024-01-15
### Added
- Initial release.
- `Graph` class with directed/undirected modes, add/remove nodes & edges, O(1) adjacency queries, in/out degree, neighbors, predecessors, successors.
- Cycle detection (DFS-based for directed, union-find for undirected).
- Topological sort (Kahn's algorithm, deterministic).
- Connected components and BFS depths.
- Layout algorithms: `forceDirected` (Fruchterman-Reingold, seeded), `hierarchical` (longest-path layering), `radial` (concentric rings), `grid` (regular grid).
- Seeded PRNG (`mulberry32`) for deterministic layouts.
- Filtering: `filterByLabel`, `filterByType`, `filterByEdgeType`, `filterByComponent`, `filterByDepth`, `filterByProperty`, `filterNodes`, `filterEdges`.
- Search: `search` (exact text), `fuzzySearch` (Levenshtein token similarity), `bfsPath` (shortest unweighted), `dijkstra` (shortest weighted). Plus `levenshtein` and `similarity` primitives.
- Exporters: `toJSON`, `toDot` (Graphviz), `toMermaid` (Mermaid flowchart), `toSVG` (basic positional).
- `renderToSVG` with configurable `RenderConfig` (colors, sizes, labels, arrow markers).
- Topology tracking: `takeSnapshot`, `diffSnapshots`, `TopologyTracker` with rolling history.
- Interactive primitives: `SelectionModel`, `Viewport`, `applyViewport`, `inverseViewport`, `panTo`, `zoomAt`.
- Typed error hierarchy: `WeaveError`, `GraphError`, `LayoutError`, `ExportError`.
- Structured logging with secret scrubbing (`ConsoleLogger`, `SilentLogger`).
- Comprehensive unit test suite (105 tests).
