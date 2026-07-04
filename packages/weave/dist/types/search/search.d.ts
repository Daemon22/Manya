/**
 * @manya/weave — graph search and path finding.
 *
 * Provides:
 *   - `search` — exact text search across node labels and properties.
 *   - `fuzzySearch` — token-level fuzzy match using a Levenshtein-based score.
 *   - `bfsPath` — shortest unweighted path (BFS).
 *   - `dijkstra` — shortest weighted path.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { NodeID, SearchResult } from '../types.js';
import type { Graph } from '../graph/graph.js';
/** Levenshtein edit distance. */
export declare function levenshtein(a: string, b: string): number;
/** Similarity score in [0, 1] based on Levenshtein distance. */
export declare function similarity(a: string, b: string): number;
/**
 * Exact (case-insensitive, punctuation-normalized) text search.
 *
 * Returns results sorted by score desc, then node id asc.
 *
 * @param graph input
 * @param query search query
 */
export declare function search(graph: Graph, query: string): SearchResult[];
/**
 * Fuzzy text search.
 *
 * Each node is scored by the best token-level similarity to the query across
 * its searchable fields. Results with score < `threshold` (default 0.3) are
 * dropped.
 *
 * @param graph input
 * @param query search query
 * @param threshold minimum similarity in [0, 1]
 */
export declare function fuzzySearch(graph: Graph, query: string, threshold?: number): SearchResult[];
/**
 * Breadth-first shortest path (unweighted).
 *
 * @returns the path as a list of node ids from `start` to `target`, or `null`
 *          if no path exists. Returns `[start]` if start === target.
 */
export declare function bfsPath(graph: Graph, start: NodeID, target: NodeID): NodeID[] | null;
/**
 * Dijkstra shortest weighted path.
 *
 * Uses edge `weight` (default 1). Returns the path and total distance, or
 * `{ path: null, distance: Infinity }` if no path exists.
 */
export declare function dijkstra(graph: Graph, start: NodeID, target: NodeID): {
    path: NodeID[] | null;
    distance: number;
};
//# sourceMappingURL=search.d.ts.map