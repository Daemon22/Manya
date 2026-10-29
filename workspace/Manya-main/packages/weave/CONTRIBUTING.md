# Contributing to @manya/weave

## Code style
- TypeScript strict mode mandatory.
- `.js` import specifiers in source (NodeNext convention).
- No external runtime dependencies — only Node built-ins.
- All public symbols carry JSDoc comments.
- Pure functions where possible — layouts, filters, search, and exporters take a `Graph` and return new values without mutation.

## Testing
- Tests use jest + ts-jest. Run from monorepo root: `npx jest packages/weave --no-coverage`.
- Type-check with: `npx tsc --noEmit -p packages/weave/tsconfig.json`.
- Layout tests must be deterministic — pass an explicit `seed` to `forceDirected` and assert against exact coordinate values where the algorithm permits (e.g. `grid`).
- Every new public function should ship with at least one positive and one negative test case.

## Adding a new layout algorithm
1. Implement the algorithm in a new file under `src/layout/` (or add to `layout.ts`).
2. The signature must be `(graph: Graph, options?: <YourOptions>) => Layout`, where `Layout = Map<NodeID, Point>`.
3. Throw `LayoutError` for invalid input (e.g. empty graph, missing root).
4. Re-export from `src/layout/index.ts` and `src/index.ts`.
5. Add at least two unit tests (one happy path, one error path).
6. Update `docs/API.md` and `README.md`.

## Adding a new exporter
1. Implement in `src/export/exporter.ts`. Signature: `(graph: Graph, ...) => string`.
2. Throw `ExportError` for malformed input (e.g. missing layout positions).
3. Re-export from `src/export/index.ts` and `src/index.ts`.
4. Test that output contains expected structural markers (e.g. `digraph`, `flowchart`, `<svg`).
5. Always escape text content for the target format — XML-escape for SVG, JSON-escape for JSON, etc.

## Adding a new search algorithm
1. Implement in `src/search/search.ts`.
2. Return either a `SearchResult[]` (for text search) or a `NodeID[] | null` (for path finding).
3. Handle missing nodes gracefully — return `null` or `[]` rather than throwing.
4. Test edge cases: missing start/target, start === target, disconnected components.

## Licensing
Apache-2.0, attributed to the Manya Hael Foundation. See root [CONTRIBUTING.md](../../CONTRIBUTING.md).
