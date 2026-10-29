# @manya/weave Security Policy

## Scope
`@manya/weave` runs entirely locally. No graph data, layout positions, search queries, or topology snapshots leave the host process. The package has no runtime dependencies on any external library.

## Threat model
- **Adversary:** an attacker who can supply malicious graph data (node labels, edge labels, property values) intended to break out of SVG/Mermaid/DOT output and inject markup into a downstream renderer.
- **Asset:** the integrity of the rendered output (SVG, DOT, Mermaid, JSON) and the host process executing the package.
- **Goal:** ensure that untrusted input cannot produce executable markup in exported formats or trigger crashes/DoS in the layout or search algorithms.

## Security guarantees
1. **No remote calls.** All graph operations, layouts, search, and export are local.
2. **No eval / no Function constructor.** Pure data transformations.
3. **XML escaping in SVG output.** `renderToSVG` and `toSVG` escape `&`, `<`, `>`, `"`, `'` in all text content.
4. **JSON serialization via `JSON.stringify`.** No string concatenation of untrusted data into JSON output.
5. **DOT and Mermaid escaping.** Labels are quoted and embedded punctuation is escaped.
6. **No PII in logs.** `token`, `secret`, `apiKey`, `password`, `credentials`, `cookie` fields are scrubbed by `scrubMetadata`.
7. **Reproducibility.** Identical inputs + identical seeds → identical outputs (no hidden randomness, no wall-clock dependencies in layout algorithms).

## Known limitations
- **SVG attribute injection not covered.** Node ids are used as-is in DOT/Mermaid output and embedded in SVG text. If you cannot trust your node ids, sanitize them before passing them to Weave. The package does not currently validate node/edge id character sets.
- **No bounds on graph size.** Algorithms are O(n²) or worse for large graphs (force-directed all-pairs repulsion, Dijkstra with array-based priority queue). Production deployments should cap input size or implement streaming/parallel variants.
- **Layout is not collision-free.** Force-directed and hierarchical layouts may overlap nodes for dense graphs; the renderer does not perform collision resolution.
- **No streaming export.** All exporters build the entire output string in memory. For very large graphs, write a streaming variant.

## Reporting a vulnerability
See root [SECURITY.md](../../SECURITY.md). Do NOT open a public issue for security vulnerabilities.
