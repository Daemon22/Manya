/**
 * @manya/weave — layout algorithms.
 *
 * Computes 2-D positions for graph nodes. Four algorithms are provided:
 *   - `forceDirected` — simple Fruchterman-Reingold force simulation.
 *   - `hierarchical` — top-down layered layout (Sugiyama-style simplified).
 *   - `radial` — concentric rings around a root.
 *   - `grid` — regular rectangular grid.
 *
 * Every algorithm is **deterministic** for a given input: the force-directed
 * layout accepts a numeric `seed` and uses a seeded PRNG (mulberry32).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { NodeID, Layout } from '../types.js';
import type { Graph } from '../graph/graph.js';
/** Common options for layout algorithms. */
export interface LayoutOptions {
    /** Canvas width. Default 800. */
    width?: number;
    /** Canvas height. Default 600. */
    height?: number;
    /** Padding from canvas edges. Default 40. */
    padding?: number;
}
/** Force-directed layout options. */
export interface ForceDirectedOptions extends LayoutOptions {
    /** Number of simulation iterations. Default 300. */
    iterations?: number;
    /** Numeric RNG seed for deterministic output. Default 1. */
    seed?: number;
    /** Ideal edge length. Default computed from canvas. */
    idealLength?: number;
    /** Repulsion constant. Default 1.0. */
    repulsion?: number;
}
/** Hierarchical layout options. */
export interface HierarchicalOptions extends LayoutOptions {
    /** Vertical gap between layers. Default 80. */
    layerGap?: number;
    /** Horizontal gap between nodes in a layer. Default 80. */
    nodeGap?: number;
    /** Optional root node id; if absent, nodes with in-degree 0 are used. */
    root?: NodeID;
}
/** Radial layout options. */
export interface RadialOptions extends LayoutOptions {
    /** Root node id at the center. If absent, the first node is used. */
    root?: NodeID;
    /** Gap between rings. Default 100. */
    ringGap?: number;
}
/** Grid layout options. */
export interface GridOptions extends LayoutOptions {
    /** Optional number of columns; if absent, computed as ceil(sqrt(n)). */
    columns?: number;
    /** Horizontal gap. Default 80. */
    cellWidth?: number;
    /** Vertical gap. Default 80. */
    cellHeight?: number;
}
/**
 * Seeded PRNG (mulberry32). Returns a function producing floats in [0, 1).
 */
export declare function mulberry32(seed: number): () => number;
/**
 * Force-directed layout (simplified Fruchterman-Reingold).
 *
 * @param graph input graph
 * @param opts  options
 * @returns layout map
 */
export declare function forceDirected(graph: Graph, opts?: ForceDirectedOptions): Layout;
/**
 * Hierarchical top-down layered layout.
 *
 * Layers are computed via longest-path layering from a root set. Nodes within
 * a layer are placed left-to-right in alphabetical id order for determinism.
 */
export declare function hierarchical(graph: Graph, opts?: HierarchicalOptions): Layout;
/**
 * Radial layout — concentric rings around a root.
 *
 * The root is at the canvas center; nodes are placed on rings according to
 * their BFS depth from the root, evenly spaced on each ring.
 */
export declare function radial(graph: Graph, opts?: RadialOptions): Layout;
/**
 * Grid layout — regular rectangular grid.
 *
 * Nodes are placed in row-major order, sorted by id for determinism.
 */
export declare function grid(graph: Graph, opts?: GridOptions): Layout;
//# sourceMappingURL=layout.d.ts.map