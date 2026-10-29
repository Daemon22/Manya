/**
 * @manya-os/keyring — Role-based access control.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { randomUUID } from 'crypto';
import { KeyringError } from '../errors.js';
import type { EncryptedStorage } from '../wallet/storage.js';

/**
 * Roles in the MANYA OS. The order is roughly hierarchical — `Admin` is
 * highest, `Guest` is lowest — but actual permissions are governed by
 * {@link AccessPolicy} entries, not by the enum order.
 */
export enum Role {
  /** Full control: can manage identities, roles, policies, and credentials. */
  Admin = 'admin',
  /** An autonomous agent — can sign, issue, and verify credentials. */
  Agent = 'agent',
  /** An operator — can invoke operations on resources they are granted. */
  Operator = 'operator',
  /** Read-only auditor — can read audit logs and verify but not mutate. */
  Auditor = 'auditor',
  /** Unprivileged guest — explicit policy grant required for any action. */
  Guest = 'guest',
}

/** All roles, in declaration order. */
export const ALL_ROLES: readonly Role[] = [
  Role.Admin,
  Role.Agent,
  Role.Operator,
  Role.Auditor,
  Role.Guest,
];

/**
 * Parse a string into a {@link Role}. Throws on invalid input.
 */
export function parseRole(value: string): Role {
  const r = ALL_ROLES.find((role) => role === value);
  if (!r) {
    throw new KeyringError(
      `parseRole: '${value}' is not a valid Role`,
      'ROLE_PARSE_ERROR'
    );
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
export class RoleManager {
  private readonly inMemory = new Map<string, Set<Role>>();
  private readonly loaded = new Set<string>();

  constructor(private readonly storage?: EncryptedStorage) {}

  /**
   * Assign a role to an identity. Idempotent.
   */
  public async assignRole(identityId: string, role: Role): Promise<void> {
    this.assertIdentityId(identityId);
    const set = await this.load(identityId);
    set.add(role);
    await this.persist(identityId, set);
  }

  /**
   * Revoke a role from an identity. Idempotent.
   */
  public async revokeRole(identityId: string, role: Role): Promise<void> {
    this.assertIdentityId(identityId);
    const set = await this.load(identityId);
    set.delete(role);
    await this.persist(identityId, set);
  }

  /**
   * Revoke all roles for an identity.
   */
  public async revokeAll(identityId: string): Promise<void> {
    this.assertIdentityId(identityId);
    const set = new Set<Role>();
    this.inMemory.set(identityId, set);
    this.loaded.add(identityId);
    if (this.storage) {
      await this.storage.delete(`${STORAGE_PREFIX}:${identityId}`);
    }
  }

  /**
   * Return `true` iff the identity has the given role.
   */
  public async hasRole(identityId: string, role: Role): Promise<boolean> {
    this.assertIdentityId(identityId);
    const set = await this.load(identityId);
    return set.has(role);
  }

  /**
   * Return `true` iff the identity has *any* of the given roles.
   */
  public async hasAnyRole(identityId: string, roles: readonly Role[]): Promise<boolean> {
    this.assertIdentityId(identityId);
    const set = await this.load(identityId);
    return roles.some((r) => set.has(r));
  }

  /**
   * Return all roles assigned to an identity (a fresh array each call).
   */
  public async getRoles(identityId: string): Promise<Role[]> {
    this.assertIdentityId(identityId);
    const set = await this.load(identityId);
    return Array.from(set);
  }

  /**
   * List all identity ids known to this manager (storage-backed only; for
   * in-memory mode, returns ids that have been touched).
   */
  public async listIdentities(): Promise<string[]> {
    if (this.storage) {
      const keys = await this.storage.list(`${STORAGE_PREFIX}:`);
      return keys.map((k) => k.slice(`${STORAGE_PREFIX}:`.length));
    }
    return Array.from(this.inMemory.keys());
  }

  // ----- internals -----

  private assertIdentityId(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      throw new KeyringError('identityId must be a non-empty string', 'ROLE_ERROR');
    }
  }

  private async load(identityId: string): Promise<Set<Role>> {
    if (this.inMemory.has(identityId) && this.loaded.has(identityId)) {
      return this.inMemory.get(identityId)!;
    }
    let set = new Set<Role>();
    if (this.storage) {
      const raw = await this.storage.get(`${STORAGE_PREFIX}:${identityId}`);
      if (raw && raw.length > 0) {
        try {
          const parsed = JSON.parse(raw.toString('utf8'));
          if (Array.isArray(parsed)) {
            set = new Set(parsed.map((r: unknown) => {
              if (typeof r !== 'string') {
                throw new KeyringError('role entry must be string', 'ROLE_PARSE_ERROR');
              }
              return parseRole(r);
            }));
          }
        } catch (err) {
          if (err instanceof KeyringError) throw err;
          throw new KeyringError(
            'RoleManager.load: corrupt role data',
            'ROLE_PARSE_ERROR',
            err
          );
        }
      }
    }
    this.inMemory.set(identityId, set);
    this.loaded.add(identityId);
    return set;
  }

  private async persist(identityId: string, set: Set<Role>): Promise<void> {
    if (this.storage) {
      const json = JSON.stringify(Array.from(set));
      await this.storage.put(
        `${STORAGE_PREFIX}:${identityId}`,
        Buffer.from(json, 'utf8')
      );
    }
    // in-memory mode: set is already mutated in-place above.
  }
}

/**
 * Generate a unique role-assignment id (for audit/log use).
 */
export function newRoleAssignmentId(): string {
  return 'role-' + randomUUID();
}
