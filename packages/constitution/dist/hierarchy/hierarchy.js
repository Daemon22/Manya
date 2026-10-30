"use strict";
/**
 * @manya-os/constitution — decision hierarchies.
 *
 * A `DecisionHierarchy` is a forest of `DecisionNode`s. Each node carries a
 * `role` and an `authority` level (higher = more authority). This module
 * supports:
 *
 *   - `findCommonAuthority(a, b)` — the lowest common ancestor of two nodes.
 *   - `canOverride(decider, original)` — `true` iff `decider.authority >
 *     original.authority`.
 *   - `escalationPath(from)` — the chain of nodes from `from` upward to the
 *     root.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireNode = requireNode;
exports.escalationPath = escalationPath;
exports.findCommonAuthority = findCommonAuthority;
exports.canOverride = canOverride;
exports.ancestors = ancestors;
exports.roots = roots;
exports.children = children;
exports.validateHierarchy = validateHierarchy;
const errors_js_1 = require("../errors.js");
/** Looks up a node by id. Throws `HierarchyError` when not found. */
function requireNode(hierarchy, id) {
    if (!hierarchy || !Array.isArray(hierarchy.nodes)) {
        throw new errors_js_1.HierarchyError('hierarchy.nodes must be an array');
    }
    const node = hierarchy.nodes.find((n) => n.id === id);
    if (!node)
        throw new errors_js_1.HierarchyError(`unknown node: ${id}`);
    return node;
}
/**
 * Returns the chain of node ids from `id` upward to the root (inclusive of
 * `id`). Throws `HierarchyError` on cycles or unknown parent links.
 */
function escalationPath(hierarchy, id) {
    const path = [];
    const seen = new Set();
    let cur = requireNode(hierarchy, id);
    for (;;) {
        if (seen.has(cur.id)) {
            throw new errors_js_1.HierarchyError(`cycle detected at node ${cur.id}`);
        }
        seen.add(cur.id);
        path.push(cur.id);
        if (!cur.parent)
            break;
        cur = requireNode(hierarchy, cur.parent);
    }
    return path;
}
/**
 * Returns the lowest common ancestor of two nodes — i.e. the deepest node
 * that lies on both upward paths. Returns `undefined` when the two nodes are
 * in different trees (no common ancestor).
 */
function findCommonAuthority(hierarchy, a, b) {
    const pathA = escalationPath(hierarchy, a).reverse(); // root-first
    const pathB = escalationPath(hierarchy, b).reverse();
    let common;
    const len = Math.min(pathA.length, pathB.length);
    for (let i = 0; i < len; i++) {
        if (pathA[i] === pathB[i]) {
            common = pathA[i];
        }
        else {
            break;
        }
    }
    return common;
}
/**
 * Returns true when `decider` can override `original` — i.e. when the
 * decider's authority level is strictly greater than the original decider's.
 */
function canOverride(hierarchy, decider, original) {
    const d = requireNode(hierarchy, decider);
    const o = requireNode(hierarchy, original);
    return d.authority > o.authority;
}
/**
 * Returns the ancestors of `id` (excluding `id` itself), in immediate-parent-
 * first order. This is the natural escalation order: the closest authority
 * comes first, then its parent, and so on up to the root.
 */
function ancestors(hierarchy, id) {
    const path = escalationPath(hierarchy, id);
    // path is leaf-first: [id, parent, grandparent, ..., root]. Drop the leaf.
    return path.slice(1);
}
/**
 * Returns all root nodes (nodes with no parent).
 */
function roots(hierarchy) {
    if (!hierarchy || !Array.isArray(hierarchy.nodes)) {
        throw new errors_js_1.HierarchyError('hierarchy.nodes must be an array');
    }
    return hierarchy.nodes.filter((n) => !n.parent);
}
/**
 * Returns all direct children of `id`.
 */
function children(hierarchy, id) {
    if (!hierarchy || !Array.isArray(hierarchy.nodes)) {
        throw new errors_js_1.HierarchyError('hierarchy.nodes must be an array');
    }
    return hierarchy.nodes.filter((n) => n.parent === id);
}
/**
 * Validates a hierarchy structurally. Throws `HierarchyError` on:
 *   - duplicate ids
 *   - unknown parent references
 *   - cycles
 */
function validateHierarchy(hierarchy) {
    if (!hierarchy || !Array.isArray(hierarchy.nodes)) {
        throw new errors_js_1.HierarchyError('hierarchy.nodes must be an array');
    }
    const ids = new Set();
    for (const n of hierarchy.nodes) {
        if (typeof n.id !== 'string' || n.id.length === 0) {
            throw new errors_js_1.HierarchyError('node.id must be a non-empty string');
        }
        if (ids.has(n.id)) {
            throw new errors_js_1.HierarchyError(`duplicate node id: ${n.id}`);
        }
        ids.add(n.id);
        if (typeof n.authority !== 'number' || Number.isNaN(n.authority)) {
            throw new errors_js_1.HierarchyError(`node ${n.id}: authority must be a number`);
        }
        if (n.parent !== undefined && !ids.has(n.parent) && !hierarchy.nodes.some((x) => x.id === n.parent)) {
            // Allow forward references — recheck after collection.
        }
    }
    // Recheck parent references now that all ids are known.
    for (const n of hierarchy.nodes) {
        if (n.parent !== undefined && !ids.has(n.parent)) {
            throw new errors_js_1.HierarchyError(`node ${n.id} references unknown parent ${n.parent}`);
        }
    }
    // Cycle check: walk escalationPath from every node.
    for (const n of hierarchy.nodes) {
        escalationPath(hierarchy, n.id);
    }
}
//# sourceMappingURL=hierarchy.js.map