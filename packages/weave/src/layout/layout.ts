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

import type { NodeID, Point, Layout } from '../types.js';
import type { Graph } from '../graph/graph.js';
import { LayoutError } from '../errors.js';

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
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ensure the graph has at least one node; throw otherwise. */
function assertNonEmpty(graph: Graph): void {
  if (graph.size() === 0) throw new LayoutError('Cannot lay out an empty graph');
}

/** Initialize positions on a deterministic grid based on id ordering. */
function initialPositions(graph: Graph, width: number, height: number, rng: () => number): Map<NodeID, Point> {
  const pos = new Map<NodeID, Point>();
  const ids = graph.nodes.map(n => n.id).sort();
  const cols = Math.max(1, Math.ceil(Math.sqrt(ids.length)));
  const cellW = width / (cols + 1);
  const cellH = height / (Math.ceil(ids.length / cols) + 1);
  ids.forEach((id, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    // Small deterministic jitter for symmetry breaking.
    const jx = (rng() - 0.5) * 10;
    const jy = (rng() - 0.5) * 10;
    pos.set(id, { x: cellW * (c + 1) + jx, y: cellH * (r + 1) + jy });
  });
  return pos;
}

/**
 * Force-directed layout (simplified Fruchterman-Reingold).
 *
 * @param graph input graph
 * @param opts  options
 * @returns layout map
 */
export function forceDirected(graph: Graph, opts: ForceDirectedOptions = {}): Layout {
  assertNonEmpty(graph);
  const width = opts.width ?? 800;
  const height = opts.height ?? 600;
  const iterations = opts.iterations ?? 300;
  const seed = opts.seed ?? 1;
  const repulsion = opts.repulsion ?? 1.0;
  const idealLength = opts.idealLength ?? Math.min(width, height) / Math.max(2, Math.sqrt(graph.size()));
  const rng = mulberry32(seed);

  const pos = initialPositions(graph, width, height, rng);
  const ids = graph.nodes.map(n => n.id).sort();
  const edges = graph.edges;

  const temperature = width / 10;
  let cool = temperature;

  for (let iter = 0; iter < iterations; iter++) {
    const disp = new Map<NodeID, Point>();
    for (const id of ids) disp.set(id, { x: 0, y: 0 });

    // Repulsive forces (all pairs).
    for (let i = 0; i < ids.length; i++) {
      const v = ids[i];
      const pv = pos.get(v)!;
      for (let j = i + 1; j < ids.length; j++) {
        const u = ids[j];
        const pu = pos.get(u)!;
        let dx = pv.x - pu.x;
        let dy = pv.y - pu.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.01) {
          // Deterministic nudge instead of Math.random.
          dist = 0.01;
          dx = (i - j) * 0.01 + 0.01;
          dy = (j - i) * 0.01 + 0.01;
        }
        const force = (repulsion * idealLength * idealLength) / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        disp.get(v)!.x += fx;
        disp.get(v)!.y += fy;
        disp.get(u)!.x -= fx;
        disp.get(u)!.y -= fy;
      }
    }

    // Attractive forces (edges).
    for (const e of edges) {
      const a = pos.get(e.source);
      const b = pos.get(e.target);
      if (!a || !b) continue;
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.01) {
        dist = 0.01;
        dx = 0.01;
        dy = 0;
      }
      const force = (dist * dist) / idealLength;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      if (disp.has(e.source)) {
        disp.get(e.source)!.x -= fx;
        disp.get(e.source)!.y -= fy;
      }
      if (disp.has(e.target)) {
        disp.get(e.target)!.x += fx;
        disp.get(e.target)!.y += fy;
      }
    }

    // Apply displacement with cooling and boundary clamp.
    for (const id of ids) {
      const d = disp.get(id)!;
      const dlen = Math.sqrt(d.x * d.x + d.y * d.y);
      if (dlen < 1e-6) continue;
      const limited = Math.min(dlen, cool);
      const p = pos.get(id)!;
      const nx = p.x + (d.x / dlen) * limited;
      const ny = p.y + (d.y / dlen) * limited;
      pos.set(id, {
        x: Math.max(20, Math.min(width - 20, nx)),
        y: Math.max(20, Math.min(height - 20, ny)),
      });
    }

    cool = Math.max(cool * 0.95, 1);
  }

  return pos;
}

/**
 * Hierarchical top-down layered layout.
 *
 * Layers are computed via longest-path layering from a root set. Nodes within
 * a layer are placed left-to-right in alphabetical id order for determinism.
 */
