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
import { GraphError } from '../errors.js';

/**
 * A mutable in-memory graph.
 *
 * Both directed and undirected graphs are supported. For undirected graphs
 * adjacency is symmetric: an edge `a -> b` is reachable from both endpoints.
 */
export class Graph {
  /** Whether this graph is directed. */
  public readonly directed: boolean;

  private readonly nodesById: Map<NodeID, Node> = new Map();
  private readonly edgesById: Map<EdgeID, Edge> = new Map();

  /** Out-adjacency: node id → set of neighbor ids. */
  private readonly outAdj: Map<NodeID, Set<NodeID>> = new Map();
  /** In-adjacency: node id → set of predecessor ids. */
  private readonly inAdj: Map<NodeID, Set<NodeID>> = new Map();

  constructor(directed: boolean = false) {
    this.directed = directed;
  }

  // ---------- node ops ----------

  /** Add a node. Throws if a node with the same id already exists. */
  addNode(node: Node): this {
    if (!node || typeof node.id !== 'string') throw new GraphError('Node.id must be a string');
    if (this.nodesById.has(node.id)) {
      throw new GraphError(`Node already exists: ${node.id}`);
    }
    this.nodesById.set(node.id, { ...node });
    this.outAdj.set(node.id, new Set());
    this.inAdj.set(node.id, new Set());
    return this;
  }

  /** Add multiple nodes. */
  addNodes(nodes: Iterable<Node>): this {
    for (const n of nodes) this.addNode(n);
    return this;
  }

  /** Remove a node and any incident edges. No-op if the node does not exist. */
  removeNode(id: NodeID): this {
    if (!this.nodesById.has(id)) return this;
    // Remove incident edges.
    const incident: EdgeID[] = [];
    for (const e of this.edgesById.values()) {
      if (e.source === id || e.target === id) incident.push(e.id);
    }
    for (const eid of incident) this.removeEdge(eid);
    this.nodesById.delete(id);
    this.outAdj.delete(id);
    this.inAdj.delete(id);
    return this;
  }

  /** Get a node by id, or undefined. */
  getNode(id: NodeID): Node | undefined {
    return this.nodesById.get(id);
  }

  /** True iff a node with this id exists. */
  hasNode(id: NodeID): boolean {
    return this.nodesById.has(id);
  }

  /** Update an existing node's data (label/type/properties). Throws if missing. */
  updateNode(id: NodeID, patch: Partial<Omit<Node, 'id'>>): this {
    const existing = this.nodesById.get(id);
    if (!existing) throw new GraphError(`Node not found: ${id}`);
    this.nodesById.set(id, { ...existing, ...patch, id });
    return this;
  }

  // ---------- edge ops ----------

  /** Add an edge. Both endpoints must already exist. */
  addEdge(edge: Edge): this {
    if (!edge || typeof edge.id !== 'string') throw new GraphError('Edge.id must be a string');
    if (this.edgesById.has(edge.id)) {
      throw new GraphError(`Edge already exists: ${edge.id}`);
    }
    if (!this.nodesById.has(edge.source)) {
      throw new GraphError(`Edge source node not found: ${edge.source}`);
    }
    if (!this.nodesById.has(edge.target)) {
      throw new GraphError(`Edge target node not found: ${edge.target}`);
    }
    if (edge.source === edge.target) {
      throw new GraphError(`Self-loops are not supported: ${edge.id}`);
    }
    this.edgesById.set(edge.id, { ...edge });
    this.outAdj.get(edge.source)!.add(edge.target);
    this.inAdj.get(edge.target)!.add(edge.source);
    if (!this.directed) {
      this.outAdj.get(edge.target)!.add(edge.source);
      this.inAdj.get(edge.source)!.add(edge.target);
    }
    return this;
  }

  /** Add multiple edges. */
  addEdges(edges: Iterable<Edge>): this {
    for (const e of edges) this.addEdge(e);
    return this;
  }

