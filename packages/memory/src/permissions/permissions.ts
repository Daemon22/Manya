/**
 * @manya-os/memory — access permissions.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { MemoryPermission, MemoryId } from '../types.js';
import { PermissionError } from '../errors.js';

export class PermissionModel {
  private readonly perms = new Map<MemoryId, MemoryPermission>();

  /** Set or replace permissions for a record. */
  set(permission: MemoryPermission): void {
    if (!permission.recordId) throw new PermissionError('recordId is required');
    this.perms.set(permission.recordId, { ...permission });
  }

  /** Get permissions for a record. */
  get(recordId: MemoryId): MemoryPermission | undefined {
    return this.perms.get(recordId);
  }

  /** Check if a subject can read a record. */
  canRead(recordId: MemoryId, subject: string): boolean {
    const p = this.perms.get(recordId);
    if (!p) return true; // no permission set = open
    return p.readers.includes('*') || p.readers.includes(subject);
  }

  /** Check if a subject can write a record. */
  canWrite(recordId: MemoryId, subject: string): boolean {
    const p = this.perms.get(recordId);
    if (!p) return true;
    return p.writers.includes('*') || p.writers.includes(subject);
  }

  /** Check if a subject can delete a record. */
  canDelete(recordId: MemoryId, subject: string): boolean {
    const p = this.perms.get(recordId);
    if (!p) return true;
    return p.deleters.includes('*') || p.deleters.includes(subject);
  }

  /** Grant a permission to a subject. */
  grant(recordId: MemoryId, subject: string, mode: 'read' | 'write' | 'delete'): void {
    let p = this.perms.get(recordId);
    if (!p) {
      p = { recordId, readers: [], writers: [], deleters: [] };
      this.perms.set(recordId, p);
    }
    if (mode === 'read' && !p.readers.includes(subject)) p.readers.push(subject);
    if (mode === 'write' && !p.writers.includes(subject)) p.writers.push(subject);
    if (mode === 'delete' && !p.deleters.includes(subject)) p.deleters.push(subject);
  }

  /** Revoke a permission. */
  revoke(recordId: MemoryId, subject: string, mode: 'read' | 'write' | 'delete'): void {
    const p = this.perms.get(recordId);
    if (!p) return;
    if (mode === 'read') p.readers = p.readers.filter(s => s !== subject);
    if (mode === 'write') p.writers = p.writers.filter(s => s !== subject);
    if (mode === 'delete') p.deleters = p.deleters.filter(s => s !== subject);
    // Auto-cleanup: if all permission lists are empty, remove the record (back to default open).
    if (p.readers.length === 0 && p.writers.length === 0 && p.deleters.length === 0) {
      this.perms.delete(recordId);
    }
  }

  /** Remove all permissions for a record. */
  clear(recordId: MemoryId): boolean {
    return this.perms.delete(recordId);
  }

  /** All permission records. */
  all(): MemoryPermission[] {
    return Array.from(this.perms.values());
  }

  /** Assert read access; throws if denied. */
  assertRead(recordId: MemoryId, subject: string): void {
    if (!this.canRead(recordId, subject)) {
      throw new PermissionError(`subject '${subject}' cannot read record '${recordId}'`);
    }
  }

  /** Assert write access. */
  assertWrite(recordId: MemoryId, subject: string): void {
    if (!this.canWrite(recordId, subject)) {
      throw new PermissionError(`subject '${subject}' cannot write record '${recordId}'`);
    }
  }
}
