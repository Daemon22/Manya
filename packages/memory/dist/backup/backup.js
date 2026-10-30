"use strict";
/**
 * @manya-os/memory — backup and restore.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBackup = createBackup;
exports.verifyBackup = verifyBackup;
exports.restoreBackup = restoreBackup;
exports.serializeBackup = serializeBackup;
exports.parseBackup = parseBackup;
const crypto_1 = require("crypto");
const errors_js_1 = require("../errors.js");
/** Create a backup from a snapshot. */
function createBackup(snapshot) {
    if (!snapshot)
        throw new errors_js_1.BackupError('snapshot is required');
    const canon = JSON.stringify(snapshot);
    const hash = (0, crypto_1.createHash)('sha256').update(canon).digest('hex');
    return {
        schemaVersion: 1,
        takenAt: new Date().toISOString(),
        snapshot,
        hash,
    };
}
/** Verify a backup's integrity. */
function verifyBackup(backup) {
    if (!backup || !backup.snapshot)
        return false;
    const canon = JSON.stringify(backup.snapshot);
    const hash = (0, crypto_1.createHash)('sha256').update(canon).digest('hex');
    return hash === backup.hash;
}
/** Restore a snapshot from a verified backup. Throws if integrity check fails. */
function restoreBackup(backup) {
    if (!verifyBackup(backup))
        throw new errors_js_1.BackupError('backup integrity check failed');
    // Deep clone to avoid external mutation.
    return JSON.parse(JSON.stringify(backup.snapshot));
}
/** Serialize a backup to canonical JSON. */
function serializeBackup(backup) {
    return JSON.stringify(backup, null, 2);
}
/** Parse a backup from JSON. */
function parseBackup(json) {
    try {
        const b = JSON.parse(json);
        if (!b.snapshot || !b.hash)
            throw new errors_js_1.BackupError('invalid backup structure');
        return b;
    }
    catch (err) {
        throw new errors_js_1.BackupError('failed to parse backup', err);
    }
}
//# sourceMappingURL=backup.js.map