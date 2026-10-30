"use strict";
/**
 * @manya-os/keyring — access-control policies.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessPolicySet = void 0;
exports.matchResource = matchResource;
exports.defaultPolicySet = defaultPolicySet;
const errors_js_1 = require("../errors.js");
const roles_js_1 = require("../identity/roles.js");
/**
 * Returns `true` if `pattern` matches `value`. Supports `*` as a trailing
 * wildcard only (e.g. `credentials:*` matches `credentials:read`).
 */
function matchResource(pattern, value) {
    if (pattern === value)
        return true;
    if (pattern.endsWith(':*')) {
        const prefix = pattern.slice(0, -1); // include the colon
        return value.startsWith(prefix);
    }
    if (pattern === '*')
        return true;
    return false;
}
/**
 * A collection of {@link AccessPolicy} entries with deterministic lookup.
 */
class AccessPolicySet {
    policies = new Map();
    /**
     * Add or replace a policy. Two policies are considered the same rule if
     * their `resource` + `action` match.
     */
    add(policy) {
        this.assertValid(policy);
        const key = this.key(policy.resource, policy.action);
        this.policies.set(key, { ...policy });
    }
    /** Remove a policy by resource + action. Returns true if removed. */
    remove(resource, action) {
        const key = this.key(resource, action);
        return this.policies.delete(key);
    }
    /** Return all policies (fresh array). */
    list() {
        return Array.from(this.policies.values());
    }
    /** Exact-match lookup. */
    get(resource, action) {
        return this.policies.get(this.key(resource, action));
    }
    /**
     * Return the first policy whose `resource` matches `resource` (via
     * {@link matchResource}) and whose `action` equals `action`.
     *
     * More-specific (exact-match) policies are preferred over wildcard policies.
     */
    match(resource, action) {
        // 1. Exact match
        const exact = this.get(resource, action);
        if (exact)
            return exact;
        // 2. Wildcard match (longest prefix wins; we iterate and pick the longest
        //    matching pattern).
        let best;
        let bestScore = -1;
        for (const p of this.policies.values()) {
            if (p.action !== action)
                continue;
            if (!matchResource(p.resource, resource))
                continue;
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
    replaceAll(policies) {
        this.policies.clear();
        for (const p of policies)
            this.add(p);
    }
    /** Number of policies. */
    get size() {
        return this.policies.size;
    }
    // ----- internals -----
    key(resource, action) {
        return `${resource}::${action}`;
    }
    assertValid(policy) {
        if (!policy || typeof policy !== 'object') {
            throw new errors_js_1.KeyringError('AccessPolicy must be an object', 'POLICY_ERROR');
        }
        if (typeof policy.resource !== 'string' || policy.resource.length === 0) {
            throw new errors_js_1.KeyringError('AccessPolicy.resource must be a non-empty string', 'POLICY_ERROR');
        }
        if (typeof policy.action !== 'string' || policy.action.length === 0) {
            throw new errors_js_1.KeyringError('AccessPolicy.action must be a non-empty string', 'POLICY_ERROR');
        }
        if (!Array.isArray(policy.allow) || policy.allow.length === 0) {
            throw new errors_js_1.KeyringError('AccessPolicy.allow must be a non-empty Role[]', 'POLICY_ERROR');
        }
    }
}
exports.AccessPolicySet = AccessPolicySet;
/**
 * Build a default policy set appropriate for a fresh wallet. Composable and
 * overridable by callers.
 */
function defaultPolicySet() {
    const set = new AccessPolicySet();
    set.add({
        resource: 'wallet:identity',
        action: 'create',
        allow: [roles_js_1.Role.Admin, roles_js_1.Role.Agent],
        description: 'Create a new identity in the wallet.',
    });
    set.add({
        resource: 'wallet:identity',
        action: 'read',
        allow: [roles_js_1.Role.Admin, roles_js_1.Role.Agent, roles_js_1.Role.Operator, roles_js_1.Role.Auditor],
        description: 'List/read identities.',
    });
    set.add({
        resource: 'wallet:credential',
        action: 'issue',
        allow: [roles_js_1.Role.Admin, roles_js_1.Role.Agent],
        description: 'Issue a verifiable credential.',
    });
    set.add({
        resource: 'wallet:credential',
        action: 'verify',
        allow: [roles_js_1.Role.Admin, roles_js_1.Role.Agent, roles_js_1.Role.Operator, roles_js_1.Role.Auditor, roles_js_1.Role.Guest],
        description: 'Verify a credential signature.',
    });
    set.add({
        resource: 'wallet:credential',
        action: 'read',
        allow: [roles_js_1.Role.Admin, roles_js_1.Role.Agent, roles_js_1.Role.Operator, roles_js_1.Role.Auditor],
        description: 'List credentials in the wallet.',
    });
    set.add({
        resource: 'wallet:credential',
        action: 'delete',
        allow: [roles_js_1.Role.Admin],
        description: 'Delete a credential.',
    });
    set.add({
        resource: 'wallet:sign',
        action: 'perform',
        allow: [roles_js_1.Role.Admin, roles_js_1.Role.Agent, roles_js_1.Role.Operator],
        description: 'Sign arbitrary data with a wallet identity.',
    });
    set.add({
        resource: 'wallet:export',
        action: 'perform',
        allow: [roles_js_1.Role.Admin],
        description: 'Export an encrypted wallet blob.',
    });
    set.add({
        resource: 'wallet:sync',
        action: 'perform',
        allow: [roles_js_1.Role.Admin, roles_js_1.Role.Agent],
        description: 'Produce or apply a sync bundle.',
    });
    set.add({
        resource: 'wallet:recovery',
        action: 'perform',
        allow: [roles_js_1.Role.Admin],
        description: 'Create or restore a backup; split/combine Shamir shares.',
    });
    set.add({
        resource: 'role:*',
        action: 'manage',
        allow: [roles_js_1.Role.Admin],
        description: 'Manage role assignments.',
    });
    return set;
}
//# sourceMappingURL=policy.js.map