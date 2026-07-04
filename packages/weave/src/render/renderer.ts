/**
 * @manya/weave — SVG renderer with full configuration.
 *
 * `renderToSVG` produces a complete SVG document with configurable colors,
 * node radius, font size, and optional label rendering. It is the
 * feature-complete counterpart to the minimal `toSVG` in `@manya/weave/export`.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { RenderConfig, Layout } from '../types.js';
import type { Graph } from '../graph/graph.js';
import { ExportError } from '../errors.js';

/** Default render configuration. */
export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  width: 800,
  height: 600,
  nodeRadius: 18,
  fontSize: 12,
  nodeColor: '#6ba8d6',
  edgeColor: '#888888',
  backgroundColor: '#ffffff',
  showLabels: true,
};

/** Merge a partial config with defaults. */
export function mergeRenderConfig(partial?: Partial<RenderConfig>): RenderConfig {
  if (!partial) return { ...DEFAULT_RENDER_CONFIG };
  return { ...DEFAULT_RENDER_CONFIG, ...partial };
}

/** Escape a string for safe inclusion in XML/SVG text content. */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Render a graph to a full SVG document.
 *
 * @param graph input graph
 * @param layout node positions
 * @param config render configuration (partial OK; merged with defaults)
 * @returns SVG string
 */
export function renderToSVG(
  graph: Graph,
  layout: Layout,
  config?: Partial<RenderConfig>,
): string {
  const cfg = mergeRenderConfig(config);
  if (!layout) throw new ExportError('renderToSVG requires a layout');

  // Validate positions exist for every node.
  for (const n of graph.nodes) {
    if (!layout.has(n.id)) {
      throw new ExportError(`Layout missing position for node: ${n.id}`);
    }
  }

  const lines: string[] = [];
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${cfg.width}" height="${cfg.height}" viewBox="0 0 ${cfg.width} ${cfg.height}">`);
  lines.push(`<rect x="0" y="0" width="${cfg.width}" height="${cfg.height}" fill="${escapeXml(cfg.backgroundColor)}"/>`);

  // Define a default arrowhead marker for directed graphs.
  if (graph.directed) {
    lines.push('<defs>');
    lines.push(`<marker id="weave-arrow" markerWidth="10" markerHeight="10" refX="${cfg.nodeRadius + 2}" refY="3" orient="auto" markerUnits="userSpaceOnUse">`);
    lines.push(`<path d="M0,0 L0,6 L6,3 z" fill="${escapeXml(cfg.edgeColor)}"/>`);
    lines.push('</marker>');
    lines.push('</defs>');
  }

  // Edges.
  for (const e of graph.edges) {
    const a = layout.get(e.source)!;
    const b = layout.get(e.target)!;
    // Shorten the edge so it ends at the node boundary.
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    let x2 = b.x;
    let y2 = b.y;
    if (len > 0) {
      const ux = dx / len;
      const uy = dy / len;
      x2 = b.x - ux * cfg.nodeRadius;
      y2 = b.y - uy * cfg.nodeRadius;
    }
    const markerAttr = graph.directed ? ' marker-end="url(#weave-arrow)"' : '';
    lines.push(`<line x1="${a.x}" y1="${a.y}" x2="${x2}" y2="${y2}" stroke="${escapeXml(cfg.edgeColor)}" stroke-width="1.5"${markerAttr}/>`);
    if (cfg.showLabels && e.label) {
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2 - 4;
      lines.push(`<text x="${mx}" y="${my}" font-size="${Math.max(8, cfg.fontSize - 2)}" font-family="sans-serif" text-anchor="middle" fill="${escapeXml(cfg.edgeColor)}">${escapeXml(e.label)}</text>`);
    }
  }

  // Nodes.
  for (const n of graph.nodes) {
    const p = layout.get(n.id)!;
    lines.push(`<circle cx="${p.x}" cy="${p.y}" r="${cfg.nodeRadius}" fill="${escapeXml(cfg.nodeColor)}" stroke="black" stroke-width="1"/>`);
    if (cfg.showLabels) {
      const labelY = p.y - cfg.nodeRadius - 4;
      lines.push(`<text x="${p.x}" y="${labelY}" font-size="${cfg.fontSize}" font-family="sans-serif" text-anchor="middle" fill="black">${escapeXml(n.label)}</text>`);
    }
  }

  lines.push('</svg>');
  return lines.join('\n');
}
