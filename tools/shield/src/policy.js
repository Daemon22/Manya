/**
 * Access control policy engine for the Manya Shield tool.
 * Supports both RBAC (Role-Based Access Control) and ABAC (Attribute-Based Access Control).
 */

import { createHash, randomBytes } from 'node:crypto';

/**
 * Creates a new access control policy.
 * @param {string} name - The policy name.
 * @param {object} [options] - Policy options.
 * @param {string} [options.description] - Policy description.
 * @param {string} [options.defaultAction='deny'] - Default action when no rule matches.
 * @returns {{ id: string, name: string, description: string, defaultAction: string, roles: Map, rules: Array, subjects: Map, createdAt: string, version: number }}
 */
export function createPolicy(name, options = {}) {
  if (!name || typeof name !== 'string') {
    throw new Error('Policy name is required');
  }
  return {
    id: randomBytes(8).toString('hex'),
    name,
    description: options.description || '',
    defaultAction: options.defaultAction || 'deny',
    roles: new Map(),
    rules: [],
    subjects: new Map(),
    createdAt: new Date().toISOString(),
    version: 1,
  };
}

/**
 * Defines a role with permissions.
 * @param {object} policy - The policy instance.
 * @param {string} name - Role name.
 * @param {object} [options] - Role options.
 * @param {string} [options.description] - Role description.
 * @param {number} [options.priority=0] - Priority (higher = evaluated first).
 * @param {string} [options.parent] - Parent role for inheritance.
 * @returns {{ name: string, description: string, priority: number, parent: string|null, permissions: Array, createdAt: string }}
 */
export function defineRole(policy, name, options = {}) {
  if (!policy || !(policy.roles instanceof Map)) {
    throw new Error('Invalid policy instance');
  }
  if (!name || typeof name !== 'string') {
    throw new Error('Role name is required');
  }
  if (policy.roles.has(name)) {
    throw new Error(`Role "${name}" already exists`);
  }
  const role = {
    name,
    description: options.description || '',
    priority: options.priority || 0,
    parent: options.parent || null,
    permissions: [],
    createdAt: new Date().toISOString(),
  };
  policy.roles.set(name, role);
  return role;
}

/**
 * Grants permissions to a role.
 * @param {object} policy - The policy instance.
 * @param {string} roleName - The role name.
 * @param {Array<{resource: string, actions: string[]}>} permissions - Permissions to grant.
 * @returns {{ role: string, grantedCount: number }}
 */
export function grant(policy, roleName, permissions) {
  if (!policy || !(policy.roles instanceof Map)) {
    throw new Error('Invalid policy instance');
  }
  const role = policy.roles.get(roleName);
  if (!role) {
    throw new Error(`Role "${roleName}" does not exist`);
  }
  if (!Array.isArray(permissions) || permissions.length === 0) {
    throw new Error('Permissions must be a non-empty array');
  }
  let grantedCount = 0;
  for (const perm of permissions) {
    if (!perm.resource || !Array.isArray(perm.actions)) {
      throw new Error('Each permission must have resource and actions');
    }
    role.permissions.push({
      resource: perm.resource,
      actions: perm.actions,
      grantedAt: new Date().toISOString(),
    });
    grantedCount += perm.actions.length;
  }
  return { role: roleName, grantedCount };
}

/**
 * Revokes permissions from a role.
 * @param {object} policy - The policy instance.
 * @param {string} roleName - The role name.
 * @param {string} [resource] - Optional resource filter. If omitted, revokes all.
 * @returns {{ role: string, revokedCount: number }}
 */
export function revoke(policy, roleName, resource) {
  if (!policy || !(policy.roles instanceof Map)) {
    throw new Error('Invalid policy instance');
  }
  const role = policy.roles.get(roleName);
  if (!role) {
    throw new Error(`Role "${roleName}" does not exist`);
  }
  let revokedCount = 0;
  if (resource) {
    const before = role.permissions.length;
    role.permissions = role.permissions.filter(p => p.resource !== resource);
    revokedCount = before - role.permissions.length;
  } else {
    revokedCount = role.permissions.reduce((sum, p) => sum + p.actions.length, 0);
    role.permissions = [];
  }
  return { role: roleName, revokedCount };
}

