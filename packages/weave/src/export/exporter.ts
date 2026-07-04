/**
 * @manya/weave — graph exporters.
 *
 * Serialize a graph to multiple formats:
 *   - `toJSON`   — JSON string of the graph shape.
 *   - `toDot`    — Graphviz DOT.
 *   - `toMermaid`— Mermaid flowchart.
 *   - `toSVG`    — minimal SVG using absolute positions from a layout.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { Layout } from '../types.js';
import type { Graph } from '../graph/graph.js';
import { ExportError } from '../errors.js';

/** Escape a string for safe embedding in a JSON document (JSON.stringify handles this). */
function jsonString(s: unknown): string {
  return JSON.stringify(s);
}

/** Escape a string for DOT identifiers / labels. */
function escapeDot(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Is `s` a "bare" DOT identifier (alphanumeric + underscore, not starting with digit)?
 */
function isBareDotId(s: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(s);
}

/** Escape a string for Mermaid labels. Mermaid uses `"`-quoted labels. */
function escapeMermaid(s: string): string {
  return s.replace(/"/g, '#quot;');
}

/**
 * Serialize the graph to a JSON string.
 *
 * The shape is `{ directed, nodes: [...], edges: [...] }`.
 */
export function toJSON(graph: Graph): string {
  return JSON.stringify({
    directed: graph.directed,
    nodes: graph.nodes,
    edges: graph.edges,
  }, null, 2);
}

/**
 * Serialize the graph to Graphviz DOT.
 *
 * Uses `digraph` for directed graphs and `graph` for undirected. Edge
 * operators are `->` and `--` respectively.
 */
export function toDot(graph: Graph, name: string = 'G'): string {
  const lines: string[] = [];
  lines.push(`${graph.directed ? 'digraph' : 'graph'} ${name} {`);
  for (const n of graph.nodes) {
    const attrs: string[] = [`label=${jsonString(n.label)}`];
    if (n.type) attrs.push(`type=${jsonString(n.type)}`);
    lines.push(`  ${isBareDotId(n.id) ? n.id : jsonString(n.id)} [${attrs.join(', ')}];`);
  }
  const op = graph.directed ? '->' : '--';
  for (const e of graph.edges) {
    const s = isBareDotId(e.source) ? e.source : jsonString(e.source);
    const t = isBareDotId(e.target) ? e.target : jsonString(e.target);
    const attrs: string[] = [];
    if (e.label) attrs.push(`label=${jsonString(e.label)}`);
    if (e.type) attrs.push(`type=${jsonString(e.type)}`);
    if (typeof e.weight === 'number') attrs.push(`weight=${e.weight}`);
    const attrStr = attrs.length > 0 ? ` [${attrs.join(', ')}]` : '';
    lines.push(`  ${s} ${op} ${t}${attrStr};`);
  }
  lines.push('}');
  return lines.join('\n');
}

/**
 * Serialize the graph to a Mermaid flowchart string.
 *
 * Uses `flowchart TD` for directed graphs and `flowchart LR` for undirected
 * (Mermaid has no first-class undirected flowchart; LR is the closest visual).
 */
export function toMermaid(graph: Graph): string {
  const dir = graph.directed ? 'TD' : 'LR';
  const lines: string[] = [`flowchart ${dir}`];
  // Mermaid node ids must be sanitized (alphanumeric + underscore).
  const safeId = (id: string) => id.replace(/[^A-Za-z0-9_]/g, '_');
  const idMap = new Map<string, string>();
  for (const n of graph.nodes) {
    const sid = safeId(n.id);
    idMap.set(n.id, sid);
    lines.push(`  ${sid}["${escapeMermaid(n.label)}"]`);
  }
  for (const e of graph.edges) {
    const s = idMap.get(e.source)!;
    const t = idMap.get(e.target)!;
    if (e.label) {
      lines.push(`  ${s} -- "${escapeMermaid(e.label)}" --> ${t}`);
    } else {
      lines.push(`  ${s} --> ${t}`);
    }
  }
  return lines.join('\n');
}

/**
 * Render a minimal SVG using absolute positions from a layout.
 *
 * This is intentionally simple. For a full-featured renderer with configurable
 * colors, fonts, and canvas size, use `renderToSVG` from `@manya/weave/render`.
 *
 * @param graph input graph
 * @param layout node positions
 * @param width canvas width (default 800)
 * @param height canvas height (default 600)
 */
export function toSVG(
  graph: Graph,
  layout: Layout,
  width: number = 800,
  height: number = 600,
): string {
  if (!layout) throw new ExportError('toSVG requires a layout');
  // Compute bounds for auto-fit if positions stray outside [0,width]×[0,height].
  const positions: Array<{ id: string; x: number; y: number }> = [];
  for (const n of graph.nodes) {
    const p = layout.get(n.id);
    if (!p) throw new ExportError(`Layout missing position for node: ${n.id}`);
    positions.push({ id: n.id, x: p.x, y: p.y });
  }
  const minX = Math.min(0, ...positions.map(p => p.x)) - 30;
  const minY = Math.min(0, ...positions.map(p => p.y)) - 30;
  const maxX = Math.max(width, ...positions.map(p => p.x)) + 30;
  const maxY = Math.max(height, ...positions.map(p => p.y)) + 30;
  const w = maxX - minX;
  const h = maxY - minY;

  const lines: string[] = [];
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${minX} ${minY} ${w} ${h}">`);
  lines.push(`<rect x="${minX}" y="${minY}" width="${w}" height="${h}" fill="white"/>`);

  // Edges.
  for (const e of graph.edges) {
    const a = layout.get(e.source);
    const b = layout.get(e.target);
    if (!a || !b) continue;
    lines.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="black" stroke-width="1"/>`);
  }
  // Nodes.
  for (const p of positions) {
    const node = graph.getNode(p.id);
    const label = node?.label ?? p.id;
    lines.push(`<circle cx="${p.x}" cy="${p.y}" r="15" fill="#eee" stroke="black" stroke-width="1"/>`);
    lines.push(`<text x="${p.x}" y="${p.y - 22}" font-size="11" font-family="sans-serif" text-anchor="middle" fill="black">${escapeXml(label)}</text>`);
  }
  lines.push('</svg>');
  return lines.join('\n');
}

/** Minimal XML escaper for text content. */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
