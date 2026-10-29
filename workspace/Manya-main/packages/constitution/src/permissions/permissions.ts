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

import type {
  Permission, PermissionModel, Role, RoleAssignment,
} from '../types.js';
import { PermissionError } from '../errors.js';

/** Wildcard permission suffix. `module:*` matches every action in `module`. */
export const WILDCARD = '*';

/**
 * Returns the role with the given name, or throws `PermissionError` if not
 * found.
 */
function requireRole(model: PermissionModel, name: string): Role {
  const r = model.roles.find((x) => x.name === name);
  if (!r) throw new PermissionError(`unknown role: ${name}`);
  return r;
}

/**
 * Returns the transitive set of role names reachable from `start` via
 * `inherits`. Throws `PermissionError` if a cycle is detected (including
 * self-inheritance).
 */
export function expandRoles(model: PermissionModel, start: string): Set<string> {
  const visited = new Set<string>();
  const onStack = new Set<string>();

  const visit = (name: string): void => {
    if (visited.has(name)) return;
    if (onStack.has(name)) {
      throw new PermissionError(`inheritance cycle detected at role ${name}`);
    }
    onStack.add(name);
    const role = model.roles.find((r) => r.name === name);
    if (!role) throw new PermissionError(`unknown role: ${name}`);
    if (role.inherits) {
      for (const parent of role.inherits) {
        if (parent === name) {
          throw new PermissionError(`inheritance cycle detected at role ${name} (self-inheritance)`);
        }
        visit(parent);
      }
    }
    onStack.delete(name);
    visited.add(name);
  };

  visit(start);
  return visited;
}

/**
 * Returns every permission granted to `role`, including permissions from
 * inherited roles.
 */
export function permissionsForRole(model: PermissionModel, role: string): Set<Permission> {
  const roles = expandRoles(model, role);
  const out = new Set<Permission>();
  for (const name of roles) {
    const r = model.roles.find((x) => x.name === name);
    if (!r) continue;
    for (const p of r.permissions) out.add(p);
  }
  return out;
}

/**
 * Returns true when `granted` permits `requested`. Supports two wildcards:
 *   - `module:*` matches every `module:<anything>`
 *   - `*` matches every permission
 */
export function permissionMatches(granted: Permission, requested: Permission): boolean {
  if (granted === requested) return true;
  if (granted === WILDCARD) return true;
  const gParts = granted.split(':');
  const rParts = requested.split(':');
  if (gParts.length === 2 && rParts.length === 2) {
    if (gParts[1] === WILDCARD && gParts[0] === rParts[0]) return true;
  }
  return false;
}

/**
 * Returns all roles assigned to a subject in the model.
 */
export function rolesForSubject(model: PermissionModel, subject: string): string[] {
  return model.assignments
    .filter((a) => a.subject === subject)
    .map((a) => a.role);
}

/**
 * Returns true when `subject` has been granted `permission` (directly or via
 * inheritance, with wildcard support).
 */
export function can(model: PermissionModel, subject: string, permission: Permission): boolean {
  const roles = rolesForSubject(model, subject);
  for (const r of roles) {
    let perms: Set<Permission>;
    try {
      perms = permissionsForRole(model, r);
    } catch {
      continue;
    }
    for (const p of perms) {
      if (permissionMatches(p, permission)) return true;
    }
  }
  return false;
}

/**
 * Returns every subject that has been granted `permission` (directly or via
 * inheritance).
 */
export function whoCan(model: PermissionModel, permission: Permission): string[] {
  const out = new Set<string>();
  const subjects = new Set(model.assignments.map((a) => a.subject));
  for (const s of subjects) {
    if (can(model, s, permission)) out.add(s);
  }
  return Array.from(out).sort();
}

/**
 * Grants `role` to `subject`. Returns a new `PermissionModel` (immutable
 * update). Throws `PermissionError` if `role` does not exist.
 */
export function grantRole(
  model: PermissionModel,
  subject: string,
  role: string,
): PermissionModel {
  if (typeof subject !== 'string' || subject.length === 0) {
    throw new PermissionError('subject must be a non-empty string');
  }
  requireRole(model, role);
  // Avoid duplicate assignments.
  const exists = model.assignments.some((a) => a.subject === subject && a.role === role);
  if (exists) return model;
  const assignment: RoleAssignment = { subject, role };
  return { ...model, assignments: [...model.assignments, assignment] };
}

/**
 * Revokes `role` from `subject`. Returns a new `PermissionModel` (immutable
 * update). No-op when the assignment does not exist.
 */
export function revokeRole(
  model: PermissionModel,
  subject: string,
  role: string,
): PermissionModel {
  return {
    ...model,
    assignments: model.assignments.filter(
      (a) => !(a.subject === subject && a.role === role),
    ),
  };
}

/**
 * Validates a `PermissionModel` structurally. Throws `PermissionError` on:
 *   - duplicate role names
 *   - unknown parent roles
 *   - inheritance cycles
 *   - assignments referencing unknown roles
 *   - invalid permission strings (must contain `:` or be `*`)
 */
export function validatePermissionModel(model: PermissionModel): void {
  if (!model || !Array.isArray(model.roles) || !Array.isArray(model.assignments)) {
    throw new PermissionError('model must have roles[] and assignments[]');
  }
  // Duplicate role names
  const names = new Set<string>();
  for (const r of model.roles) {
    if (names.has(r.name)) {
      throw new PermissionError(`duplicate role name: ${r.name}`);
    }
    names.add(r.name);
    if (typeof r.name !== 'string' || r.name.length === 0) {
      throw new PermissionError('role.name must be a non-empty string');
    }
    if (!Array.isArray(r.permissions)) {
      throw new PermissionError(`role ${r.name}: permissions must be an array`);
    }
    for (const p of r.permissions) {
      if (typeof p !== 'string' || (p !== '*' && !p.includes(':'))) {
        throw new PermissionError(`role ${r.name}: invalid permission '${p}' (must be 'module:action' or '*')`);
      }
    }
  }
  // Unknown parent + cycle detection (per role, do a DFS).
  for (const r of model.roles) {
    if (r.inherits) {
      for (const parent of r.inherits) {
        if (!names.has(parent)) {
          throw new PermissionError(`role ${r.name} inherits unknown role ${parent}`);
        }
      }
    }
    // Cycle check
    expandRoles(model, r.name);
  }
  // Assignments
  for (const a of model.assignments) {
    if (typeof a.subject !== 'string' || a.subject.length === 0) {
      throw new PermissionError('assignment.subject must be a non-empty string');
    }
    if (!names.has(a.role)) {
      throw new PermissionError(`assignment references unknown role: ${a.role}`);
    }
  }
}
