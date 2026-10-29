/**
 * @manya/weave — graph filtering.
 *
 * Filtering produces a new `Graph` (subgraph) containing only the nodes/edges
 * that satisfy the predicate. All filters preserve the `directed` flag.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Node, Edge, NodeID } from '../types.js';
import { Graph } from '../graph/graph.js';
/**
 * Filter nodes by label.
 *
 * @param graph input
 * @param predicate applied to each node's label; truthy → kept
 */
export declare function filterByLabel(graph: Graph, predicate: (label: string) => boolean): Graph;
/**
 * Filter nodes by `type`.
 *
 * @param graph input
 * @param type exact type string to match; undefined → nodes with no type
 */
export declare function filterByType(graph: Graph, type: string | undefined): Graph;
/**
 * Filter edges by `type`, keeping all nodes but only matching edges.
 */
export declare function filterByEdgeType(graph: Graph, type: string | undefined): Graph;
/**
 * Keep only the connected component containing `nodeId`.
 */
export declare function filterByComponent(graph: Graph, nodeId: NodeID): Graph;
/**
 * Keep only nodes within `maxDepth` hops of `rootId` (BFS).
 *
 * Edges between kept nodes are preserved. The root is always included.
 */
export declare function filterByDepth(graph: Graph, rootId: NodeID, maxDepth: number): Graph;
/** Keep only nodes whose properties match a predicate. */
export declare function filterByProperty(graph: Graph, predicate: (properties: Record<string, unknown> | undefined) => boolean): Graph;
/** Convenience: filter nodes by an arbitrary predicate. */
export declare function filterNodes(graph: Graph, predicate: (node: Node) => boolean): Graph;
/** Convenience: filter edges by an arbitrary predicate (nodes preserved). */
export declare function filterEdges(graph: Graph, predicate: (edge: Edge) => boolean): Graph;
//# sourceMappingURL=filter.d.ts.map