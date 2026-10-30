"use strict";
/**
 * @manya-os/weave — interactive exploration primitives.
 *
 * `SelectionModel` tracks the currently selected nodes/edges.
 * `Viewport` captures pan/zoom state and `applyViewport` transforms a point
 * from graph coordinates to viewport (screen) coordinates.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDENTITY_VIEWPORT = exports.SelectionModel = exports.DEFAULT_VIEWPORT = void 0;
exports.applyViewport = applyViewport;
exports.inverseViewport = inverseViewport;
exports.panTo = panTo;
exports.zoomAt = zoomAt;
/** Default viewport: centered at origin, zoom 1. */
exports.DEFAULT_VIEWPORT = { centerX: 0, centerY: 0, zoom: 1 };
/** A mutable selection of nodes and edges for interactive exploration. */
class SelectionModel {
    selectedNodes = new Set();
    selectedEdges = new Set();
    /** Select a node by id. */
    selectNode(id) {
        this.selectedNodes.add(id);
        return this;
    }
    /** Select an edge by id. */
    selectEdge(id) {
        this.selectedEdges.add(id);
        return this;
    }
    /** Deselect a node. */
    deselectNode(id) {
        this.selectedNodes.delete(id);
        return this;
    }
    /** Deselect an edge. */
    deselectEdge(id) {
        this.selectedEdges.delete(id);
        return this;
    }
    /** Toggle node selection. Returns the new selection state. */
    toggleNode(id) {
        if (this.selectedNodes.has(id)) {
            this.selectedNodes.delete(id);
            return false;
        }
        this.selectedNodes.add(id);
        return true;
    }
    /** Toggle edge selection. Returns the new selection state. */
    toggleEdge(id) {
        if (this.selectedEdges.has(id)) {
            this.selectedEdges.delete(id);
            return false;
        }
        this.selectedEdges.add(id);
        return true;
    }
    /** True iff the node is currently selected. */
    isNodeSelected(id) {
        return this.selectedNodes.has(id);
    }
    /** True iff the edge is currently selected. */
    isEdgeSelected(id) {
        return this.selectedEdges.has(id);
    }
    /** All currently selected node ids. */
    selectedNodeIds() {
        return Array.from(this.selectedNodes).sort();
    }
    /** All currently selected edge ids. */
    selectedEdgeIds() {
        return Array.from(this.selectedEdges).sort();
    }
    /** Number of selected nodes. */
    nodeCount() {
        return this.selectedNodes.size;
    }
    /** Number of selected edges. */
    edgeCount() {
        return this.selectedEdges.size;
    }
    /** Clear all selections. */
    clear() {
        this.selectedNodes.clear();
        this.selectedEdges.clear();
        return this;
    }
    /** True iff nothing is selected. */
    isEmpty() {
        return this.selectedNodes.size === 0 && this.selectedEdges.size === 0;
    }
    /** Replace the selection with the given node/edge ids. */
    setSelection(nodes, edges = []) {
        this.clear();
        for (const n of nodes)
            this.selectedNodes.add(n);
        for (const e of edges)
            this.selectedEdges.add(e);
        return this;
    }
    /** Snapshot the current selection as plain arrays. */
    toJSON() {
        return { nodes: this.selectedNodeIds(), edges: this.selectedEdgeIds() };
    }
}
exports.SelectionModel = SelectionModel;
/** Default viewport: centered at origin, zoom 1. Convenience alias. */
exports.IDENTITY_VIEWPORT = exports.DEFAULT_VIEWPORT;
/**
 * Validate a viewport. Throws on degenerate zoom.
 * @internal
 */
function validateViewport(v) {
    if (!Number.isFinite(v.centerX) || !Number.isFinite(v.centerY)) {
        throw new RangeError('Viewport.centerX/centerY must be finite');
    }
    if (!Number.isFinite(v.zoom) || v.zoom <= 0) {
        throw new RangeError('Viewport.zoom must be a positive finite number');
    }
}
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
function applyViewport(point, viewport) {
    validateViewport(viewport);
    return {
        x: (point.x - viewport.centerX) * viewport.zoom,
        y: (point.y - viewport.centerY) * viewport.zoom,
    };
}
/** Inverse of `applyViewport`: map a screen-space point back into graph space. */
function inverseViewport(point, viewport) {
    validateViewport(viewport);
    return {
        x: point.x / viewport.zoom + viewport.centerX,
        y: point.y / viewport.zoom + viewport.centerY,
    };
}
/**
 * Compute a new viewport that pans so that the given graph-space point appears
 * at the given screen-space point.
 *
 * @param graphPoint a point in graph coordinates to anchor
 * @param screenPoint where it should appear in screen coordinates
 * @param zoom the zoom factor (preserved)
 */
function panTo(graphPoint, screenPoint, zoom) {
    if (!Number.isFinite(zoom) || zoom <= 0)
        throw new RangeError('zoom must be positive');
    return {
        centerX: graphPoint.x - screenPoint.x / zoom,
        centerY: graphPoint.y - screenPoint.y / zoom,
        zoom,
    };
}
/** Create a viewport that zooms by `factor` while keeping `anchor` (screen point) fixed. */
function zoomAt(viewport, anchor, factor) {
    validateViewport(viewport);
    if (!Number.isFinite(factor) || factor <= 0)
        throw new RangeError('factor must be positive');
    const newZoom = viewport.zoom * factor;
    const graphAnchor = inverseViewport(anchor, viewport);
    return panTo(graphAnchor, anchor, newZoom);
}
//# sourceMappingURL=interactive.js.map