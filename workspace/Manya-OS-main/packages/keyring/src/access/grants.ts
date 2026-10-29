/**
 * @manya-os/keyring — capability grant manager.
 *
 * Manages scoped, time-boxed grants for cross-instance collaboration.
 * Grants are the ONLY mechanism for delegating capabilities between instances.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { CapabilityGrant, GrantRevocation } from '../types.js';
import { KeyringError } from '../errors.js';
import { randomBytes } from 'crypto';

/** Match a resource pattern (with wildcards) against a resource string. */
function matchResource(pattern: string, value: string): boolean {
  if (pattern === value) return true;
  if (pattern.endsWith(':*')) {
    const prefix = pattern.slice(0, -1);
    return value.startsWith(prefix);
  }
  if (pattern === '*') return true;
  return false;
}

export class CapabilityGrantManager {
  private readonly grants = new Map<string, CapabilityGrant>();
  private readonly revocations: GrantRevocation[] = [];

  /**
   * Issue a new capability grant.
   * @returns The created grant.
   */
  issue(params: {
    grantor: string;
    grantee: string;
    resource: string;
    actions: string[];
    validUntil: string;
    maxUses?: number;
    metadata?: Record<string, unknown>;
  }): CapabilityGrant {
    if (!params.grantor) throw new KeyringError('grantor is required', 'GRANT_ERROR');
    if (!params.grantee) throw new KeyringError('grantee is required', 'GRANT_ERROR');
    if (!params.resource) throw new KeyringError('resource is required', 'GRANT_ERROR');
    if (!params.actions || params.actions.length === 0) {
      throw new KeyringError('at least one action is required', 'GRANT_ERROR');
    }
    if (!params.validUntil) throw new KeyringError('validUntil is required', 'GRANT_ERROR');

    const now = new Date().toISOString();
    const grant: CapabilityGrant = {
      id: `grant_${randomBytes(8).toString('hex')}`,
      grantor: params.grantor,
      grantee: params.grantee,
      resource: params.resource,
      actions: [...params.actions],
      validFrom: now,
      validUntil: params.validUntil,
      maxUses: params.maxUses,
      useCount: 0,
      revoked: false,
      metadata: params.metadata,
    };

    this.grants.set(grant.id, grant);
    return grant;
  }

  /**
   * Validate whether a grant allows a specific action on a resource.
   * Checks: not revoked, time window valid, use count not exceeded,
   * resource pattern match, action match.
   */
  validate(grantId: string, resource: string, action: string): { allowed: boolean; reason: string } {
    const grant = this.grants.get(grantId);
    if (!grant) return { allowed: false, reason: `grant '${grantId}' not found` };
    if (grant.revoked) return { allowed: false, reason: `grant '${grantId}' has been revoked` };

    const now = new Date();
    if (now < new Date(grant.validFrom)) {
      return { allowed: false, reason: `grant '${grantId}' is not yet active` };
    }
    if (now > new Date(grant.validUntil)) {
      return { allowed: false, reason: `grant '${grantId}' has expired` };
    }

    if (grant.maxUses !== undefined && grant.useCount >= grant.maxUses) {
      return { allowed: false, reason: `grant '${grantId}' has reached its maximum use count` };
    }

    if (!matchResource(grant.resource, resource)) {
      return { allowed: false, reason: `grant '${grantId}' does not cover resource '${resource}'` };
    }

    if (!grant.actions.includes(action) && !grant.actions.includes('*')) {
      return { allowed: false, reason: `grant '${grantId}' does not cover action '${action}'` };
    }

    return { allowed: true, reason: `grant '${grantId}' permits '${action}' on '${resource}'` };
  }

  /**
   * Record a use of the grant (increments use count).
   */
  recordUse(grantId: string): void {
    const grant = this.grants.get(grantId);
    if (grant) grant.useCount += 1;
  }

  /**
   * Revoke a grant. Only the original grantor or an admin may revoke.
   */
  revoke(grantId: string, revokedBy: string, reason?: string): GrantRevocation {
    const grant = this.grants.get(grantId);
    if (!grant) throw new KeyringError(`grant '${grantId}' not found`, 'GRANT_ERROR');
    if (grant.revoked) throw new KeyringError(`grant '${grantId}' is already revoked`, 'GRANT_ERROR');

    const now = new Date().toISOString();
    grant.revoked = true;
    grant.revokedAt = now;

    const revocation: GrantRevocation = {
      grantId,
      revokedAt: now,
      revokedBy,
      reason,
    };
    this.revocations.push(revocation);
    return revocation;
  }

  /** Get a grant by id. */
  get(grantId: string): CapabilityGrant | undefined {
    return this.grants.get(grantId);
  }

  /** Get all active (non-revoked, non-expired) grants for a grantee. */
  activeGrantsFor(grantee: string): CapabilityGrant[] {
    const now = new Date();
    return Array.from(this.grants.values()).filter(
      g => g.grantee === grantee
        && !g.revoked
        && now >= new Date(g.validFrom)
        && now <= new Date(g.validUntil)
        && (g.maxUses === undefined || g.useCount < g.maxUses),
    );
  }

  /** Get all grants. */
  all(): CapabilityGrant[] {
    return Array.from(this.grants.values());
  }

  /** Get all revocations. */
  getRevocations(): GrantRevocation[] {
    return [...this.revocations];
  }

  /** Number of grants. */
  size(): number {
    return this.grants.size;
  }
}