  /** Remove an edge. No-op if missing. */
  removeEdge(id: EdgeID): this {
    const edge = this.edgesById.get(id);
    if (!edge) return this;
    this.edgesById.delete(id);
    this.outAdj.get(edge.source)?.delete(edge.target);
    this.inAdj.get(edge.target)?.delete(edge.source);
    if (!this.directed) {
      this.outAdj.get(edge.target)?.delete(edge.source);
      this.inAdj.get(edge.source)?.delete(edge.target);
    }
    return this;
  }

  /** Get an edge by id. */
  getEdge(id: EdgeID): Edge | undefined {
    return this.edgesById.get(id);
  }

  /** True iff an edge with this id exists. */
  hasEdge(id: EdgeID): boolean {
    return this.edgesById.has(id);
  }

  // ---------- queries ----------

  /** Snapshot of all nodes (new array). */
  get nodes(): Node[] {
    return Array.from(this.nodesById.values());
  }

  /** Snapshot of all edges (new array). */
  get edges(): Edge[] {
    return Array.from(this.edgesById.values());
  }

  /** Number of nodes. */
  size(): number {
    return this.nodesById.size;
  }

  /** Number of edges. */
  edgeCount(): number {
    return this.edgesById.size;
  }

  /** Outgoing neighbors (successors) of a node. */
  successors(id: NodeID): NodeID[] {
    const s = this.outAdj.get(id);
    return s ? Array.from(s) : [];
  }

  /** Incoming neighbors (predecessors) of a node. */
  predecessors(id: NodeID): NodeID[] {
    const s = this.inAdj.get(id);
    return s ? Array.from(s) : [];
  }

  /** All neighbors. For undirected graphs this equals `successors`. */
  neighbors(id: NodeID): NodeID[] {
    const seen = new Set<NodeID>(this.successors(id));
    for (const p of this.predecessors(id)) seen.add(p);
    return Array.from(seen);
  }

  /** Out-degree (number of outgoing edges). */
  outDegree(id: NodeID): number {
    return this.outAdj.get(id)?.size ?? 0;
  }

  /** In-degree (number of incoming edges). */
  inDegree(id: NodeID): number {
    return this.inAdj.get(id)?.size ?? 0;
  }

  /** Total degree. For undirected graphs this equals 2 × incident edges. */
  degree(id: NodeID): number {
    if (!this.directed) return this.outAdj.get(id)?.size ?? 0;
    return this.outDegree(id) + this.inDegree(id);
  }

  // ---------- algorithms ----------

  /** True iff the graph contains at least one cycle. */
  hasCycle(): boolean {
    if (!this.directed) {
      // Undirected: union-find cycle detection.
      return this.hasCycleUndirected();
    }
    return this.hasCycleDirected();
  }

