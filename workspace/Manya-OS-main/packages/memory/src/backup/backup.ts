/**
 * @manya-os/memory — backup and restore.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { createHash } from 'crypto';
import { BackupError } from '../errors.js';
import type { MemorySnapshot } from '../types.js';

export interface Backup {
  schemaVersion: 1;
  takenAt: string;
  snapshot: MemorySnapshot;
  hash: string;
}

/** Create a backup from a snapshot. */
export function createBackup(snapshot: MemorySnapshot): Backup {
  if (!snapshot) throw new BackupError('snapshot is required');
  const canon = JSON.stringify(snapshot);
  const hash = createHash('sha256').update(canon).digest('hex');
  return {
    schemaVersion: 1,
    takenAt: new Date().toISOString(),
    snapshot,
    hash,
  };
}

/** Verify a backup's integrity. */
export function verifyBackup(backup: Backup): boolean {
  if (!backup || !backup.snapshot) return false;
  const canon = JSON.stringify(backup.snapshot);
  const hash = createHash('sha256').update(canon).digest('hex');
  return hash === backup.hash;
}

/** Restore a snapshot from a verified backup. Throws if integrity check fails. */
export function restoreBackup(backup: Backup): MemorySnapshot {
  if (!verifyBackup(backup)) throw new BackupError('backup integrity check failed');
  // Deep clone to avoid external mutation.
  return JSON.parse(JSON.stringify(backup.snapshot)) as MemorySnapshot;
}

/** Serialize a backup to canonical JSON. */
export function serializeBackup(backup: Backup): string {
  return JSON.stringify(backup, null, 2);
}

/** Parse a backup from JSON. */
export function parseBackup(json: string): Backup {
  try {
    const b = JSON.parse(json);
    if (!b.snapshot || !b.hash) throw new BackupError('invalid backup structure');
    return b as Backup;
  } catch (err) {
    throw new BackupError('failed to parse backup', err);
  }
}
