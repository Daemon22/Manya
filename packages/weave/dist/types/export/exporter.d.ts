/**
 * @manya/weave — graph exporters.
 *
 * Serialize a graph to multiple formats:
 *   - `toJSON`   — JSON string of the graph shape.
 *   - `toDot`    — Graphviz DOT.
 *   - `toMermaid`— Mermaid flowchart.
 *   - `toSVG`    — minimal SVG using absolute positions from a layout.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Layout } from '../types.js';
import type { Graph } from '../graph/graph.js';
/**
 * Serialize the graph to a JSON string.
 *
 * The shape is `{ directed, nodes: [...], edges: [...] }`.
 */
export declare function toJSON(graph: Graph): string;
/**
 * Serialize the graph to Graphviz DOT.
 *
 * Uses `digraph` for directed graphs and `graph` for undirected. Edge
 * operators are `->` and `--` respectively.
 */
export declare function toDot(graph: Graph, name?: string): string;
/**
 * Serialize the graph to a Mermaid flowchart string.
 *
 * Uses `flowchart TD` for directed graphs and `flowchart LR` for undirected
 * (Mermaid has no first-class undirected flowchart; LR is the closest visual).
 */
export declare function toMermaid(graph: Graph): string;
/**
 * Render a minimal SVG using absolute positions from a layout.
 *
 * This is intentionally simple. For a full-featured renderer with configurable
 * colors, fonts, and canvas size, use `renderToSVG` from `@manya/weave/render`.
 *
 * @param graph input graph
 * @param layout node positions
 * @param width canvas width (default 800)
 * @param height canvas height (default 600)
 */
export declare function toSVG(graph: Graph, layout: Layout, width?: number, height?: number): string;
//# sourceMappingURL=exporter.d.ts.map