export function hierarchical(graph: Graph, opts: HierarchicalOptions = {}): Layout {
  assertNonEmpty(graph);
  const width = opts.width ?? 800;
  const height = opts.height ?? 600;
  const layerGap = opts.layerGap ?? 80;
  const nodeGap = opts.nodeGap ?? 80;
  const padding = opts.padding ?? 40;

  // Compute longest-path layer assignment.
  const layer = new Map<NodeID, number>();
  const ids = graph.nodes.map(n => n.id).sort();

  // If root is supplied, BFS from it; otherwise use in-degree-0 nodes.
  let roots: NodeID[];
  if (opts.root) {
    roots = [opts.root];
  } else {
    roots = ids.filter(id => graph.inDegree(id) === 0);
    if (roots.length === 0) roots = [ids[0]];
  }

  // Initialize all layers to 0, then assign via BFS from roots (forward).
  for (const id of ids) layer.set(id, 0);
  // Repeat to handle DAG longest path: relax until stable.
  // First, topological-like relax.
  for (let pass = 0; pass < ids.length + 1; pass++) {
    let changed = false;
    for (const e of graph.edges) {
      const a = layer.get(e.source) ?? 0;
      const b = layer.get(e.target) ?? 0;
      if (a + 1 > b) {
        layer.set(e.target, a + 1);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // For undirected graphs, layer is meaningless; fall back to BFS depth from roots.
  if (!graph.directed) {
    for (const id of ids) layer.set(id, 0);
    const queue: NodeID[] = [...roots];
    const visited = new Set<NodeID>(roots);
    while (queue.length > 0) {
      const n = queue.shift()!;
      const d = layer.get(n)!;
      for (const nb of graph.neighbors(n)) {
        if (!visited.has(nb)) {
          visited.add(nb);
          layer.set(nb, d + 1);
          queue.push(nb);
        }
      }
    }
    // Unvisited nodes go to layer 0.
    for (const id of ids) if (!layer.has(id)) layer.set(id, 0);
  }

  // Group by layer.
  const maxLayer = Math.max(...layer.values(), 0);
  const layerNodes: NodeID[][] = Array.from({ length: maxLayer + 1 }, () => []);
  for (const id of ids) {
    layerNodes[layer.get(id)!].push(id);
  }
  for (const ln of layerNodes) ln.sort();

  const pos = new Map<NodeID, Point>();
  for (let l = 0; l < layerNodes.length; l++) {
    const nodes = layerNodes[l];
    const totalW = (nodes.length - 1) * nodeGap;
    const startX = (width - totalW) / 2;
    for (let i = 0; i < nodes.length; i++) {
      pos.set(nodes[i], {
        x: startX + i * nodeGap,
        y: padding + l * layerGap,
      });
    }
  }
  return pos;
}

/**
 * Radial layout — concentric rings around a root.
 *
 * The root is at the canvas center; nodes are placed on rings according to
 * their BFS depth from the root, evenly spaced on each ring.
 */
export function radial(graph: Graph, opts: RadialOptions = {}): Layout {
  assertNonEmpty(graph);
  const width = opts.width ?? 800;
  const height = opts.height ?? 600;
  const ringGap = opts.ringGap ?? 100;
  const padding = opts.padding ?? 40;

  const ids = graph.nodes.map(n => n.id).sort();
  const root = opts.root ?? ids[0];
  if (!graph.hasNode(root)) {
    throw new LayoutError(`Radial root not found: ${root}`);
  }

  // BFS depths.
  const depth = new Map<NodeID, number>();
  depth.set(root, 0);
  const queue: NodeID[] = [root];
  while (queue.length > 0) {
    const n = queue.shift()!;
    const d = depth.get(n)!;
    for (const nb of graph.neighbors(n)) {
      if (!depth.has(nb)) {
        depth.set(nb, d + 1);
        queue.push(nb);
      }
    }
  }
  // Any unvisited nodes go to the deepest ring + 1.
  const maxDepth = depth.size > 0 ? Math.max(...depth.values()) : 0;
  for (const id of ids) if (!depth.has(id)) depth.set(id, maxDepth + 1);

  const cx = width / 2;
  const cy = height / 2;
  const pos = new Map<NodeID, Point>();
  pos.set(root, { x: cx, y: cy });

  // Group nodes by depth (excluding root).
  const byDepth = new Map<number, NodeID[]>();
  for (const [id, d] of depth) {
    if (id === root) continue;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(id);
  }
  for (const arr of byDepth.values()) arr.sort();

  for (const [d, nodes] of byDepth) {
    const r = d * ringGap;
    const angleStep = (2 * Math.PI) / nodes.length;
    // Deterministic starting angle: 0 rad (right).
    for (let i = 0; i < nodes.length; i++) {
      const angle = i * angleStep;
      pos.set(nodes[i], {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      });
    }
  }
  // Keep nodes inside canvas.
  for (const [id, p] of pos) {
    p.x = Math.max(padding, Math.min(width - padding, p.x));
    p.y = Math.max(padding, Math.min(height - padding, p.y));
    pos.set(id, p);
  }
  return pos;
}

/**
 * Grid layout — regular rectangular grid.
 *
 * Nodes are placed in row-major order, sorted by id for determinism.
 */
export function grid(graph: Graph, opts: GridOptions = {}): Layout {
  assertNonEmpty(graph);
  const width = opts.width ?? 800;
  const height = opts.height ?? 600;
  const cellWidth = opts.cellWidth ?? 80;
  const cellHeight = opts.cellHeight ?? 80;
  const padding = opts.padding ?? 40;
  const ids = graph.nodes.map(n => n.id).sort();
  const n = ids.length;
  const columns = opts.columns ?? Math.max(1, Math.ceil(Math.sqrt(n)));

  const pos = new Map<NodeID, Point>();
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / columns);
    const c = i % columns;
    pos.set(ids[i], {
      x: padding + c * cellWidth,
      y: padding + r * cellHeight,
    });
  }
  return pos;
}
