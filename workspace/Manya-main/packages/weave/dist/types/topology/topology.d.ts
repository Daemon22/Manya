/**
 * @manya/weave — live system topology tracking.
 *
 * A `TopologyTracker` maintains a rolling history of `TopologySnapshot`s and
 * can compute the structural `TopologyDiff` between any two snapshots (most
 * commonly, the current and previous one).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { TopologySnapshot, TopologyDiff } from '../types.js';
import type { Graph } from '../graph/graph.js';
/**
 * Take an immutable snapshot of the current state of a graph.
 *
 * The snapshot holds a deep copy of the graph's nodes/edges so that subsequent
 * mutations to the live graph do not affect previously taken snapshots.
 *
 * @param graph live graph
 * @param takenAt optional ISO 8601 timestamp (default: now)
 */
export declare function takeSnapshot(graph: Graph, takenAt?: string): TopologySnapshot;
/**
 * Compute the structural diff between two snapshots.
 *
 * Nodes/edges are compared by id. Node/edge bodies are taken from `b` for
 * added entries.
 *
 * @param a earlier snapshot
 * @param b later snapshot
 */
export declare function diffSnapshots(a: TopologySnapshot, b: TopologySnapshot): TopologyDiff;
/**
 * Live topology tracker.
 *
 * Maintains a rolling buffer of snapshots (default: most recent 2). Call
 * `snapshot()` to record the current state, and `diff()` to compare the most
 * recent two snapshots.
 */
export declare class TopologyTracker {
    private readonly maxHistory;
    private history;
    /** @param maxHistory maximum number of snapshots to retain (default 10). */
    constructor(maxHistory?: number);
    /** Record a snapshot of the given graph. Returns the new snapshot. */
    snapshot(graph: Graph, takenAt?: string): TopologySnapshot;
    /** All retained snapshots in chronological order. */
    snapshots(): TopologySnapshot[];
    /** The most recent snapshot, or undefined if none recorded. */
    current(): TopologySnapshot | undefined;
    /** The snapshot before the most recent, or undefined if < 2 snapshots exist. */
    previous(): TopologySnapshot | undefined;
    /** Diff the two most recent snapshots. Returns null if < 2 exist. */
    diff(): TopologyDiff | null;
    /** Diff two arbitrary retained snapshots by index. */
    diffAt(i: number, j: number): TopologyDiff | null;
    /** Clear all retained history. */
    reset(): void;
}
//# sourceMappingURL=topology.d.ts.map