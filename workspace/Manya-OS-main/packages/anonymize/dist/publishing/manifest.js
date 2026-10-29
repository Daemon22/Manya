"use strict";
/**
 * @manya-os/anonymize — reproducible dataset publication.
 *
 * Produces a manifest containing per-record hashes, dataset hash, and
 * pipeline config hash, so the published dataset is verifiable and
 * reproducible.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashRecord = hashRecord;
exports.hashDataset = hashDataset;
exports.buildManifest = buildManifest;
exports.verifyManifest = verifyManifest;
exports.serializeManifest = serializeManifest;
const crypto_1 = require("crypto");
const errors_js_1 = require("../errors.js");
/** Hash a single record (post-anonymization). */
function hashRecord(record) {
    return (0, crypto_1.createHash)('sha256').update(record).digest('hex');
}
/** Hash a list of record hashes — produces the dataset hash. */
function hashDataset(recordHashes) {
    return (0, crypto_1.createHash)('sha256').update(recordHashes.join('\n')).digest('hex');
}
/** Build a manifest from anonymized records + a validation report + config hash. */
function buildManifest(name, records, configHash, validation) {
    if (!name || typeof name !== 'string')
        throw new errors_js_1.PublishingError('Dataset name is required');
    if (!Array.isArray(records))
        throw new errors_js_1.PublishingError('records must be an array');
    const recordHashes = records.map(hashRecord);
    const datasetHash = hashDataset(recordHashes);
    return {
        schemaVersion: 1,
        name,
        createdAt: new Date().toISOString(),
        recordCount: records.length,
        recordHashes,
        datasetHash,
        configHash,
        validation: { passed: validation.passed, residualRisk: validation.residualRisk },
    };
}
/** Verify a manifest against a list of records. */
function verifyManifest(manifest, records) {
    if (manifest.recordCount !== records.length)
        return false;
    for (let i = 0; i < records.length; i++) {
        if (hashRecord(records[i]) !== manifest.recordHashes[i])
            return false;
    }
    return hashDataset(manifest.recordHashes) === manifest.datasetHash;
}
/** Serialize a manifest as canonical JSON. */
function serializeManifest(manifest) {
    return JSON.stringify(manifest, null, 2);
}
//# sourceMappingURL=manifest.js.map