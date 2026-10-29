/**
 * @manya/weave — interactive exploration primitives.
 *
 * `SelectionModel` tracks the currently selected nodes/edges.
 * `Viewport` captures pan/zoom state and `applyViewport` transforms a point
 * from graph coordinates to viewport (screen) coordinates.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { NodeID, EdgeID, Point, Viewport } from '../types.js';
/** Default viewport: centered at origin, zoom 1. */
export declare const DEFAULT_VIEWPORT: Viewport;
/** A mutable selection of nodes and edges for interactive exploration. */
export declare class SelectionModel {
    private readonly selectedNodes;
    private readonly selectedEdges;
    /** Select a node by id. */
    selectNode(id: NodeID): this;
    /** Select an edge by id. */
    selectEdge(id: EdgeID): this;
    /** Deselect a node. */
    deselectNode(id: NodeID): this;
    /** Deselect an edge. */
    deselectEdge(id: EdgeID): this;
    /** Toggle node selection. Returns the new selection state. */
    toggleNode(id: NodeID): boolean;
    /** Toggle edge selection. Returns the new selection state. */
    toggleEdge(id: EdgeID): boolean;
    /** True iff the node is currently selected. */
    isNodeSelected(id: NodeID): boolean;
    /** True iff the edge is currently selected. */
    isEdgeSelected(id: EdgeID): boolean;
    /** All currently selected node ids. */
    selectedNodeIds(): NodeID[];
    /** All currently selected edge ids. */
    selectedEdgeIds(): EdgeID[];
    /** Number of selected nodes. */
    nodeCount(): number;
    /** Number of selected edges. */
    edgeCount(): number;
    /** Clear all selections. */
    clear(): this;
    /** True iff nothing is selected. */
    isEmpty(): boolean;
    /** Replace the selection with the given node/edge ids. */
    setSelection(nodes: Iterable<NodeID>, edges?: Iterable<EdgeID>): this;
    /** Snapshot the current selection as plain arrays. */
    toJSON(): {
        nodes: NodeID[];
        edges: EdgeID[];
    };
}
/** Default viewport: centered at origin, zoom 1. Convenience alias. */
export declare const IDENTITY_VIEWPORT: Viewport;
/**
 * Transform a point from graph coordinates to viewport (screen) coordinates.
 *
 * The viewport centers on `(centerX, centerY)` in graph coordinates and
 * applies a uniform `zoom` factor. The transform is:
 *
 * ```
 * screen.x = (graph.x - centerX) * zoom
 * screen.y = (graph.y - centerY) * zoom
 * ```
 *
 * @param point a point in graph coordinates
 * @param viewport pan/zoom state
 */
export declare function applyViewport(point: Point, viewport: Viewport): Point;
/** Inverse of `applyViewport`: map a screen-space point back into graph space. */
export declare function inverseViewport(point: Point, viewport: Viewport): Point;
/**
 * Compute a new viewport that pans so that the given graph-space point appears
 * at the given screen-space point.
 *
 * @param graphPoint a point in graph coordinates to anchor
 * @param screenPoint where it should appear in screen coordinates
 * @param zoom the zoom factor (preserved)
 */
export declare function panTo(graphPoint: Point, screenPoint: Point, zoom: number): Viewport;
/** Create a viewport that zooms by `factor` while keeping `anchor` (screen point) fixed. */
export declare function zoomAt(viewport: Viewport, anchor: Point, factor: number): Viewport;
//# sourceMappingURL=interactive.d.ts.map