/**
 * @manya/constitution — permission models (RBAC with inheritance).
 *
 * A `PermissionModel` is a set of `Role`s plus `RoleAssignment`s binding
 * subjects to roles. Roles may inherit from other roles transitively, so
 * `admin` inheriting `operator` inheriting `user` gives an `admin` subject
 * every permission granted to `operator` and `user` as well. Inheritance
 * cycles are detected and rejected.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { Permission, PermissionModel } from '../types.js';
/** Wildcard permission suffix. `module:*` matches every action in `module`. */
export declare const WILDCARD = "*";
/**
 * Returns the transitive set of role names reachable from `start` via
 * `inherits`. Throws `PermissionError` if a cycle is detected (including
 * self-inheritance).
 */
export declare function expandRoles(model: PermissionModel, start: string): Set<string>;
/**
 * Returns every permission granted to `role`, including permissions from
 * inherited roles.
 */
export declare function permissionsForRole(model: PermissionModel, role: string): Set<Permission>;
/**
 * Returns true when `granted` permits `requested`. Supports two wildcards:
 *   - `module:*` matches every `module:<anything>`
 *   - `*` matches every permission
 */
export declare function permissionMatches(granted: Permission, requested: Permission): boolean;
/**
 * Returns all roles assigned to a subject in the model.
 */
export declare function rolesForSubject(model: PermissionModel, subject: string): string[];
/**
 * Returns true when `subject` has been granted `permission` (directly or via
 * inheritance, with wildcard support).
 */
export declare function can(model: PermissionModel, subject: string, permission: Permission): boolean;
/**
 * Returns every subject that has been granted `permission` (directly or via
 * inheritance).
 */
export declare function whoCan(model: PermissionModel, permission: Permission): string[];
/**
 * Grants `role` to `subject`. Returns a new `PermissionModel` (immutable
 * update). Throws `PermissionError` if `role` does not exist.
 */
export declare function grantRole(model: PermissionModel, subject: string, role: string): PermissionModel;
/**
 * Revokes `role` from `subject`. Returns a new `PermissionModel` (immutable
 * update). No-op when the assignment does not exist.
 */
export declare function revokeRole(model: PermissionModel, subject: string, role: string): PermissionModel;
/**
 * Validates a `PermissionModel` structurally. Throws `PermissionError` on:
 *   - duplicate role names
 *   - unknown parent roles
 *   - inheritance cycles
 *   - assignments referencing unknown roles
 *   - invalid permission strings (must contain `:` or be `*`)
 */
export declare function validatePermissionModel(model: PermissionModel): void;
//# sourceMappingURL=permissions.d.ts.map