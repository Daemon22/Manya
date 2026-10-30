/**
 * @manya-os/memory — access permissions.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { MemoryPermission, MemoryId } from '../types.js';
export declare class PermissionModel {
    private readonly perms;
    /** Set or replace permissions for a record. */
    set(permission: MemoryPermission): void;
    /** Get permissions for a record. */
    get(recordId: MemoryId): MemoryPermission | undefined;
    /** Check if a subject can read a record. */
    canRead(recordId: MemoryId, subject: string): boolean;
    /** Check if a subject can write a record. */
    canWrite(recordId: MemoryId, subject: string): boolean;
    /** Check if a subject can delete a record. */
    canDelete(recordId: MemoryId, subject: string): boolean;
    /** Grant a permission to a subject. */
    grant(recordId: MemoryId, subject: string, mode: 'read' | 'write' | 'delete'): void;
    /** Revoke a permission. */
    revoke(recordId: MemoryId, subject: string, mode: 'read' | 'write' | 'delete'): void;
    /** Remove all permissions for a record. */
    clear(recordId: MemoryId): boolean;
    /** All permission records. */
    all(): MemoryPermission[];
    /** Assert read access; throws if denied. */
    assertRead(recordId: MemoryId, subject: string): void;
    /** Assert write access. */
    assertWrite(recordId: MemoryId, subject: string): void;
}
//# sourceMappingURL=permissions.d.ts.map