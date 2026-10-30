"use strict";
/**
 * @manya-os/weave — graph filtering.
 *
 * Filtering produces a new `Graph` (subgraph) containing only the nodes/edges
 * that satisfy the predicate. All filters preserve the `directed` flag.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterByLabel = filterByLabel;
exports.filterByType = filterByType;
exports.filterByEdgeType = filterByEdgeType;
exports.filterByComponent = filterByComponent;
exports.filterByDepth = filterByDepth;
exports.filterByProperty = filterByProperty;
exports.filterNodes = filterNodes;
exports.filterEdges = filterEdges;
const graph_js_1 = require("../graph/graph.js");
/** Rebuild a subgraph containing only the given node ids (and the edges between them). */
function subgraph(graph, keepIds) {
    const out = new graph_js_1.Graph(graph.directed);
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
function filterByLabel(graph, predicate) {
    const keep = new Set();
    for (const n of graph.nodes)
        if (predicate(n.label))
            keep.add(n.id);
    return subgraph(graph, keep);
}
/**
 * Filter nodes by `type`.
 *
 * @param graph input
 * @param type exact type string to match; undefined → nodes with no type
 */
function filterByType(graph, type) {
    const keep = new Set();
    for (const n of graph.nodes) {
        if (type === undefined && n.type === undefined)
            keep.add(n.id);
        else if (n.type === type)
            keep.add(n.id);
    }
    return subgraph(graph, keep);
}
/**
 * Filter edges by `type`, keeping all nodes but only matching edges.
 */
function filterByEdgeType(graph, type) {
    const out = new graph_js_1.Graph(graph.directed);
    out.addNodes(graph.nodes);
    for (const e of graph.edges) {
        if (type === undefined && e.type === undefined)
            out.addEdge(e);
        else if (e.type === type)
            out.addEdge(e);
    }
    return out;
}
/**
 * Keep only the connected component containing `nodeId`.
 */
function filterByComponent(graph, nodeId) {
    const comp = graph.componentOf(nodeId);
    return subgraph(graph, new Set(comp));
}
/**
 * Keep only nodes within `maxDepth` hops of `rootId` (BFS).
 *
 * Edges between kept nodes are preserved. The root is always included.
 */
function filterByDepth(graph, rootId, maxDepth) {
    if (!graph.hasNode(rootId))
        return new graph_js_1.Graph(graph.directed);
    const depths = graph.bfsDepths(rootId, maxDepth);
    return subgraph(graph, new Set(depths.keys()));
}
/** Keep only nodes whose properties match a predicate. */
function filterByProperty(graph, predicate) {
    const keep = new Set();
    for (const n of graph.nodes)
        if (predicate(n.properties))
            keep.add(n.id);
    return subgraph(graph, keep);
}
/** Convenience: filter nodes by an arbitrary predicate. */
function filterNodes(graph, predicate) {
    const keep = new Set();
    for (const n of graph.nodes)
        if (predicate(n))
            keep.add(n.id);
    return subgraph(graph, keep);
}
/** Convenience: filter edges by an arbitrary predicate (nodes preserved). */
function filterEdges(graph, predicate) {
    const out = new graph_js_1.Graph(graph.directed);
    out.addNodes(graph.nodes);
    for (const e of graph.edges)
        if (predicate(e))
            out.addEdge(e);
    return out;
}
//# sourceMappingURL=filter.js.map