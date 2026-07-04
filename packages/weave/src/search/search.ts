/**
 * @manya/weave — graph search and path finding.
 *
 * Provides:
 *   - `search` — exact text search across node labels and properties.
 *   - `fuzzySearch` — token-level fuzzy match using a Levenshtein-based score.
 *   - `bfsPath` — shortest unweighted path (BFS).
 *   - `dijkstra` — shortest weighted path.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { NodeID, SearchResult } from '../types.js';
import type { Graph } from '../graph/graph.js';

/** Normalize a string for matching: lowercase, collapse whitespace, strip punctuation. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Levenshtein edit distance. */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

/** Similarity score in [0, 1] based on Levenshtein distance. */
export function similarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  const d = levenshtein(a, b);
  return 1 - d / Math.max(a.length, b.length);
}

/** Collect searchable field strings from a node. Returns [field, value] pairs. */
function fieldsOf(node: { label: string; type?: string; properties?: Record<string, unknown> }): Array<[string, string]> {
  const out: Array<[string, string]> = [['label', node.label]];
  if (node.type) out.push(['type', node.type]);
  if (node.properties) {
    for (const [k, v] of Object.entries(node.properties)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        out.push([k, String(v)]);
      }
    }
  }
  return out;
}

/**
 * Exact (case-insensitive, punctuation-normalized) text search.
 *
 * Returns results sorted by score desc, then node id asc.
 *
 * @param graph input
 * @param query search query
 */
export function search(graph: Graph, query: string): SearchResult[] {
  const q = normalize(query);
  if (q.length === 0) return [];
  const results: SearchResult[] = [];
  for (const node of graph.nodes) {
    for (const [field, value] of fieldsOf(node)) {
      const nv = normalize(value);
      if (nv === q) {
        results.push({ nodeId: node.id, score: 1, matchedField: field });
        break;
      }
      if (nv.includes(q)) {
        // Substring match — score proportional to coverage.
        const score = q.length / nv.length;
        results.push({ nodeId: node.id, score, matchedField: field });
        break;
      }
    }
  }
  results.sort((a, b) => (b.score - a.score) || (a.nodeId < b.nodeId ? -1 : 1));
  return results;
}

/**
 * Fuzzy text search.
 *
 * Each node is scored by the best token-level similarity to the query across
 * its searchable fields. Results with score < `threshold` (default 0.3) are
 * dropped.
 *
 * @param graph input
 * @param query search query
 * @param threshold minimum similarity in [0, 1]
 */
export function fuzzySearch(graph: Graph, query: string, threshold: number = 0.3): SearchResult[] {
  const q = normalize(query);
  if (q.length === 0) return [];
  const results: SearchResult[] = [];
  for (const node of graph.nodes) {
    let bestScore = 0;
    let bestField = '';
    for (const [field, value] of fieldsOf(node)) {
      const nv = normalize(value);
      if (nv.length === 0) continue;
      // Token-level: take max similarity over query tokens.
      const qTokens = q.split(' ').filter(Boolean);
      const vTokens = nv.split(' ').filter(Boolean);
      let acc = 0;
      let count = 0;
      for (const qt of qTokens) {
        let best = 0;
        for (const vt of vTokens) {
          const s = similarity(qt, vt);
          if (s > best) best = s;
        }
        acc += best;
        count++;
      }
      const tokenScore = count > 0 ? acc / count : 0;
      const wholeScore = similarity(q, nv);
      const fieldScore = Math.max(tokenScore, wholeScore);
      if (fieldScore > bestScore) {
        bestScore = fieldScore;
        bestField = field;
      }
    }
    if (bestScore >= threshold) {
      results.push({ nodeId: node.id, score: bestScore, matchedField: bestField });
    }
  }
  results.sort((a, b) => (b.score - a.score) || (a.nodeId < b.nodeId ? -1 : 1));
  return results;
}

/**
 * Breadth-first shortest path (unweighted).
 *
 * @returns the path as a list of node ids from `start` to `target`, or `null`
 *          if no path exists. Returns `[start]` if start === target.
 */
export function bfsPath(graph: Graph, start: NodeID, target: NodeID): NodeID[] | null {
  if (!graph.hasNode(start) || !graph.hasNode(target)) return null;
  if (start === target) return [start];
  const prev = new Map<NodeID, NodeID | null>();
  prev.set(start, null);
  const queue: NodeID[] = [start];
  while (queue.length > 0) {
    const n = queue.shift()!;
    for (const nb of graph.neighbors(n)) {
      if (prev.has(nb)) continue;
      prev.set(nb, n);
      if (nb === target) {
        // Reconstruct.
        const path: NodeID[] = [];
        let cur: NodeID | null = nb;
        while (cur !== null) {
          path.unshift(cur);
          cur = prev.get(cur) ?? null;
        }
        return path;
      }
      queue.push(nb);
    }
  }
  return null;
}

/**
 * Dijkstra shortest weighted path.
 *
 * Uses edge `weight` (default 1). Returns the path and total distance, or
 * `{ path: null, distance: Infinity }` if no path exists.
 */
export function dijkstra(
  graph: Graph,
  start: NodeID,
  target: NodeID,
): { path: NodeID[] | null; distance: number } {
  if (!graph.hasNode(start) || !graph.hasNode(target)) {
    return { path: null, distance: Infinity };
  }
  if (start === target) return { path: [start], distance: 0 };

  // Build adjacency with weights. For undirected, treat both directions.
  const adj = new Map<NodeID, Array<{ to: NodeID; w: number }>>();
  for (const id of graph.nodes.map(n => n.id)) adj.set(id, []);
  for (const e of graph.edges) {
    const w = typeof e.weight === 'number' && e.weight >= 0 ? e.weight : 1;
    adj.get(e.source)!.push({ to: e.target, w });
    if (!graph.directed) adj.get(e.target)!.push({ to: e.source, w });
  }

  const dist = new Map<NodeID, number>();
  const prev = new Map<NodeID, NodeID | null>();
  for (const id of adj.keys()) {
    dist.set(id, Infinity);
    prev.set(id, null);
  }
  dist.set(start, 0);

  // Simple priority queue: array kept sorted by dist. O(n^2) but fine for our scale.
  const visited = new Set<NodeID>();
  while (visited.size < dist.size) {
    // Pick unvisited node with smallest dist.
    let u: NodeID | null = null;
    let best = Infinity;
    for (const [id, d] of dist) {
      if (!visited.has(id) && d < best) {
        best = d;
        u = id;
      }
    }
    if (u === null || best === Infinity) break;
    if (u === target) break;
    visited.add(u);
    for (const { to, w } of adj.get(u) ?? []) {
      if (visited.has(to)) continue;
      const alt = (dist.get(u) ?? Infinity) + w;
      if (alt < (dist.get(to) ?? Infinity)) {
        dist.set(to, alt);
        prev.set(to, u);
      }
    }
  }

  if (!isFinite(dist.get(target) ?? Infinity)) {
    return { path: null, distance: Infinity };
  }
  // Reconstruct.
  const path: NodeID[] = [];
  let cur: NodeID | null = target;
  while (cur !== null) {
    path.unshift(cur);
    cur = prev.get(cur) ?? null;
  }
  return { path, distance: dist.get(target)! };
}