/**
 * Registers a subject (user/service) with assigned roles.
 * @param {object} policy - The policy instance.
 * @param {string} subjectId - The subject identifier.
 * @param {object} [options] - Subject options.
 * @param {string[]} [options.roles] - Initial roles to assign.
 * @param {object} [options.attributes] - ABAC attributes for the subject.
 * @returns {{ id: string, roles: string[], attributes: object, createdAt: string }}
 */
export function registerSubject(policy, subjectId, options = {}) {
  if (!policy || !(policy.subjects instanceof Map)) {
    throw new Error('Invalid policy instance');
  }
  if (!subjectId || typeof subjectId !== 'string') {
    throw new Error('Subject ID is required');
  }
  if (policy.subjects.has(subjectId)) {
    throw new Error(`Subject "${subjectId}" already exists`);
  }
  const subject = {
    id: subjectId,
    roles: options.roles || [],
    attributes: options.attributes || {},
    createdAt: new Date().toISOString(),
  };
  policy.subjects.set(subjectId, subject);
  return subject;
}

/**
 * Assigns a role to a subject.
 * @param {object} policy - The policy instance.
 * @param {string} subjectId - The subject identifier.
 * @param {string} roleName - The role to assign.
 * @returns {{ subject: string, role: string }}
 */
export function assignRole(policy, subjectId, roleName) {
  if (!policy || !(policy.subjects instanceof Map) || !(policy.roles instanceof Map)) {
    throw new Error('Invalid policy instance');
  }
  const subject = policy.subjects.get(subjectId);
  if (!subject) {
    throw new Error(`Subject "${subjectId}" does not exist`);
  }
  if (!policy.roles.has(roleName)) {
    throw new Error(`Role "${roleName}" does not exist`);
  }
  if (!subject.roles.includes(roleName)) {
    subject.roles.push(roleName);
  }
  return { subject: subjectId, role: roleName };
}

/**
 * Removes a role from a subject.
 * @param {object} policy - The policy instance.
 * @param {string} subjectId - The subject identifier.
 * @param {string} roleName - The role to remove.
 * @returns {{ subject: string, role: string, removed: boolean }}
 */
export function removeRole(policy, subjectId, roleName) {
  if (!policy || !(policy.subjects instanceof Map)) {
    throw new Error('Invalid policy instance');
  }
  const subject = policy.subjects.get(subjectId);
  if (!subject) {
    throw new Error(`Subject "${subjectId}" does not exist`);
  }
  const idx = subject.roles.indexOf(roleName);
  const removed = idx !== -1;
  if (removed) subject.roles.splice(idx, 1);
  return { subject: subjectId, role: roleName, removed };
}

/**
 * Checks if a subject has access to a resource with a specific action.
 * @param {object} policy - The policy instance.
 * @param {string} subjectId - The subject identifier.
 * @param {string} resource - The resource being accessed.
 * @param {string} action - The action being performed.
 * @param {object} [context] - ABAC context attributes.
 * @returns {{ allowed: boolean, reason: string, matchedRules: Array, subject: string, resource: string, action: string }}
 */
export function checkAccess(policy, subjectId, resource, action, context = {}) {
  if (!policy || !(policy.subjects instanceof Map) || !(policy.roles instanceof Map)) {
    throw new Error('Invalid policy instance');
  }
  const subject = policy.subjects.get(subjectId);
  if (!subject) {
    return { allowed: false, reason: 'Subject not found', matchedRules: [], subject: subjectId, resource, action };
  }

  const matchedRules = [];

  // Collect all permissions from assigned roles (and inherited roles)
  for (const roleName of subject.roles) {
    const role = policy.roles.get(roleName);
    if (!role) continue;

    // Check direct permissions
    for (const perm of role.permissions) {
      const resourceMatch = matchesPattern(perm.resource, resource);
      if (resourceMatch && perm.actions.includes(action)) {
        matchedRules.push({
          role: roleName,
          resource: perm.resource,
          action,
          type: 'rbac',
        });
      }
    }

    // Check inherited role permissions (full chain)
    let currentParent = role.parent;
    const visited = new Set([roleName]);
    while (currentParent && policy.roles.has(currentParent) && !visited.has(currentParent)) {
      visited.add(currentParent);
      const parentRole = policy.roles.get(currentParent);
      for (const perm of parentRole.permissions) {
        const resourceMatch = matchesPattern(perm.resource, resource);
        if (resourceMatch && perm.actions.includes(action)) {
          matchedRules.push({
            role: roleName,
            inheritedFrom: currentParent,
            resource: perm.resource,
            action,
            type: 'rbac-inherited',
          });
        }
      }
      currentParent = parentRole.parent;
    }
  }

  // Check ABAC rules
  for (const rule of policy.rules) {
    if (evaluateABACRule(rule, subject, resource, action, context)) {
      matchedRules.push({
        rule: rule.name,
        effect: rule.effect,
        type: 'abac',
      });
    }
  }

  const allowed = matchedRules.length > 0 || policy.defaultAction === 'allow';
  const reason = allowed
    ? (matchedRules.length > 0 ? `Access granted by ${matchedRules.length} rule(s)` : 'Allowed by default policy')
    : 'No matching rule found and default is deny';

  return { allowed, reason, matchedRules, subject: subjectId, resource, action };
}

