/**
 * @manya-os/keyring — access enforcer.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import { RoleManager } from '../identity/roles.js';
import type { AccessPolicySet, AccessPolicy } from './policy.js';
import type { EnforcementResult } from '../types.js';
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
export declare class AccessEnforcer {
    private readonly roles;
    private readonly policies;
    private readonly grants;
    constructor(roles: RoleManager, policies: AccessPolicySet, grants?: CapabilityGrantManager);
    /**
     * Render an enforcement decision. Does not throw on denial — use
     * {@link enforceOrThrow} if you want denial to throw.
     */
    enforce(identityId: string, resource: string, action: string): Promise<EnforcementResult>;
    /**
     * Like {@link enforce} but throws {@link AccessDeniedError} on denial.
     */
    enforceOrThrow(identityId: string, resource: string, action: string): Promise<EnforcementResult>;
    /** Inspect which policy would match without enforcing. */
    inspect(resource: string, action: string): AccessPolicy | undefined;
    /** Access the grant manager for issuing/revoking grants. */
    get grantManager(): CapabilityGrantManager;
    private intersect;
}
//# sourceMappingURL=enforcer.d.ts.map