/**
 * @manya-os/keyring — access enforcer.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { Role, RoleManager } from '../identity/roles.js';
import type { AccessPolicySet, AccessPolicy } from './policy.js';
import type { EnforcementResult, CapabilityGrant } from '../types.js';
import { AccessDeniedError } from '../errors.js';
import { CapabilityGrantManager } from './grants.js';

/**
 * Access enforcer. Combines a {@link RoleManager}, an
 * {@link AccessPolicySet}, and optionally a {@link CapabilityGrantManager}
 * to render allow/deny decisions.
 *
 * Decision algorithm:
 * 1. Check active capability grants for the identity. If a grant covers
 *    this resource + action and is valid, allow immediately.
 * 2. Resolve the caller's roles via {@link RoleManager.getRoles}.
 * 3. Look up the most-specific matching policy. If none matches, deny.
 * 4. If any caller role is in `policy.deny`, deny.
 * 5. If any caller role is in `policy.allow`, allow.
 * 6. Otherwise deny.
 */
export class AccessEnforcer {
  private readonly grants: CapabilityGrantManager;

  constructor(
    private readonly roles: RoleManager,
    private readonly policies: AccessPolicySet,
    grants?: CapabilityGrantManager,
  ) {
    this.grants = grants ?? new CapabilityGrantManager();
  }

  /**
   * Render an enforcement decision. Does not throw on denial — use
   * {@link enforceOrThrow} if you want denial to throw.
   */
  public async enforce(
    identityId: string,
    resource: string,
    action: string
  ): Promise<EnforcementResult> {
    // 1. Check capability grants first.
    const activeGrants = this.grants.activeGrantsFor(identityId);
    for (const grant of activeGrants) {
      const { allowed } = this.grants.validate(grant.id, resource, action);
      if (allowed) {
        this.grants.recordUse(grant.id);
        return {
          allowed: true,
          reason: `permitted by capability grant '${grant.id}'`,
          resource,
          action,
          grantUsed: grant.id,
        };
      }
    }

    // 2. Fall back to role-based policy check.
    const roles = await this.roles.getRoles(identityId);
    const policy = this.policies.match(resource, action);
    if (!policy) {
      return {
        allowed: false,
        reason: `no policy matches resource='${resource}' action='${action}'`,
        resource,
        action,
      };
    }
    const denied = this.intersect(roles, policy.deny ?? []);
    if (denied.length > 0) {
      return {
        allowed: false,
        reason: `role(s) ${denied.join(', ')} denied by policy`,
        resource: policy.resource,
        action: policy.action,
      };
    }
    const allowed = this.intersect(roles, policy.allow);
    if (allowed.length === 0) {
      return {
        allowed: false,
        reason: `none of the caller's roles [${roles.join(', ')}] are permitted by policy`,
        resource: policy.resource,
        action: policy.action,
      };
    }
    return {
      allowed: true,
      reason: `permitted by role(s) ${allowed.join(', ')}`,
      resource: policy.resource,
      action: policy.action,
    };
  }

  /**
   * Like {@link enforce} but throws {@link AccessDeniedError} on denial.
   */
  public async enforceOrThrow(
    identityId: string,
    resource: string,
    action: string
  ): Promise<EnforcementResult> {
    const result = await this.enforce(identityId, resource, action);
    if (!result.allowed) {
      throw new AccessDeniedError(result.reason);
    }
    return result;
  }

  /** Inspect which policy would match without enforcing. */
  public inspect(resource: string, action: string): AccessPolicy | undefined {
    return this.policies.match(resource, action);
  }

  /** Access the grant manager for issuing/revoking grants. */
  public get grantManager(): CapabilityGrantManager {
    return this.grants;
  }

  private intersect(a: Role[], b: Role[]): Role[] {
    const set = new Set(b);
    return a.filter((r) => set.has(r));
  }
}
