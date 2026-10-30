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
export declare class CapabilityGrantManager {
    private readonly grants;
    private readonly revocations;
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
    }): CapabilityGrant;
    /**
     * Validate whether a grant allows a specific action on a resource.
     * Checks: not revoked, time window valid, use count not exceeded,
     * resource pattern match, action match.
     */
    validate(grantId: string, resource: string, action: string): {
        allowed: boolean;
        reason: string;
    };
    /**
     * Record a use of the grant (increments use count).
     */
    recordUse(grantId: string): void;
    /**
     * Revoke a grant. Only the original grantor or an admin may revoke.
     */
    revoke(grantId: string, revokedBy: string, reason?: string): GrantRevocation;
    /** Get a grant by id. */
    get(grantId: string): CapabilityGrant | undefined;
    /** Get all active (non-revoked, non-expired) grants for a grantee. */
    activeGrantsFor(grantee: string): CapabilityGrant[];
    /** Get all grants. */
    all(): CapabilityGrant[];
    /** Get all revocations. */
    getRevocations(): GrantRevocation[];
    /** Number of grants. */
    size(): number;
}
//# sourceMappingURL=grants.d.ts.map