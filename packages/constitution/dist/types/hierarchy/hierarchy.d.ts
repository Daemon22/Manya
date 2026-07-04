/**
 * @manya/constitution — decision hierarchies.
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
import type { DecisionHierarchy, DecisionNode } from '../types.js';
/** Looks up a node by id. Throws `HierarchyError` when not found. */
export declare function requireNode(hierarchy: DecisionHierarchy, id: string): DecisionNode;
/**
 * Returns the chain of node ids from `id` upward to the root (inclusive of
 * `id`). Throws `HierarchyError` on cycles or unknown parent links.
 */
export declare function escalationPath(hierarchy: DecisionHierarchy, id: string): string[];
/**
 * Returns the lowest common ancestor of two nodes — i.e. the deepest node
 * that lies on both upward paths. Returns `undefined` when the two nodes are
 * in different trees (no common ancestor).
 */
export declare function findCommonAuthority(hierarchy: DecisionHierarchy, a: string, b: string): string | undefined;
/**
 * Returns true when `decider` can override `original` — i.e. when the
 * decider's authority level is strictly greater than the original decider's.
 */
export declare function canOverride(hierarchy: DecisionHierarchy, decider: string, original: string): boolean;
/**
 * Returns the ancestors of `id` (excluding `id` itself), in immediate-parent-
 * first order. This is the natural escalation order: the closest authority
 * comes first, then its parent, and so on up to the root.
 */
export declare function ancestors(hierarchy: DecisionHierarchy, id: string): string[];
/**
 * Returns all root nodes (nodes with no parent).
 */
export declare function roots(hierarchy: DecisionHierarchy): DecisionNode[];
/**
 * Returns all direct children of `id`.
 */
export declare function children(hierarchy: DecisionHierarchy, id: string): DecisionNode[];
/**
 * Validates a hierarchy structurally. Throws `HierarchyError` on:
 *   - duplicate ids
 *   - unknown parent references
 *   - cycles
 */
export declare function validateHierarchy(hierarchy: DecisionHierarchy): void;
//# sourceMappingURL=hierarchy.d.ts.map