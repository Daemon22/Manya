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

import { createHash } from 'crypto';
import type { DatasetManifest, ValidationReport } from '../types.js';
import { PublishingError } from '../errors.js';

/** Hash a single record (post-anonymization). */
export function hashRecord(record: string): string {
  return createHash('sha256').update(record).digest('hex');
}

/** Hash a list of record hashes — produces the dataset hash. */
export function hashDataset(recordHashes: string[]): string {
  return createHash('sha256').update(recordHashes.join('\n')).digest('hex');
}

/** Build a manifest from anonymized records + a validation report + config hash. */
export function buildManifest(
  name: string,
  records: string[],
  configHash: string,
  validation: ValidationReport,
): DatasetManifest {
  if (!name || typeof name !== 'string') throw new PublishingError('Dataset name is required');
  if (!Array.isArray(records)) throw new PublishingError('records must be an array');
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
export function verifyManifest(manifest: DatasetManifest, records: string[]): boolean {
  if (manifest.recordCount !== records.length) return false;
  for (let i = 0; i < records.length; i++) {
    if (hashRecord(records[i]) !== manifest.recordHashes[i]) return false;
  }
  return hashDataset(manifest.recordHashes) === manifest.datasetHash;
}

/** Serialize a manifest as canonical JSON. */
export function serializeManifest(manifest: DatasetManifest): string {
  return JSON.stringify(manifest, null, 2);
}
