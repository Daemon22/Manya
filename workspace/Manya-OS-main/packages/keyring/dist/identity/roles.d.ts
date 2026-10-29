/**
 * @manya-os/keyring — Role-based access control.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { EncryptedStorage } from '../wallet/storage.js';
/**
 * Roles in the MANYA OS. The order is roughly hierarchical — `Admin` is
 * highest, `Guest` is lowest — but actual permissions are governed by
 * {@link AccessPolicy} entries, not by the enum order.
 */
export declare enum Role {
    /** Full control: can manage identities, roles, policies, and credentials. */
    Admin = "admin",
    /** An autonomous agent — can sign, issue, and verify credentials. */
    Agent = "agent",
    /** An operator — can invoke operations on resources they are granted. */
    Operator = "operator",
    /** Read-only auditor — can read audit logs and verify but not mutate. */
    Auditor = "auditor",
    /** Unprivileged guest — explicit policy grant required for any action. */
    Guest = "guest"
}
/** All roles, in declaration order. */
export declare const ALL_ROLES: readonly Role[];
/**
 * Parse a string into a {@link Role}. Throws on invalid input.
 */
export declare function parseRole(value: string): Role;
/**
 * Persistent role manager. Stores role assignments in an
 * {@link EncryptedStorage} if one is supplied; otherwise keeps an in-memory
 * map.
 *
 * The storage key format is:
 * ```
 * manya:keyring:roles:<identityId>
 * ```
 * and the value is a JSON-encoded `Role[]`.
 */
export declare class RoleManager {
    private readonly storage?;
    private readonly inMemory;
    private readonly loaded;
    constructor(storage?: EncryptedStorage | undefined);
    /**
     * Assign a role to an identity. Idempotent.
     */
    assignRole(identityId: string, role: Role): Promise<void>;
    /**
     * Revoke a role from an identity. Idempotent.
     */
    revokeRole(identityId: string, role: Role): Promise<void>;
    /**
     * Revoke all roles for an identity.
     */
    revokeAll(identityId: string): Promise<void>;
    /**
     * Return `true` iff the identity has the given role.
     */
    hasRole(identityId: string, role: Role): Promise<boolean>;
    /**
     * Return `true` iff the identity has *any* of the given roles.
     */
    hasAnyRole(identityId: string, roles: readonly Role[]): Promise<boolean>;
    /**
     * Return all roles assigned to an identity (a fresh array each call).
     */
    getRoles(identityId: string): Promise<Role[]>;
    /**
     * List all identity ids known to this manager (storage-backed only; for
     * in-memory mode, returns ids that have been touched).
     */
    listIdentities(): Promise<string[]>;
    private assertIdentityId;
    private load;
    private persist;
}
/**
 * Generate a unique role-assignment id (for audit/log use).
 */
export declare function newRoleAssignmentId(): string;
//# sourceMappingURL=roles.d.ts.map