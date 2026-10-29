"use strict";
/**
 * @manya-os/weave — live system topology tracking.
 *
 * A `TopologyTracker` maintains a rolling history of `TopologySnapshot`s and
 * can compute the structural `TopologyDiff` between any two snapshots (most
 * commonly, the current and previous one).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopologyTracker = void 0;
exports.takeSnapshot = takeSnapshot;
exports.diffSnapshots = diffSnapshots;
const graph_js_1 = require("../graph/graph.js");
/**
 * Take an immutable snapshot of the current state of a graph.
 *
 * The snapshot holds a deep copy of the graph's nodes/edges so that subsequent
 * mutations to the live graph do not affect previously taken snapshots.
 *
 * @param graph live graph
 * @param takenAt optional ISO 8601 timestamp (default: now)
 */
function takeSnapshot(graph, takenAt = new Date().toISOString()) {
    // Deep copy nodes/edges so caller mutations don't leak into the snapshot.
    const nodes = graph.nodes.map(n => ({ ...n, properties: n.properties ? { ...n.properties } : undefined }));
    const edges = graph.edges.map(e => ({ ...e, properties: e.properties ? { ...e.properties } : undefined }));
    return {
        takenAt,
        graph: (0, graph_js_1.createGraph)(nodes, edges, graph.directed),
    };
}
/** Build a stable set of node ids from a snapshot. */
function nodeIds(s) {
    return new Set(s.graph.nodes.map(n => n.id));
}
/** Build a stable set of edge ids from a snapshot. */
function edgeIds(s) {
    return new Set(s.graph.edges.map(e => e.id));
}
/**
 * Compute the structural diff between two snapshots.
 *
 * Nodes/edges are compared by id. Node/edge bodies are taken from `b` for
 * added entries.
 *
 * @param a earlier snapshot
 * @param b later snapshot
 */
function diffSnapshots(a, b) {
    const aNodes = nodeIds(a);
    const bNodes = nodeIds(b);
    const aEdges = edgeIds(a);
    const bEdges = edgeIds(b);
    const addedNodes = b.graph.nodes.filter(n => !aNodes.has(n.id));
    const removedNodes = a.graph.nodes.map(n => n.id).filter(id => !bNodes.has(id));
    const addedEdges = b.graph.edges.filter(e => !aEdges.has(e.id));
    const removedEdges = a.graph.edges.map(e => e.id).filter(id => !bEdges.has(id));
    return { addedNodes, removedNodes, addedEdges, removedEdges };
}
/**
 * Live topology tracker.
 *
 * Maintains a rolling buffer of snapshots (default: most recent 2). Call
 * `snapshot()` to record the current state, and `diff()` to compare the most
 * recent two snapshots.
 */
class TopologyTracker {
    maxHistory;
    history = [];
    /** @param maxHistory maximum number of snapshots to retain (default 10). */
    constructor(maxHistory = 10) {
        if (maxHistory < 1)
            throw new RangeError('maxHistory must be >= 1');
        this.maxHistory = maxHistory;
    }
    /** Record a snapshot of the given graph. Returns the new snapshot. */
    snapshot(graph, takenAt = new Date().toISOString()) {
        const snap = takeSnapshot(graph, takenAt);
        this.history.push(snap);
        while (this.history.length > this.maxHistory)
            this.history.shift();
        return snap;
    }
    /** All retained snapshots in chronological order. */
    snapshots() {
        return this.history.slice();
    }
    /** The most recent snapshot, or undefined if none recorded. */
    current() {
        return this.history.length > 0 ? this.history[this.history.length - 1] : undefined;
    }
    /** The snapshot before the most recent, or undefined if < 2 snapshots exist. */
    previous() {
        return this.history.length >= 2 ? this.history[this.history.length - 2] : undefined;
    }
    /** Diff the two most recent snapshots. Returns null if < 2 exist. */
    diff() {
        const prev = this.previous();
        const curr = this.current();
        if (!prev || !curr)
            return null;
        return diffSnapshots(prev, curr);
    }
    /** Diff two arbitrary retained snapshots by index. */
    diffAt(i, j) {
        if (i < 0 || j < 0 || i >= this.history.length || j >= this.history.length)
            return null;
        return diffSnapshots(this.history[i], this.history[j]);
    }
    /** Clear all retained history. */
    reset() {
        this.history = [];
    }
}
exports.TopologyTracker = TopologyTracker;
//# sourceMappingURL=topology.js.map