  private hasCycleDirected(): boolean {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<NodeID, number>();
    for (const id of this.nodesById.keys()) color.set(id, WHITE);
    const stack: Array<[NodeID, Iterator<NodeID>]> = [];
    for (const start of this.nodesById.keys()) {
      if (color.get(start) !== WHITE) continue;
      color.set(start, GRAY);
      stack.push([start, this.successors(start)[Symbol.iterator]()]);
      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        const next = top[1].next();
        if (next.done) {
          color.set(top[0], BLACK);
          stack.pop();
          continue;
        }
        const w = next.value;
        const cw = color.get(w)!;
        if (cw === GRAY) return true;
        if (cw === WHITE) {
          color.set(w, GRAY);
          stack.push([w, this.successors(w)[Symbol.iterator]()]);
        }
      }
    }
    return false;
  }

  private hasCycleUndirected(): boolean {
    // Union-find.
    const parent = new Map<NodeID, NodeID>();
    const find = (x: NodeID): NodeID => {
      let root = x;
      while (parent.get(root) !== root) root = parent.get(root)!;
      // Path compression.
      let cur = x;
      while (parent.get(cur) !== root) {
        const next = parent.get(cur)!;
        parent.set(cur, root);
        cur = next;
      }
      return root;
    };
    for (const id of this.nodesById.keys()) parent.set(id, id);
    for (const e of this.edgesById.values()) {
      const ra = find(e.source);
      const rb = find(e.target);
      if (ra === rb) return true;
      parent.set(ra, rb);
    }
    return false;
  }

  /**
   * Topologically sort the nodes of a directed acyclic graph.
   * Throws `GraphError` if the graph contains a cycle or is undirected.
   */
  topologicalSort(): NodeID[] {
    if (!this.directed) {
      throw new GraphError('topologicalSort requires a directed graph');
    }
    if (this.hasCycle()) {
      throw new GraphError('Cannot topologically sort a graph with cycles');
    }
    // Kahn's algorithm for stable, deterministic output.
    const inDeg = new Map<NodeID, number>();
    for (const id of this.nodesById.keys()) inDeg.set(id, this.inDegree(id));
    // Use a sorted queue for determinism.
    const queue: NodeID[] = [];
    for (const [id, d] of inDeg) if (d === 0) queue.push(id);
    queue.sort();
    const result: NodeID[] = [];
    while (queue.length > 0) {
      const n = queue.shift()!;
      result.push(n);
      const succs = this.successors(n).sort();
      for (const s of succs) {
        const d = (inDeg.get(s) ?? 0) - 1;
        inDeg.set(s, d);
        if (d === 0) {
          // Insert maintaining sorted order.
          let lo = 0, hi = queue.length;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (queue[mid] < s) lo = mid + 1; else hi = mid;
          }
          queue.splice(lo, 0, s);
        }
      }
    }
    return result;
  }

  /** Find all connected components (undirected: connected; directed: weakly connected). */
  findConnectedComponents(): NodeID[][] {
    const visited = new Set<NodeID>();
    const components: NodeID[][] = [];
    for (const start of this.nodesById.keys()) {
      if (visited.has(start)) continue;
      const comp: NodeID[] = [];
      const stack = [start];
      visited.add(start);
      while (stack.length > 0) {
        const n = stack.pop()!;
        comp.push(n);
        for (const nb of this.neighbors(n)) {
          if (!visited.has(nb)) {
            visited.add(nb);
            stack.push(nb);
          }
        }
      }
      comp.sort();
      components.push(comp);
    }
    // Sort components by first element for determinism.
    components.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    return components;
  }

  /** Return the connected component containing `id`, as a sorted id array. */
  componentOf(id: NodeID): NodeID[] {
    if (!this.nodesById.has(id)) return [];
    const visited = new Set<NodeID>([id]);
    const stack = [id];
    while (stack.length > 0) {
      const n = stack.pop()!;
      for (const nb of this.neighbors(n)) {
        if (!visited.has(nb)) {
          visited.add(nb);
          stack.push(nb);
        }
      }
    }
    return Array.from(visited).sort();
  }

  /**
   * Breadth-first traversal from `start` up to `maxDepth` (inclusive).
   * Returns a map of nodeId → depth.
   */
  bfsDepths(start: NodeID, maxDepth: number = Infinity): Map<NodeID, number> {
    const result = new Map<NodeID, number>();
    if (!this.nodesById.has(start)) return result;
    result.set(start, 0);
    const queue: NodeID[] = [start];
    while (queue.length > 0) {
      const n = queue.shift()!;
      const d = result.get(n)!;
      if (d >= maxDepth) continue;
      for (const nb of this.neighbors(n)) {
        if (!result.has(nb)) {
          result.set(nb, d + 1);
          queue.push(nb);
        }
      }
    }
    return result;
  }

  /** Clone this graph (deep copy). */
  clone(): Graph {
    const g = new Graph(this.directed);
    g.addNodes(this.nodes);
    g.addEdges(this.edges);
    return g;
  }
}

/**
 * Build a `Graph` from a list of nodes and edges.
 * @param nodes initial nodes
 * @param edges initial edges
 * @param directed whether the graph is directed (default false)
 */
export function createGraph(
  nodes: Iterable<Node>,
  edges: Iterable<Edge> = [],
  directed: boolean = false,
): Graph {
  const g = new Graph(directed);
  g.addNodes(nodes);
  g.addEdges(edges);
  return g;
}
