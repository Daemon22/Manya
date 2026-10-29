/**
 * @manya/weave — comprehensive unit tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import {
  Graph, createGraph,
  mulberry32, forceDirected, hierarchical, radial, grid,
  filterByLabel, filterByType, filterByEdgeType,
  filterByComponent, filterByDepth, filterByProperty,
  filterNodes, filterEdges,
  levenshtein, similarity, search, fuzzySearch, bfsPath, dijkstra,
  toJSON, toDot, toMermaid, toSVG,
  renderToSVG, mergeRenderConfig, DEFAULT_RENDER_CONFIG,
  takeSnapshot, diffSnapshots, TopologyTracker,
  SelectionModel, DEFAULT_VIEWPORT, applyViewport, inverseViewport, panTo, zoomAt,
  WeaveError, GraphError, LayoutError, ExportError,
} from '../src';
import type { Node, Edge } from '../src';

// ---------- helpers ----------

function nodes(ids: string[]): Node[] {
  return ids.map(id => ({ id, label: `Label-${id}` }));
}

function edges(pairs: Array<[string, string]>): Edge[] {
  return pairs.map(([s, t], i) => ({ id: `e${i}`, source: s, target: t }));
}

// ====================================================================
// Graph data model
// ====================================================================

describe('Graph — node ops', () => {
  test('addNode adds a node', () => {
    const g = new Graph();
    g.addNode({ id: 'a', label: 'A' });
    expect(g.size()).toBe(1);
    expect(g.hasNode('a')).toBe(true);
  });

  test('addNode rejects duplicate ids', () => {
    const g = new Graph();
    g.addNode({ id: 'a', label: 'A' });
    expect(() => g.addNode({ id: 'a', label: 'A2' })).toThrow(GraphError);
  });

  test('addNode rejects invalid id', () => {
    const g = new Graph();
    expect(() => g.addNode({ id: 123 as unknown as string, label: 'A' })).toThrow(GraphError);
  });

  test('removeNode removes the node and incident edges', () => {
    const g = createGraph(nodes(['a', 'b', 'c']), edges([['a', 'b'], ['b', 'c']]));
    g.removeNode('b');
    expect(g.hasNode('b')).toBe(false);
    expect(g.edgeCount()).toBe(0);
  });

  test('removeNode is a no-op for missing node', () => {
    const g = new Graph();
    expect(() => g.removeNode('nope')).not.toThrow();
  });

  test('getNode returns undefined for missing', () => {
    const g = new Graph();
    expect(g.getNode('x')).toBeUndefined();
  });

  test('updateNode patches label/type/properties', () => {
    const g = createGraph(nodes(['a']), []);
    g.updateNode('a', { label: 'Updated', type: 'service' });
    expect(g.getNode('a')!.label).toBe('Updated');
    expect(g.getNode('a')!.type).toBe('service');
  });

  test('updateNode throws for missing node', () => {
    const g = new Graph();
    expect(() => g.updateNode('x', { label: 'X' })).toThrow(GraphError);
  });
});

describe('Graph — edge ops', () => {
  test('addEdge adds an edge', () => {
    const g = createGraph(nodes(['a', 'b']), []);
    g.addEdge({ id: 'e1', source: 'a', target: 'b' });
    expect(g.edgeCount()).toBe(1);
    expect(g.hasEdge('e1')).toBe(true);
  });

  test('addEdge rejects when source node missing', () => {
    const g = createGraph(nodes(['a']), []);
    expect(() => g.addEdge({ id: 'e1', source: 'a', target: 'b' })).toThrow(GraphError);
  });

  test('addEdge rejects self-loops', () => {
    const g = createGraph(nodes(['a']), []);
    expect(() => g.addEdge({ id: 'e1', source: 'a', target: 'a' })).toThrow(GraphError);
  });

  test('removeEdge removes the edge only', () => {
    const g = createGraph(nodes(['a', 'b']), edges([['a', 'b']]));
    g.removeEdge('e0');
    expect(g.edgeCount()).toBe(0);
    expect(g.size()).toBe(2);
  });
});

describe('Graph — adjacency queries', () => {
  test('directed successors/predecessors', () => {
    const g = createGraph(nodes(['a', 'b', 'c']), edges([['a', 'b'], ['b', 'c']]), true);
    expect(g.successors('a')).toEqual(['b']);
    expect(g.predecessors('b')).toEqual(['a']);
    expect(g.inDegree('b')).toBe(1);
    expect(g.outDegree('b')).toBe(1);
    expect(g.degree('b')).toBe(2);
  });

  test('undirected neighbors are symmetric', () => {
    const g = createGraph(nodes(['a', 'b']), edges([['a', 'b']]), false);
    expect(g.neighbors('a')).toEqual(['b']);
    expect(g.neighbors('b')).toEqual(['a']);
  });

  test('neighbors of isolated node is empty', () => {
    const g = createGraph(nodes(['a', 'b']), []);
    expect(g.neighbors('a')).toEqual([]);
  });

  test('clone produces an independent copy', () => {
    const g = createGraph(nodes(['a', 'b']), edges([['a', 'b']]));
    const c = g.clone();
    c.addNode({ id: 'c', label: 'C' });
    expect(g.size()).toBe(2);
    expect(c.size()).toBe(3);
  });
});

describe('Graph — cycle detection', () => {
  test('directed DAG has no cycle', () => {
    const g = createGraph(nodes(['a', 'b', 'c']), edges([['a', 'b'], ['b', 'c']]), true);
    expect(g.hasCycle()).toBe(false);
  });

  test('directed graph with cycle is detected', () => {
    const g = createGraph(nodes(['a', 'b', 'c']), edges([['a', 'b'], ['b', 'c'], ['c', 'a']]), true);
    expect(g.hasCycle()).toBe(true);
  });

  test('undirected tree has no cycle', () => {
    const g = createGraph(nodes(['a', 'b', 'c']), edges([['a', 'b'], ['b', 'c']]), false);
    expect(g.hasCycle()).toBe(false);
  });

  test('undirected graph with cycle is detected', () => {
    const g = createGraph(nodes(['a', 'b', 'c']), edges([['a', 'b'], ['b', 'c'], ['a', 'c']]), false);
    expect(g.hasCycle()).toBe(true);
  });
});

describe('Graph — topological sort', () => {
  test('topo sort of a DAG', () => {
    const g = createGraph(
      nodes(['a', 'b', 'c', 'd']),
      [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd']].map(([s, t], i) => ({ id: `e${i}`, source: s, target: t })),
      true,
    );
    const sorted = g.topologicalSort();
    expect(sorted).toHaveLength(4);
    // a must come before b and c; b and c before d.
    expect(sorted.indexOf('a')).toBeLessThan(sorted.indexOf('b'));
    expect(sorted.indexOf('a')).toBeLessThan(sorted.indexOf('c'));
    expect(sorted.indexOf('b')).toBeLessThan(sorted.indexOf('d'));
    expect(sorted.indexOf('c')).toBeLessThan(sorted.indexOf('d'));
  });

  test('topo sort throws on cyclic graph', () => {
    const g = createGraph(nodes(['a', 'b']), edges([['a', 'b'], ['b', 'a']]), true);
    expect(() => g.topologicalSort()).toThrow(GraphError);
  });

  test('topo sort throws on undirected graph', () => {
    const g = createGraph(nodes(['a', 'b']), edges([['a', 'b']]), false);
    expect(() => g.topologicalSort()).toThrow(GraphError);
  });

  test('topo sort is deterministic', () => {
    const g = createGraph(
      nodes(['a', 'b', 'c']),
      [['a', 'c'], ['b', 'c']].map(([s, t], i) => ({ id: `e${i}`, source: s, target: t })),
      true,
    );
    const s1 = g.topologicalSort();
    const s2 = g.topologicalSort();
    expect(s1).toEqual(s2);
  });
});

describe('Graph — connected components', () => {
  test('finds two components', () => {
    const g = createGraph(
      nodes(['a', 'b', 'c', 'd']),
      [['a', 'b'], ['c', 'd']].map(([s, t], i) => ({ id: `e${i}`, source: s, target: t })),
      false,
    );
    const comps = g.findConnectedComponents();
    expect(comps).toHaveLength(2);
    expect(comps[0]).toEqual(['a', 'b']);
    expect(comps[1]).toEqual(['c', 'd']);
  });

  test('componentOf returns containing component', () => {
    const g = createGraph(nodes(['a', 'b', 'c']), edges([['a', 'b']]), false);
    expect(g.componentOf('a')).toEqual(['a', 'b']);
    expect(g.componentOf('c')).toEqual(['c']);
  });
});

// ====================================================================
// Layout algorithms
// ====================================================================

describe('Layout — mulberry32 PRNG', () => {
  test('is deterministic for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  test('different seeds produce different sequences', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });
});

describe('Layout — forceDirected', () => {
  test('produces a position for every node', () => {
    const g = createGraph(nodes(['a', 'b', 'c']), edges([['a', 'b'], ['b', 'c']]));
    const layout = forceDirected(g, { seed: 42 });
    expect(layout.size).toBe(3);
    for (const id of ['a', 'b', 'c']) expect(layout.has(id)).toBe(true);
  });

  test('is deterministic for the same seed', () => {
    const g = createGraph(nodes(['a', 'b', 'c', 'd']), edges([['a', 'b'], ['b', 'c'], ['c', 'd']]));
    const l1 = forceDirected(g, { seed: 7 });
    const l2 = forceDirected(g, { seed: 7 });
    const a1 = l1.get('a')!;
    const a2 = l2.get('a')!;
    expect(a1.x).toBe(a2.x);
    expect(a1.y).toBe(a2.y);
  });

  test('throws on empty graph', () => {
    const g = new Graph();
    expect(() => forceDirected(g)).toThrow(LayoutError);
  });
});

describe('Layout — hierarchical', () => {
  test('produces positions in distinct layers', () => {
    const g = createGraph(
      nodes(['root', 'a', 'b']),
      [['root', 'a'], ['root', 'b']].map(([s, t], i) => ({ id: `e${i}`, source: s, target: t })),
      true,
    );
    const layout = hierarchical(g);
    expect(layout.size).toBe(3);
    const rootY = layout.get('root')!.y;
    const aY = layout.get('a')!.y;
    expect(aY).toBeGreaterThan(rootY);
  });

  test('throws on empty graph', () => {
    const g = new Graph();
    expect(() => hierarchical(g)).toThrow(LayoutError);
  });
});

describe('Layout — radial', () => {
  test('root is at center', () => {
    const g = createGraph(nodes(['root', 'a', 'b', 'c']), edges([['root', 'a'], ['root', 'b'], ['root', 'c']]));
    const layout = radial(g, { root: 'root', width: 800, height: 800 });
    const root = layout.get('root')!;
    expect(root.x).toBeCloseTo(400, 0);
    expect(root.y).toBeCloseTo(400, 0);
  });

  test('ring nodes are equidistant from center', () => {
    const g = createGraph(nodes(['root', 'a', 'b', 'c', 'd']), edges([['root', 'a'], ['root', 'b'], ['root', 'c'], ['root', 'd']]));
    const layout = radial(g, { root: 'root', width: 800, height: 800 });
    const cx = 400, cy = 400;
    const distances = ['a', 'b', 'c', 'd'].map(id => {
      const p = layout.get(id)!;
      return Math.hypot(p.x - cx, p.y - cy);
    });
    const first = distances[0];
    for (const d of distances) expect(d).toBeCloseTo(first, 0);
  });

  test('throws on missing root', () => {
    const g = createGraph(nodes(['a']), []);
    expect(() => radial(g, { root: 'nope' })).toThrow(LayoutError);
  });
});

describe('Layout — grid', () => {
  test('places nodes in a regular grid', () => {
    const g = createGraph(nodes(['a', 'b', 'c', 'd']), []);
    const layout = grid(g, { columns: 2, cellWidth: 100, cellHeight: 100 });
    expect(layout.get('a')).toEqual({ x: 40, y: 40 });
    expect(layout.get('b')).toEqual({ x: 140, y: 40 });
    expect(layout.get('c')).toEqual({ x: 40, y: 140 });
    expect(layout.get('d')).toEqual({ x: 140, y: 140 });
  });

  test('throws on empty graph', () => {
    const g = new Graph();
    expect(() => grid(g)).toThrow(LayoutError);
  });
});

// ====================================================================
// Filter
// ====================================================================

describe('Filter', () => {
  test('filterByLabel keeps matching nodes', () => {
    const g = createGraph(
      [{ id: 'a', label: 'Apple' }, { id: 'b', label: 'Banana' }, { id: 'c', label: 'Apricot' }],
      [],
    );
    const out = filterByLabel(g, l => l.startsWith('A'));
    expect(out.nodes.map(n => n.id).sort()).toEqual(['a', 'c']);
  });

  test('filterByType keeps matching type', () => {
    const g = createGraph(
      [{ id: 'a', label: 'A', type: 'service' }, { id: 'b', label: 'B', type: 'db' }],
      [],
    );
    const out = filterByType(g, 'service');
    expect(out.size()).toBe(1);
    expect(out.getNode('a')).toBeDefined();
  });

  test('filterByEdgeType keeps matching edges', () => {
    const g = createGraph(
      nodes(['a', 'b', 'c']),
      [
        { id: 'e1', source: 'a', target: 'b', type: 'depends-on' },
        { id: 'e2', source: 'b', target: 'c', type: 'calls' },
      ],
    );
    const out = filterByEdgeType(g, 'calls');
    expect(out.edgeCount()).toBe(1);
    expect(out.getEdge('e2')).toBeDefined();
  });

  test('filterByComponent keeps single component', () => {
    const g = createGraph(
      nodes(['a', 'b', 'c', 'd']),
      [['a', 'b'], ['c', 'd']].map(([s, t], i) => ({ id: `e${i}`, source: s, target: t })),
      false,
    );
    const out = filterByComponent(g, 'a');
    expect(out.nodes.map(n => n.id).sort()).toEqual(['a', 'b']);
  });

  test('filterByDepth keeps BFS-reachable nodes', () => {
    const g = createGraph(
      nodes(['root', 'a', 'b', 'c']),
      [['root', 'a'], ['a', 'b'], ['b', 'c']].map(([s, t], i) => ({ id: `e${i}`, source: s, target: t })),
      false,
    );
    const out = filterByDepth(g, 'root', 1);
    expect(out.nodes.map(n => n.id).sort()).toEqual(['a', 'root']);
  });

  test('filterByDepth 0 keeps only the root', () => {
    const g = createGraph(nodes(['a', 'b']), edges([['a', 'b']]));
    const out = filterByDepth(g, 'a', 0);
    expect(out.size()).toBe(1);
    expect(out.hasNode('a')).toBe(true);
  });

  test('filterByProperty matches node properties', () => {
    const g = createGraph(
      [
        { id: 'a', label: 'A', properties: { tier: 1 } },
        { id: 'b', label: 'B', properties: { tier: 2 } },
      ],
      [],
    );
    const out = filterByProperty(g, p => p?.tier === 1);
    expect(out.size()).toBe(1);
  });

  test('filterNodes (generic)', () => {
    const g = createGraph(nodes(['a', 'b', 'c']), []);
    const out = filterNodes(g, n => n.id !== 'b');
    expect(out.size()).toBe(2);
    expect(out.hasNode('b')).toBe(false);
  });

  test('filterEdges (generic)', () => {
    const g = createGraph(
      nodes(['a', 'b', 'c']),
      [
        { id: 'e1', source: 'a', target: 'b', weight: 1 },
        { id: 'e2', source: 'b', target: 'c', weight: 10 },
      ],
    );
    const out = filterEdges(g, e => (e.weight ?? 1) > 5);
    expect(out.edgeCount()).toBe(1);
  });
});

// ====================================================================
// Search & path finding
// ====================================================================

describe('Search — primitives', () => {
  test('levenshtein distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', 'abc')).toBe(0);
  });

  test('similarity score', () => {
    expect(similarity('abc', 'abc')).toBe(1);
    expect(similarity('', '')).toBe(1);
    expect(similarity('abc', 'xyz')).toBe(0);
  });
});

describe('Search — exact text search', () => {
  test('finds exact label match', () => {
    const g = createGraph(
      [{ id: 'a', label: 'Apple' }, { id: 'b', label: 'Banana' }],
      [],
    );
    const results = search(g, 'apple');
    expect(results).toHaveLength(1);
    expect(results[0].nodeId).toBe('a');
    expect(results[0].score).toBe(1);
    expect(results[0].matchedField).toBe('label');
  });

  test('finds substring matches', () => {
    const g = createGraph(
      [{ id: 'a', label: 'Apple Pie' }, { id: 'b', label: 'Banana' }],
      [],
    );
    const results = search(g, 'apple');
    expect(results).toHaveLength(1);
    expect(results[0].nodeId).toBe('a');
    expect(results[0].score).toBeGreaterThan(0);
    expect(results[0].score).toBeLessThan(1);
  });

  test('matches type field', () => {
    const g = createGraph([{ id: 'a', label: 'A', type: 'service' }], []);
    const results = search(g, 'service');
    expect(results).toHaveLength(1);
    expect(results[0].matchedField).toBe('type');
  });

  test('matches property values', () => {
    const g = createGraph([{ id: 'a', label: 'A', properties: { region: 'emea' } }], []);
    const results = search(g, 'emea');
    expect(results).toHaveLength(1);
    expect(results[0].matchedField).toBe('region');
  });

  test('empty query returns no results', () => {
    const g = createGraph(nodes(['a']), []);
    expect(search(g, '')).toEqual([]);
  });
});

describe('Search — fuzzy search', () => {
  test('finds approximate matches above threshold', () => {
    const g = createGraph([{ id: 'a', label: 'PostgreSQL' }], []);
    const results = fuzzySearch(g, 'postgres', 0.4);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].nodeId).toBe('a');
  });

  test('drops low-similarity results', () => {
    const g = createGraph([{ id: 'a', label: 'PostgreSQL' }], []);
    const results = fuzzySearch(g, 'xyz', 0.5);
    expect(results).toHaveLength(0);
  });
});

describe('Search — BFS path', () => {
  test('finds shortest path', () => {
    const g = createGraph(
      nodes(['a', 'b', 'c', 'd']),
      [['a', 'b'], ['b', 'd'], ['a', 'c'], ['c', 'd']].map(([s, t], i) => ({ id: `e${i}`, source: s, target: t })),
      false,
    );
    const path = bfsPath(g, 'a', 'd');
    expect(path).not.toBeNull();
    expect(path!.length).toBe(3); // a -> ? -> d
    expect(path![0]).toBe('a');
    expect(path![path!.length - 1]).toBe('d');
  });

  test('returns null when no path', () => {
    const g = createGraph(nodes(['a', 'b']), []);
    expect(bfsPath(g, 'a', 'b')).toBeNull();
  });

  test('returns [start] when start === target', () => {
    const g = createGraph(nodes(['a']), []);
    expect(bfsPath(g, 'a', 'a')).toEqual(['a']);
  });
});

describe('Search — Dijkstra', () => {
  test('finds lowest-weight path', () => {
    const g = createGraph(
      nodes(['a', 'b', 'c', 'd']),
      [
        { id: 'e1', source: 'a', target: 'b', weight: 1 },
        { id: 'e2', source: 'b', target: 'd', weight: 1 },
        { id: 'e3', source: 'a', target: 'c', weight: 5 },
        { id: 'e4', source: 'c', target: 'd', weight: 1 },
      ],
      false,
    );
    const r = dijkstra(g, 'a', 'd');
    expect(r.path).toEqual(['a', 'b', 'd']);
    expect(r.distance).toBe(2);
  });

  test('returns null path when unreachable', () => {
    const g = createGraph(nodes(['a', 'b']), []);
    const r = dijkstra(g, 'a', 'b');
    expect(r.path).toBeNull();
    expect(r.distance).toBe(Infinity);
  });

  test('treats missing weight as 1', () => {
    const g = createGraph(
      nodes(['a', 'b']),
      [{ id: 'e1', source: 'a', target: 'b' }],
      false,
    );
    expect(dijkstra(g, 'a', 'b').distance).toBe(1);
  });
});

// ====================================================================
// Exporters
// ====================================================================

describe('Export — toJSON', () => {
  test('serializes graph structure', () => {
    const g = createGraph(nodes(['a', 'b']), edges([['a', 'b']]), true);
    const json = toJSON(g);
    const parsed = JSON.parse(json);
    expect(parsed.directed).toBe(true);
    expect(parsed.nodes).toHaveLength(2);
    expect(parsed.edges).toHaveLength(1);
  });
});

describe('Export — toDot', () => {
  test('directed graph uses digraph and ->', () => {
    const g = createGraph(nodes(['a', 'b']), edges([['a', 'b']]), true);
    const dot = toDot(g);
    expect(dot).toContain('digraph G');
    expect(dot).toContain('a -> b');
  });

  test('undirected graph uses graph and --', () => {
    const g = createGraph(nodes(['a', 'b']), edges([['a', 'b']]), false);
    const dot = toDot(g);
    expect(dot).toContain('graph G');
    expect(dot).toContain('a -- b');
  });

  test('includes node labels', () => {
    const g = createGraph([{ id: 'a', label: 'My Node' }], []);
    expect(toDot(g)).toContain('"My Node"');
  });
});

describe('Export — toMermaid', () => {
  test('directed graph uses flowchart TD', () => {
    const g = createGraph(nodes(['a', 'b']), edges([['a', 'b']]), true);
    const m = toMermaid(g);
    expect(m).toContain('flowchart TD');
    expect(m).toContain('a --> b');
  });

  test('edge labels are rendered', () => {
    const g = createGraph(nodes(['a', 'b']), [{ id: 'e1', source: 'a', target: 'b', label: 'calls' }], true);
    expect(toMermaid(g)).toContain('"calls"');
  });

  test('non-alphanumeric ids are sanitized', () => {
    const g = createGraph([{ id: 'node-1', label: 'A' }, { id: 'node-2', label: 'B' }], [{ id: 'e1', source: 'node-1', target: 'node-2' }], true);
    const m = toMermaid(g);
    expect(m).toContain('node_1');
    expect(m).toContain('node_2');
  });
});

describe('Export — toSVG', () => {
  test('produces a valid SVG string with nodes and edges', () => {
    const g = createGraph(nodes(['a', 'b']), edges([['a', 'b']]));
    const layout = grid(g);
    const svg = toSVG(g, layout);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('<circle');
    expect(svg).toContain('<line');
  });

  test('throws when layout is missing a node', () => {
    const g = createGraph(nodes(['a', 'b']), []);
    const layout = new Map();
    layout.set('a', { x: 0, y: 0 });
    expect(() => toSVG(g, layout)).toThrow(ExportError);
  });
});

// ====================================================================
// Renderer
// ====================================================================

describe('Render — renderToSVG', () => {
  test('uses defaults when no config provided', () => {
    const cfg = mergeRenderConfig();
    expect(cfg.width).toBe(DEFAULT_RENDER_CONFIG.width);
    expect(cfg.nodeColor).toBe(DEFAULT_RENDER_CONFIG.nodeColor);
  });

  test('renders full SVG document', () => {
    const g = createGraph(nodes(['a', 'b']), [{ id: 'e1', source: 'a', target: 'b', label: 'calls' }]);
    const layout = grid(g);
    const svg = renderToSVG(g, layout, { width: 400, height: 300, nodeColor: '#f00' });
    expect(svg).toContain('<svg');
    expect(svg).toContain('width="400"');
    expect(svg).toContain('height="300"');
    expect(svg).toContain('#f00');
    expect(svg).toContain('calls');
  });

  test('hides labels when showLabels is false', () => {
    const g = createGraph([{ id: 'a', label: 'Hidden' }], []);
    const layout = grid(g);
    const svg = renderToSVG(g, layout, { showLabels: false });
    expect(svg).not.toContain('Hidden');
  });

  test('directed graph includes arrow marker', () => {
    const g = createGraph(nodes(['a', 'b']), edges([['a', 'b']]), true);
    const layout = grid(g);
    const svg = renderToSVG(g, layout);
    expect(svg).toContain('marker-end');
    expect(svg).toContain('weave-arrow');
  });

  test('throws when layout is missing a node', () => {
    const g = createGraph(nodes(['a', 'b']), []);
    const layout = new Map();
    layout.set('a', { x: 0, y: 0 });
    expect(() => renderToSVG(g, layout)).toThrow(ExportError);
  });
});

// ====================================================================
// Topology
// ====================================================================

describe('Topology', () => {
  test('takeSnapshot produces an independent copy', () => {
    const g = createGraph(nodes(['a', 'b']), edges([['a', 'b']]));
    const snap = takeSnapshot(g, '2024-01-01T00:00:00Z');
    g.addNode({ id: 'c', label: 'C' });
    expect(snap.takenAt).toBe('2024-01-01T00:00:00Z');
    expect(snap.graph.nodes).toHaveLength(2);
    expect(g.size()).toBe(3);
  });

  test('diffSnapshots detects added/removed nodes', () => {
    const a = takeSnapshot(createGraph(nodes(['a', 'b']), []), 't1');
    const b = takeSnapshot(createGraph(nodes(['a', 'c']), []), 't2');
    const diff = diffSnapshots(a, b);
    expect(diff.addedNodes.map(n => n.id)).toEqual(['c']);
    expect(diff.removedNodes).toEqual(['b']);
  });

  test('diffSnapshots detects added/removed edges', () => {
    const a = takeSnapshot(createGraph(nodes(['a', 'b']), edges([['a', 'b']])), 't1');
    const b = takeSnapshot(createGraph(nodes(['a', 'b']), []), 't2');
    const diff = diffSnapshots(a, b);
    expect(diff.removedEdges).toEqual(['e0']);
    expect(diff.addedEdges).toEqual([]);
  });

  test('TopologyTracker records and diffs', () => {
    const tracker = new TopologyTracker();
    const g1 = createGraph(nodes(['a', 'b']), []);
    tracker.snapshot(g1, 't1');
    expect(tracker.current()!.takenAt).toBe('t1');
    expect(tracker.previous()).toBeUndefined();

    const g2 = createGraph(nodes(['a', 'b', 'c']), []);
    tracker.snapshot(g2, 't2');
    expect(tracker.previous()!.takenAt).toBe('t1');
    expect(tracker.current()!.takenAt).toBe('t2');

    const diff = tracker.diff();
    expect(diff).not.toBeNull();
    expect(diff!.addedNodes.map(n => n.id)).toEqual(['c']);
    expect(diff!.removedNodes).toEqual([]);
  });

  test('TopologyTracker.diff returns null with < 2 snapshots', () => {
    const tracker = new TopologyTracker();
    tracker.snapshot(createGraph(nodes(['a']), []));
    expect(tracker.diff()).toBeNull();
  });

  test('TopologyTracker.reset clears history', () => {
    const tracker = new TopologyTracker();
    tracker.snapshot(createGraph(nodes(['a']), []));
    tracker.reset();
    expect(tracker.snapshots()).toHaveLength(0);
  });

  test('TopologyTracker enforces maxHistory', () => {
    const tracker = new TopologyTracker(2);
    tracker.snapshot(createGraph(nodes(['a']), []), 't1');
    tracker.snapshot(createGraph(nodes(['a', 'b']), []), 't2');
    tracker.snapshot(createGraph(nodes(['a', 'b', 'c']), []), 't3');
    expect(tracker.snapshots()).toHaveLength(2);
    expect(tracker.snapshots()[0].takenAt).toBe('t2');
  });
});

// ====================================================================
// Interactive
// ====================================================================

describe('Interactive — SelectionModel', () => {
  test('toggle node adds then removes', () => {
    const sel = new SelectionModel();
    expect(sel.toggleNode('a')).toBe(true);
    expect(sel.isNodeSelected('a')).toBe(true);
    expect(sel.toggleNode('a')).toBe(false);
    expect(sel.isNodeSelected('a')).toBe(false);
  });

  test('select/deselect edge', () => {
    const sel = new SelectionModel();
    sel.selectEdge('e1');
    expect(sel.isEdgeSelected('e1')).toBe(true);
    sel.deselectEdge('e1');
    expect(sel.isEdgeSelected('e1')).toBe(false);
  });

  test('selectedNodeIds returns sorted array', () => {
    const sel = new SelectionModel();
    sel.selectNode('b').selectNode('a').selectNode('c');
    expect(sel.selectedNodeIds()).toEqual(['a', 'b', 'c']);
  });

  test('clear empties selection', () => {
    const sel = new SelectionModel();
    sel.selectNode('a').selectEdge('e1');
    sel.clear();
    expect(sel.isEmpty()).toBe(true);
  });

  test('setSelection replaces selection', () => {
    const sel = new SelectionModel();
    sel.selectNode('a');
    sel.setSelection(['x', 'y'], ['e1']);
    expect(sel.selectedNodeIds()).toEqual(['x', 'y']);
    expect(sel.selectedEdgeIds()).toEqual(['e1']);
  });

  test('toJSON serializes selection', () => {
    const sel = new SelectionModel();
    sel.selectNode('a').selectEdge('e1');
    expect(sel.toJSON()).toEqual({ nodes: ['a'], edges: ['e1'] });
  });
});

describe('Interactive — Viewport', () => {
  test('DEFAULT_VIEWPORT is identity', () => {
    expect(DEFAULT_VIEWPORT.zoom).toBe(1);
    expect(DEFAULT_VIEWPORT.centerX).toBe(0);
    expect(DEFAULT_VIEWPORT.centerY).toBe(0);
  });

  test('applyViewport with identity is a no-op', () => {
    const p = applyViewport({ x: 5, y: 10 }, DEFAULT_VIEWPORT);
    expect(p).toEqual({ x: 5, y: 10 });
  });

  test('applyViewport with zoom 2 scales', () => {
    const p = applyViewport({ x: 10, y: 0 }, { centerX: 0, centerY: 0, zoom: 2 });
    expect(p.x).toBe(20);
    expect(p.y).toBe(0);
  });

  test('applyViewport with center offsets', () => {
    const p = applyViewport({ x: 100, y: 100 }, { centerX: 50, centerY: 50, zoom: 1 });
    expect(p).toEqual({ x: 50, y: 50 });
  });

  test('inverseViewport is the inverse of applyViewport', () => {
    const vp = { centerX: 10, centerY: 20, zoom: 3 };
    const original = { x: 100, y: 200 };
    const screen = applyViewport(original, vp);
    const back = inverseViewport(screen, vp);
    expect(back.x).toBeCloseTo(original.x, 6);
    expect(back.y).toBeCloseTo(original.y, 6);
  });

  test('applyViewport throws on non-positive zoom', () => {
    expect(() => applyViewport({ x: 0, y: 0 }, { centerX: 0, centerY: 0, zoom: 0 })).toThrow(RangeError);
    expect(() => applyViewport({ x: 0, y: 0 }, { centerX: 0, centerY: 0, zoom: -1 })).toThrow(RangeError);
  });

  test('panTo centers on graph point at given screen point', () => {
    const vp = panTo({ x: 100, y: 100 }, { x: 0, y: 0 }, 1);
    expect(vp.centerX).toBe(100);
    expect(vp.centerY).toBe(100);
  });

  test('zoomAt keeps anchor screen point fixed', () => {
    const start = { centerX: 0, centerY: 0, zoom: 1 };
    const anchor = { x: 50, y: 50 };
    const newVp = zoomAt(start, anchor, 2);
    // After zoom, the same graph point should still appear at `anchor`.
    const graphPoint = inverseViewport(anchor, start);
    const screenAfter = applyViewport(graphPoint, newVp);
    expect(screenAfter.x).toBeCloseTo(anchor.x, 6);
    expect(screenAfter.y).toBeCloseTo(anchor.y, 6);
  });
});

// ====================================================================
// End-to-end: build, layout, export to SVG
// ====================================================================

describe('End-to-end', () => {
  test('build a dependency graph, lay it out, render to SVG', () => {
    const g = createGraph(
      [
        { id: 'web', label: 'Web Client', type: 'service' },
        { id: 'api', label: 'API Gateway', type: 'service' },
        { id: 'auth', label: 'Auth Service', type: 'service' },
        { id: 'db', label: 'Database', type: 'db' },
      ],
      [
        { id: 'e1', source: 'web', target: 'api', label: 'calls' },
        { id: 'e2', source: 'api', target: 'auth', label: 'verifies' },
        { id: 'e3', source: 'api', target: 'db', label: 'queries' },
      ],
      true,
    );

    const layout = hierarchical(g, { width: 800, height: 600 });
    const svg = renderToSVG(g, layout, { nodeColor: '#5b8def', showLabels: true });
    expect(svg).toContain('<svg');
    expect(svg).toContain('marker-end');
    expect(svg).toContain('Web Client');
    expect(svg).toContain('API Gateway');
    expect(svg).toContain('Auth Service');
    expect(svg).toContain('Database');
  });

  test('filter to a subgraph, search, find path', () => {
    const g = createGraph(
      [
        { id: 'a', label: 'Auth', type: 'service' },
        { id: 'b', label: 'Billing', type: 'service' },
        { id: 'c', label: 'Catalog', type: 'service' },
        { id: 'd', label: 'DB', type: 'db' },
      ],
      [
        { id: 'e1', source: 'a', target: 'd' },
        { id: 'e2', source: 'b', target: 'd' },
        { id: 'e3', source: 'c', target: 'd' },
      ],
      false,
    );
    const services = filterByType(g, 'service');
    expect(services.size()).toBe(3);
    expect(services.edgeCount()).toBe(0); // DB removed

    const results = search(g, 'DB');
    expect(results).toHaveLength(1);
    expect(results[0].nodeId).toBe('d');

    const path = bfsPath(g, 'a', 'd');
    expect(path).toEqual(['a', 'd']);
  });

  test('topology tracker detects a node addition over time', () => {
    const tracker = new TopologyTracker();
    const g1 = createGraph(nodes(['api', 'db']), edges([['api', 'db']]));
    tracker.snapshot(g1, 't0');
    const g2 = g1.clone();
    g2.addNode({ id: 'cache', label: 'Cache' });
    g2.addEdge({ id: 'e1', source: 'api', target: 'cache' });
    tracker.snapshot(g2, 't1');
    const diff = tracker.diff()!;
    expect(diff.addedNodes.map(n => n.id)).toEqual(['cache']);
    expect(diff.addedEdges.map(e => e.id)).toEqual(['e1']);
    expect(diff.removedNodes).toEqual([]);
  });
});

// ====================================================================
// Errors
// ====================================================================

describe('Error hierarchy', () => {
  test('GraphError extends WeaveError with code GRAPH_ERROR', () => {
    const e = new GraphError('x');
    expect(e).toBeInstanceOf(WeaveError);
    expect(e).toBeInstanceOf(GraphError);
    expect(e.code).toBe('GRAPH_ERROR');
    expect(e.message).toBe('x');
    expect(e.name).toBe('GraphError');
  });

  test('LayoutError code is LAYOUT_ERROR', () => {
    expect(new LayoutError('x').code).toBe('LAYOUT_ERROR');
  });

  test('ExportError code is EXPORT_ERROR', () => {
    expect(new ExportError('x').code).toBe('EXPORT_ERROR');
  });

  test('WeaveError base code defaults to WEAVE_ERROR', () => {
    expect(new WeaveError('x').code).toBe('WEAVE_ERROR');
  });

  test('error preserves cause', () => {
    const inner = new Error('inner');
    const e = new GraphError('outer', inner);
    expect(e.cause).toBe(inner);
  });
});
