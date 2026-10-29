/**
 * @manya-os/keyring — access-control policies.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { KeyringError } from '../errors.js';
import { Role } from '../identity/roles.js';

/**
 * A single access-control rule. A request matches a policy if `resource` and
 * `action` match (via {@link AccessPolicySet.match}), and the request is
 * allowed iff the caller holds at least one role in `allow` and is not in
 * `deny` (deny takes precedence).
 */
export interface AccessPolicy {
  /** Resource identifier, e.g. `credentials:*` or `wallet:export`. */
  resource: string;
  /** Action identifier, e.g. `read`, `write`, `sign`. */
  action: string;
  /** Roles permitted to perform this action. */
  allow: Role[];
  /** Roles explicitly denied (takes precedence over `allow`). */
  deny?: Role[];
  /** Optional human-readable description. */
  description?: string;
}

/**
 * Returns `true` if `pattern` matches `value`. Supports `*` as a trailing
 * wildcard only (e.g. `credentials:*` matches `credentials:read`).
 */
export function matchResource(pattern: string, value: string): boolean {
  if (pattern === value) return true;
  if (pattern.endsWith(':*')) {
    const prefix = pattern.slice(0, -1); // include the colon
    return value.startsWith(prefix);
  }
  if (pattern === '*') return true;
  return false;
}

/**
 * A collection of {@link AccessPolicy} entries with deterministic lookup.
 */
export class AccessPolicySet {
  private readonly policies = new Map<string, AccessPolicy>();

  /**
   * Add or replace a policy. Two policies are considered the same rule if
   * their `resource` + `action` match.
   */
  public add(policy: AccessPolicy): void {
    this.assertValid(policy);
    const key = this.key(policy.resource, policy.action);
    this.policies.set(key, { ...policy });
  }

  /** Remove a policy by resource + action. Returns true if removed. */
  public remove(resource: string, action: string): boolean {
    const key = this.key(resource, action);
    return this.policies.delete(key);
  }

  /** Return all policies (fresh array). */
  public list(): AccessPolicy[] {
    return Array.from(this.policies.values());
  }

  /** Exact-match lookup. */
  public get(resource: string, action: string): AccessPolicy | undefined {
    return this.policies.get(this.key(resource, action));
  }

  /**
   * Return the first policy whose `resource` matches `resource` (via
   * {@link matchResource}) and whose `action` equals `action`.
   *
   * More-specific (exact-match) policies are preferred over wildcard policies.
   */
  public match(resource: string, action: string): AccessPolicy | undefined {
    // 1. Exact match
    const exact = this.get(resource, action);
    if (exact) return exact;
    // 2. Wildcard match (longest prefix wins; we iterate and pick the longest
    //    matching pattern).
    let best: AccessPolicy | undefined;
    let bestScore = -1;
    for (const p of this.policies.values()) {
      if (p.action !== action) continue;
      if (!matchResource(p.resource, resource)) continue;
      // Score: prefer exact resource (score = length) over wildcards
      // (score = prefix length without the trailing '*').
      const score = p.resource === resource
        ? 1000 + p.resource.length
        : (p.resource.endsWith(':*')
            ? p.resource.length
            : 1);
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    return best;
  }

  /** Replace the entire set with the given policies. */
  public replaceAll(policies: AccessPolicy[]): void {
    this.policies.clear();
    for (const p of policies) this.add(p);
  }

  /** Number of policies. */
  public get size(): number {
    return this.policies.size;
  }

  // ----- internals -----

  private key(resource: string, action: string): string {
    return `${resource}::${action}`;
  }

  private assertValid(policy: AccessPolicy): void {
    if (!policy || typeof policy !== 'object') {
      throw new KeyringError('AccessPolicy must be an object', 'POLICY_ERROR');
    }
    if (typeof policy.resource !== 'string' || policy.resource.length === 0) {
      throw new KeyringError('AccessPolicy.resource must be a non-empty string', 'POLICY_ERROR');
    }
    if (typeof policy.action !== 'string' || policy.action.length === 0) {
      throw new KeyringError('AccessPolicy.action must be a non-empty string', 'POLICY_ERROR');
    }
    if (!Array.isArray(policy.allow) || policy.allow.length === 0) {
      throw new KeyringError('AccessPolicy.allow must be a non-empty Role[]', 'POLICY_ERROR');
    }
  }
}

/**
 * Build a default policy set appropriate for a fresh wallet. Composable and
 * overridable by callers.
 */
export function defaultPolicySet(): AccessPolicySet {
  const set = new AccessPolicySet();
  set.add({
    resource: 'wallet:identity',
    action: 'create',
    allow: [Role.Admin, Role.Agent],
    description: 'Create a new identity in the wallet.',
  });
  set.add({
    resource: 'wallet:identity',
    action: 'read',
    allow: [Role.Admin, Role.Agent, Role.Operator, Role.Auditor],
    description: 'List/read identities.',
  });
  set.add({
    resource: 'wallet:credential',
    action: 'issue',
    allow: [Role.Admin, Role.Agent],
    description: 'Issue a verifiable credential.',
  });
  set.add({
    resource: 'wallet:credential',
    action: 'verify',
    allow: [Role.Admin, Role.Agent, Role.Operator, Role.Auditor, Role.Guest],
    description: 'Verify a credential signature.',
  });
  set.add({
    resource: 'wallet:credential',
    action: 'read',
    allow: [Role.Admin, Role.Agent, Role.Operator, Role.Auditor],
    description: 'List credentials in the wallet.',
  });
  set.add({
    resource: 'wallet:credential',
    action: 'delete',
    allow: [Role.Admin],
    description: 'Delete a credential.',
  });
  set.add({
    resource: 'wallet:sign',
    action: 'perform',
    allow: [Role.Admin, Role.Agent, Role.Operator],
    description: 'Sign arbitrary data with a wallet identity.',
  });
  set.add({
    resource: 'wallet:export',
    action: 'perform',
    allow: [Role.Admin],
    description: 'Export an encrypted wallet blob.',
  });
  set.add({
    resource: 'wallet:sync',
    action: 'perform',
    allow: [Role.Admin, Role.Agent],
    description: 'Produce or apply a sync bundle.',
  });
  set.add({
    resource: 'wallet:recovery',
    action: 'perform',
    allow: [Role.Admin],
    description: 'Create or restore a backup; split/combine Shamir shares.',
  });
  set.add({
    resource: 'role:*',
    action: 'manage',
    allow: [Role.Admin],
    description: 'Manage role assignments.',
  });
  return set;
}
