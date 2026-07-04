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
/** Default render configuration. */
export declare const DEFAULT_RENDER_CONFIG: RenderConfig;
/** Merge a partial config with defaults. */
export declare function mergeRenderConfig(partial?: Partial<RenderConfig>): RenderConfig;
/**
 * Render a graph to a full SVG document.
 *
 * @param graph input graph
 * @param layout node positions
 * @param config render configuration (partial OK; merged with defaults)
 * @returns SVG string
 */
export declare function renderToSVG(graph: Graph, layout: Layout, config?: Partial<RenderConfig>): string;
//# sourceMappingURL=renderer.d.ts.map