/**
 * Adds an ABAC rule to the policy.
 * @param {object} policy - The policy instance.
 * @param {object} rule - The ABAC rule.
 * @param {string} rule.name - Rule name.
 * @param {string} rule.effect - 'allow' or 'deny'.
 * @param {Function} rule.condition - Function(subject, resource, action, context) => boolean.
 * @param {string} [rule.description] - Rule description.
 * @returns {{ name: string, effect: string, description: string }}
 */
export function addRule(policy, rule) {
  if (!policy || !Array.isArray(policy.rules)) {
    throw new Error('Invalid policy instance');
  }
  if (!rule || !rule.name || !rule.effect || typeof rule.condition !== 'function') {
    throw new Error('Rule must have name, effect, and condition function');
  }
  if (!['allow', 'deny'].includes(rule.effect)) {
    throw new Error('Rule effect must be "allow" or "deny"');
  }
  policy.rules.push({
    name: rule.name,
    effect: rule.effect,
    condition: rule.condition,
    description: rule.description || '',
    addedAt: new Date().toISOString(),
  });
  return { name: rule.name, effect: rule.effect, description: rule.description || '' };
}

/**
 * Gets all effective permissions for a subject.
 * @param {object} policy - The policy instance.
 * @param {string} subjectId - The subject identifier.
 * @returns {{ subject: string, roles: Array, permissions: Array }}
 */
export function getEffectivePermissions(policy, subjectId) {
  if (!policy || !(policy.subjects instanceof Map)) {
    throw new Error('Invalid policy instance');
  }
  const subject = policy.subjects.get(subjectId);
  if (!subject) {
    throw new Error(`Subject "${subjectId}" does not exist`);
  }
  const permissions = [];
  for (const roleName of subject.roles) {
    const role = policy.roles.get(roleName);
    if (!role) continue;
    for (const perm of role.permissions) {
      permissions.push({ role: roleName, resource: perm.resource, actions: perm.actions });
    }
    // Walk the full inheritance chain
    let currentParent = role.parent;
    const visited = new Set([roleName]);
    while (currentParent && policy.roles.has(currentParent) && !visited.has(currentParent)) {
      visited.add(currentParent);
      const parentRole = policy.roles.get(currentParent);
      for (const perm of parentRole.permissions) {
        permissions.push({ role: roleName, inheritedFrom: currentParent, resource: perm.resource, actions: perm.actions });
      }
      currentParent = parentRole.parent;
    }
  }
  return { subject: subjectId, roles: subject.roles, permissions };
}

// --- Internal helpers ---

/**
 * Matches a resource pattern against a concrete resource.
 * Supports wildcard patterns like "documents:*" or "files:**".
 */
function matchesPattern(pattern, resource) {
  if (pattern === resource) return true;
  if (pattern === '*') return true;
  if (pattern.endsWith(':*')) {
    const prefix = pattern.slice(0, -2);
    return resource.startsWith(prefix);
  }
  if (pattern.endsWith('**')) {
    const prefix = pattern.slice(0, -2);
    return resource.startsWith(prefix);
  }
  return false;
}

/**
 * Evaluates an ABAC rule against the current context.
 */
function evaluateABACRule(rule, subject, resource, action, context) {
  try {
    return rule.condition(subject, resource, action, context);
  } catch {
    return false;
  }
}
