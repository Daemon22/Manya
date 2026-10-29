/**
 * @manya/weave — core graph data model.
 *
 * The `Graph` class is the central abstraction of @manya/weave. It supports
 * both directed and undirected graphs, exposes adjacency queries, cycle
 * detection, topological sort, and connected-component detection. All graph
 * mutations are O(1) amortized; queries are O(degree).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Node, Edge, NodeID, EdgeID } from '../types.js';
/**
 * A mutable in-memory graph.
 *
 * Both directed and undirected graphs are supported. For undirected graphs
 * adjacency is symmetric: an edge `a -> b` is reachable from both endpoints.
 */
export declare class Graph {
    /** Whether this graph is directed. */
    readonly directed: boolean;
    private readonly nodesById;
    private readonly edgesById;
    /** Out-adjacency: node id → set of neighbor ids. */
    private readonly outAdj;
    /** In-adjacency: node id → set of predecessor ids. */
    private readonly inAdj;
    constructor(directed?: boolean);
    /** Add a node. Throws if a node with the same id already exists. */
    addNode(node: Node): this;
    /** Add multiple nodes. */
    addNodes(nodes: Iterable<Node>): this;
    /** Remove a node and any incident edges. No-op if the node does not exist. */
    removeNode(id: NodeID): this;
    /** Get a node by id, or undefined. */
    getNode(id: NodeID): Node | undefined;
    /** True iff a node with this id exists. */
    hasNode(id: NodeID): boolean;
    /** Update an existing node's data (label/type/properties). Throws if missing. */
    updateNode(id: NodeID, patch: Partial<Omit<Node, 'id'>>): this;
    /** Add an edge. Both endpoints must already exist. */
    addEdge(edge: Edge): this;
    /** Add multiple edges. */
    addEdges(edges: Iterable<Edge>): this;
    /** Remove an edge. No-op if missing. */
    removeEdge(id: EdgeID): this;
    /** Get an edge by id. */
    getEdge(id: EdgeID): Edge | undefined;
    /** True iff an edge with this id exists. */
    hasEdge(id: EdgeID): boolean;
    /** Snapshot of all nodes (new array). */
    get nodes(): Node[];
    /** Snapshot of all edges (new array). */
    get edges(): Edge[];
    /** Number of nodes. */
    size(): number;
    /** Number of edges. */
    edgeCount(): number;
    /** Outgoing neighbors (successors) of a node. */
    successors(id: NodeID): NodeID[];
    /** Incoming neighbors (predecessors) of a node. */
    predecessors(id: NodeID): NodeID[];
    /** All neighbors. For undirected graphs this equals `successors`. */
    neighbors(id: NodeID): NodeID[];
    /** Out-degree (number of outgoing edges). */
    outDegree(id: NodeID): number;
    /** In-degree (number of incoming edges). */
    inDegree(id: NodeID): number;
    /** Total degree. For undirected graphs this equals 2 × incident edges. */
    degree(id: NodeID): number;
    /** True iff the graph contains at least one cycle. */
    hasCycle(): boolean;
    private hasCycleDirected;
    private hasCycleUndirected;
    /**
     * Topologically sort the nodes of a directed acyclic graph.
     * Throws `GraphError` if the graph contains a cycle or is undirected.
     */
    topologicalSort(): NodeID[];
    /** Find all connected components (undirected: connected; directed: weakly connected). */
    findConnectedComponents(): NodeID[][];
    /** Return the connected component containing `id`, as a sorted id array. */
    componentOf(id: NodeID): NodeID[];
    /**
     * Breadth-first traversal from `start` up to `maxDepth` (inclusive).
     * Returns a map of nodeId → depth.
     */
    bfsDepths(start: NodeID, maxDepth?: number): Map<NodeID, number>;
    /** Clone this graph (deep copy). */
    clone(): Graph;
}
/**
 * Build a `Graph` from a list of nodes and edges.
 * @param nodes initial nodes
 * @param edges initial edges
 * @param directed whether the graph is directed (default false)
 */
export declare function createGraph(nodes: Iterable<Node>, edges?: Iterable<Edge>, directed?: boolean): Graph;
//# sourceMappingURL=graph.d.ts.map