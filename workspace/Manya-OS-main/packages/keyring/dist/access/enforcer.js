"use strict";
/**
 * @manya-os/keyring — access enforcer.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessEnforcer = void 0;
const errors_js_1 = require("../errors.js");
const grants_js_1 = require("./grants.js");
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
class AccessEnforcer {
    roles;
    policies;
    grants;
    constructor(roles, policies, grants) {
        this.roles = roles;
        this.policies = policies;
        this.grants = grants ?? new grants_js_1.CapabilityGrantManager();
    }
    /**
     * Render an enforcement decision. Does not throw on denial — use
     * {@link enforceOrThrow} if you want denial to throw.
     */
    async enforce(identityId, resource, action) {
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
    async enforceOrThrow(identityId, resource, action) {
        const result = await this.enforce(identityId, resource, action);
        if (!result.allowed) {
            throw new errors_js_1.AccessDeniedError(result.reason);
        }
        return result;
    }
    /** Inspect which policy would match without enforcing. */
    inspect(resource, action) {
        return this.policies.match(resource, action);
    }
    /** Access the grant manager for issuing/revoking grants. */
    get grantManager() {
        return this.grants;
    }
    intersect(a, b) {
        const set = new Set(b);
        return a.filter((r) => set.has(r));
    }
}
exports.AccessEnforcer = AccessEnforcer;
//# sourceMappingURL=enforcer.js.map