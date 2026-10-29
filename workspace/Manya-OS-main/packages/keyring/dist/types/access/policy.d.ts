/**
 * @manya-os/keyring — access-control policies.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
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
export declare function matchResource(pattern: string, value: string): boolean;
/**
 * A collection of {@link AccessPolicy} entries with deterministic lookup.
 */
export declare class AccessPolicySet {
    private readonly policies;
    /**
     * Add or replace a policy. Two policies are considered the same rule if
     * their `resource` + `action` match.
     */
    add(policy: AccessPolicy): void;
    /** Remove a policy by resource + action. Returns true if removed. */
    remove(resource: string, action: string): boolean;
    /** Return all policies (fresh array). */
    list(): AccessPolicy[];
    /** Exact-match lookup. */
    get(resource: string, action: string): AccessPolicy | undefined;
    /**
     * Return the first policy whose `resource` matches `resource` (via
     * {@link matchResource}) and whose `action` equals `action`.
     *
     * More-specific (exact-match) policies are preferred over wildcard policies.
     */
    match(resource: string, action: string): AccessPolicy | undefined;
    /** Replace the entire set with the given policies. */
    replaceAll(policies: AccessPolicy[]): void;
    /** Number of policies. */
    get size(): number;
    private key;
    private assertValid;
}
/**
 * Build a default policy set appropriate for a fresh wallet. Composable and
 * overridable by callers.
 */
export declare function defaultPolicySet(): AccessPolicySet;
//# sourceMappingURL=policy.d.ts.map