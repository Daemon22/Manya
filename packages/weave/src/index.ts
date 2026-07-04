/**
 * @manya/weave — interactive visualization substrate for the MANYA Intelligence OS.
 *
 * Public API surface for @manya/weave. Everything exported here is part of the
 * stable, semver-bound public API.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

// ----- types & errors -----
export * from './types.js';
export * from './errors.js';

// ----- logging -----
export {
  Logger, LogLevel, ConsoleLogger, SilentLogger,
  scrubMetadata, shouldScrubField, SCRUBBED_FIELD_NAMES,
} from './logging.js';

// ----- graph -----
export { Graph, createGraph } from './graph/graph.js';

// ----- layout -----
export {
  mulberry32,
  forceDirected, hierarchical, radial, grid,
} from './layout/layout.js';
export type {
  LayoutOptions, ForceDirectedOptions, HierarchicalOptions,
  RadialOptions, GridOptions,
} from './layout/layout.js';

// ----- filter -----
export {
  filterByLabel, filterByType, filterByEdgeType,
  filterByComponent, filterByDepth, filterByProperty,
  filterNodes, filterEdges,
} from './filter/filter.js';

// ----- search -----
export {
  levenshtein, similarity,
  search, fuzzySearch,
  bfsPath, dijkstra,
} from './search/search.js';

// ----- export -----
export { toJSON, toDot, toMermaid, toSVG } from './export/exporter.js';

// ----- render -----
export { renderToSVG, mergeRenderConfig, DEFAULT_RENDER_CONFIG } from './render/renderer.js';

// ----- topology -----
export { takeSnapshot, diffSnapshots, TopologyTracker } from './topology/topology.js';

// ----- interactive -----
export {
  SelectionModel,
  DEFAULT_VIEWPORT, IDENTITY_VIEWPORT,
  applyViewport, inverseViewport, panTo, zoomAt,
} from './interactive/interactive.js';
