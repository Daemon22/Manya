/**
 * @manya/weave — shared type definitions.
 *
 * All public visualization types live here. The model is intentionally
 * permissive (everything optional except ids) so the same engine can power
 * dependency graphs, knowledge graphs, event flows, and architecture diagrams.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
/** Stable identifier for a graph node. */
export type NodeID = string;
/** Stable identifier for a graph edge. */
export type EdgeID = string;
/** A node in a graph. */
export interface Node {
    /** Unique node identifier. */
    id: NodeID;
    /** Human-readable label. */
    label: string;
    /** Optional semantic type (e.g. 'service', 'package', 'concept'). */
    type?: string;
    /** Optional arbitrary properties. */
    properties?: Record<string, unknown>;
}
/** An edge connecting two nodes. */
export interface Edge {
    /** Unique edge identifier. */
    id: EdgeID;
    /** Source node id. */
    source: NodeID;
    /** Target node id. */
    target: NodeID;
    /** Optional human-readable label. */
    label?: string;
    /** Optional semantic type (e.g. 'depends-on', 'calls', 'knows'). */
    type?: string;
    /** Optional numeric weight (defaults to 1). Used by weighted path search. */
    weight?: number;
    /** Optional arbitrary properties. */
    properties?: Record<string, unknown>;
}
/**
 * A 2-D point. Used for layout positions and screen coordinates.
 */
export interface Point {
    x: number;
    y: number;
}
/** A layout maps node id → position. */
export type Layout = Map<NodeID, Point>;
/** Render configuration for the SVG renderer. */
export interface RenderConfig {
    /** SVG width in user units. */
    width: number;
    /** SVG height in user units. */
    height: number;
    /** Radius of each node circle. */
    nodeRadius: number;
    /** Font size for labels in user units. */
    fontSize: number;
    /** Fill color for nodes. */
    nodeColor: string;
    /** Stroke color for edges. */
    edgeColor: string;
    /** Background color of the canvas. */
    backgroundColor: string;
    /** Whether to render node labels. */
    showLabels: boolean;
}
/** A timestamped immutable snapshot of a graph. Used for topology diffing. */
export interface TopologySnapshot {
    /** ISO 8601 timestamp when the snapshot was taken. */
    takenAt: string;
    /** The graph at this point in time. */
    graph: Graph;
}
/** The structural difference between two topology snapshots. */
export interface TopologyDiff {
    /** Nodes added in `b` that were not in `a`. */
    addedNodes: Node[];
    /** Node ids present in `a` but absent in `b`. */
    removedNodes: NodeID[];
    /** Edges added in `b` that were not in `a`. */
    addedEdges: Edge[];
    /** Edge ids present in `a` but absent in `b`. */
    removedEdges: EdgeID[];
}
/**
 * Pan/zoom viewport state. The viewport is centered on `(centerX, centerY)`
 * in graph coordinates and applies a uniform `zoom` factor (1 = no zoom).
 */
export interface Viewport {
    centerX: number;
    centerY: number;
    zoom: number;
}
/** A single search hit. */
export interface SearchResult {
    /** The node id that matched. */
    nodeId: NodeID;
    /** Match score in [0, 1]. Higher is better. */
    score: number;
    /** The field that matched ('label', 'type', or a property key). */
    matchedField: string;
}
/**
 * Graph — the core data model.
 *
 * Implemented as a class in `src/graph/graph.ts` but also re-exported here as
 * a type alias for documentation purposes. The structural shape is
 * `{ nodes: Node[]; edges: Edge[]; directed: boolean }`.
 */
export interface Graph {
    /** Whether the graph is directed. */
    readonly directed: boolean;
    /** Current nodes (snapshot). */
    readonly nodes: Node[];
    /** Current edges (snapshot). */
    readonly edges: Edge[];
}
//# sourceMappingURL=types.d.ts.map