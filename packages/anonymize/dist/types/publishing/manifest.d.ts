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
import type { DatasetManifest, ValidationReport } from '../types.js';
/** Hash a single record (post-anonymization). */
export declare function hashRecord(record: string): string;
/** Hash a list of record hashes — produces the dataset hash. */
export declare function hashDataset(recordHashes: string[]): string;
/** Build a manifest from anonymized records + a validation report + config hash. */
export declare function buildManifest(name: string, records: string[], configHash: string, validation: ValidationReport): DatasetManifest;
/** Verify a manifest against a list of records. */
export declare function verifyManifest(manifest: DatasetManifest, records: string[]): boolean;
/** Serialize a manifest as canonical JSON. */
export declare function serializeManifest(manifest: DatasetManifest): string;
//# sourceMappingURL=manifest.d.ts.map