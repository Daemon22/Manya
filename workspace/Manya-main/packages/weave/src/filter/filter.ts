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

/** Rebuild a subgraph containing only the given node ids (and the edges between them). */
function subgraph(graph: Graph, keepIds: Set<NodeID>): Graph {
  const out = new Graph(graph.directed);
  const nodes = graph.nodes.filter(n => keepIds.has(n.id));
  out.addNodes(nodes);
  const edges = graph.edges.filter(e => keepIds.has(e.source) && keepIds.has(e.target));
  out.addEdges(edges);
  return out;
}

/**
 * Filter nodes by label.
 *
 * @param graph input
 * @param predicate applied to each node's label; truthy → kept
 */
export function filterByLabel(graph: Graph, predicate: (label: string) => boolean): Graph {
  const keep = new Set<NodeID>();
  for (const n of graph.nodes) if (predicate(n.label)) keep.add(n.id);
  return subgraph(graph, keep);
}

/**
 * Filter nodes by `type`.
 *
 * @param graph input
 * @param type exact type string to match; undefined → nodes with no type
 */
export function filterByType(graph: Graph, type: string | undefined): Graph {
  const keep = new Set<NodeID>();
  for (const n of graph.nodes) {
    if (type === undefined && n.type === undefined) keep.add(n.id);
    else if (n.type === type) keep.add(n.id);
  }
  return subgraph(graph, keep);
}

/**
 * Filter edges by `type`, keeping all nodes but only matching edges.
 */
export function filterByEdgeType(graph: Graph, type: string | undefined): Graph {
  const out = new Graph(graph.directed);
  out.addNodes(graph.nodes);
  for (const e of graph.edges) {
    if (type === undefined && e.type === undefined) out.addEdge(e);
    else if (e.type === type) out.addEdge(e);
  }
  return out;
}

/**
 * Keep only the connected component containing `nodeId`.
 */
export function filterByComponent(graph: Graph, nodeId: NodeID): Graph {
  const comp = graph.componentOf(nodeId);
  return subgraph(graph, new Set(comp));
}

/**
 * Keep only nodes within `maxDepth` hops of `rootId` (BFS).
 *
 * Edges between kept nodes are preserved. The root is always included.
 */
export function filterByDepth(graph: Graph, rootId: NodeID, maxDepth: number): Graph {
  if (!graph.hasNode(rootId)) return new Graph(graph.directed);
  const depths = graph.bfsDepths(rootId, maxDepth);
  return subgraph(graph, new Set(depths.keys()));
}

/** Keep only nodes whose properties match a predicate. */
export function filterByProperty(
  graph: Graph,
  predicate: (properties: Record<string, unknown> | undefined) => boolean,
): Graph {
  const keep = new Set<NodeID>();
  for (const n of graph.nodes) if (predicate(n.properties)) keep.add(n.id);
  return subgraph(graph, keep);
}

/** Convenience: filter nodes by an arbitrary predicate. */
export function filterNodes(graph: Graph, predicate: (node: Node) => boolean): Graph {
  const keep = new Set<NodeID>();
  for (const n of graph.nodes) if (predicate(n)) keep.add(n.id);
  return subgraph(graph, keep);
}

/** Convenience: filter edges by an arbitrary predicate (nodes preserved). */
export function filterEdges(graph: Graph, predicate: (edge: Edge) => boolean): Graph {
  const out = new Graph(graph.directed);
  out.addNodes(graph.nodes);
  for (const e of graph.edges) if (predicate(e)) out.addEdge(e);
  return out;
}
