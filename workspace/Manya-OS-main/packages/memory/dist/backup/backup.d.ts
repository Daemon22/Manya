/**
 * @manya-os/memory — backup and restore.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { MemorySnapshot } from '../types.js';
export interface Backup {
    schemaVersion: 1;
    takenAt: string;
    snapshot: MemorySnapshot;
    hash: string;
}
/** Create a backup from a snapshot. */
export declare function createBackup(snapshot: MemorySnapshot): Backup;
/** Verify a backup's integrity. */
export declare function verifyBackup(backup: Backup): boolean;
/** Restore a snapshot from a verified backup. Throws if integrity check fails. */
export declare function restoreBackup(backup: Backup): MemorySnapshot;
/** Serialize a backup to canonical JSON. */
export declare function serializeBackup(backup: Backup): string;
/** Parse a backup from JSON. */
export declare function parseBackup(json: string): Backup;
//# sourceMappingURL=backup.d.ts.map