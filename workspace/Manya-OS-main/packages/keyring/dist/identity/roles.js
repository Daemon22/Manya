"use strict";
/**
 * @manya-os/keyring — Role-based access control.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleManager = exports.ALL_ROLES = exports.Role = void 0;
exports.parseRole = parseRole;
exports.newRoleAssignmentId = newRoleAssignmentId;
const crypto_1 = require("crypto");
const errors_js_1 = require("../errors.js");
/**
 * Roles in the MANYA OS. The order is roughly hierarchical — `Admin` is
 * highest, `Guest` is lowest — but actual permissions are governed by
 * {@link AccessPolicy} entries, not by the enum order.
 */
var Role;
(function (Role) {
    /** Full control: can manage identities, roles, policies, and credentials. */
    Role["Admin"] = "admin";
    /** An autonomous agent — can sign, issue, and verify credentials. */
    Role["Agent"] = "agent";
    /** An operator — can invoke operations on resources they are granted. */
    Role["Operator"] = "operator";
    /** Read-only auditor — can read audit logs and verify but not mutate. */
    Role["Auditor"] = "auditor";
    /** Unprivileged guest — explicit policy grant required for any action. */
    Role["Guest"] = "guest";
})(Role || (exports.Role = Role = {}));
/** All roles, in declaration order. */
exports.ALL_ROLES = [
    Role.Admin,
    Role.Agent,
    Role.Operator,
    Role.Auditor,
    Role.Guest,
];
/**
 * Parse a string into a {@link Role}. Throws on invalid input.
 */
function parseRole(value) {
    const r = exports.ALL_ROLES.find((role) => role === value);
    if (!r) {
        throw new errors_js_1.KeyringError(`parseRole: '${value}' is not a valid Role`, 'ROLE_PARSE_ERROR');
    }
    return r;
}
/** Storage key namespace for role assignments. */
const STORAGE_PREFIX = 'manya:keyring:roles';
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
class RoleManager {
    storage;
    inMemory = new Map();
    loaded = new Set();
    constructor(storage) {
        this.storage = storage;
    }
    /**
     * Assign a role to an identity. Idempotent.
     */
    async assignRole(identityId, role) {
        this.assertIdentityId(identityId);
        const set = await this.load(identityId);
        set.add(role);
        await this.persist(identityId, set);
    }
    /**
     * Revoke a role from an identity. Idempotent.
     */
    async revokeRole(identityId, role) {
        this.assertIdentityId(identityId);
        const set = await this.load(identityId);
        set.delete(role);
        await this.persist(identityId, set);
    }
    /**
     * Revoke all roles for an identity.
     */
    async revokeAll(identityId) {
        this.assertIdentityId(identityId);
        const set = new Set();
        this.inMemory.set(identityId, set);
        this.loaded.add(identityId);
        if (this.storage) {
            await this.storage.delete(`${STORAGE_PREFIX}:${identityId}`);
        }
    }
    /**
     * Return `true` iff the identity has the given role.
     */
    async hasRole(identityId, role) {
        this.assertIdentityId(identityId);
        const set = await this.load(identityId);
        return set.has(role);
    }
    /**
     * Return `true` iff the identity has *any* of the given roles.
     */
    async hasAnyRole(identityId, roles) {
        this.assertIdentityId(identityId);
        const set = await this.load(identityId);
        return roles.some((r) => set.has(r));
    }
    /**
     * Return all roles assigned to an identity (a fresh array each call).
     */
    async getRoles(identityId) {
        this.assertIdentityId(identityId);
        const set = await this.load(identityId);
        return Array.from(set);
    }
    /**
     * List all identity ids known to this manager (storage-backed only; for
     * in-memory mode, returns ids that have been touched).
     */
    async listIdentities() {
        if (this.storage) {
            const keys = await this.storage.list(`${STORAGE_PREFIX}:`);
            return keys.map((k) => k.slice(`${STORAGE_PREFIX}:`.length));
        }
        return Array.from(this.inMemory.keys());
    }
    // ----- internals -----
    assertIdentityId(id) {
        if (typeof id !== 'string' || id.length === 0) {
            throw new errors_js_1.KeyringError('identityId must be a non-empty string', 'ROLE_ERROR');
        }
    }
    async load(identityId) {
        if (this.inMemory.has(identityId) && this.loaded.has(identityId)) {
            return this.inMemory.get(identityId);
        }
        let set = new Set();
        if (this.storage) {
            const raw = await this.storage.get(`${STORAGE_PREFIX}:${identityId}`);
            if (raw && raw.length > 0) {
                try {
                    const parsed = JSON.parse(raw.toString('utf8'));
                    if (Array.isArray(parsed)) {
                        set = new Set(parsed.map((r) => {
                            if (typeof r !== 'string') {
                                throw new errors_js_1.KeyringError('role entry must be string', 'ROLE_PARSE_ERROR');
                            }
                            return parseRole(r);
                        }));
                    }
                }
                catch (err) {
                    if (err instanceof errors_js_1.KeyringError)
                        throw err;
                    throw new errors_js_1.KeyringError('RoleManager.load: corrupt role data', 'ROLE_PARSE_ERROR', err);
                }
            }
        }
        this.inMemory.set(identityId, set);
        this.loaded.add(identityId);
        return set;
    }
    async persist(identityId, set) {
        if (this.storage) {
            const json = JSON.stringify(Array.from(set));
            await this.storage.put(`${STORAGE_PREFIX}:${identityId}`, Buffer.from(json, 'utf8'));
        }
        // in-memory mode: set is already mutated in-place above.
    }
}
exports.RoleManager = RoleManager;
/**
 * Generate a unique role-assignment id (for audit/log use).
 */
function newRoleAssignmentId() {
    return 'role-' + (0, crypto_1.randomUUID)();
}
//# sourceMappingURL=roles.js.map