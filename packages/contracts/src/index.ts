/**
 * @manya/contracts — universal contract and schema validation.
 *
 * Public API surface for @manya/contracts. Everything exported here is part
 * of the stable, semver-bound public API.
 *
 * Capabilities:
 *   - Schema definition language (`compileSchema`, `validateValue`).
 *   - Manifest validation (`validateManifest`).
 *   - Semver parsing/comparison/range checks and backward-compat analysis.
 *   - API request/response contract validation.
 *   - Schema diffing and merging with conflict detection.
 *   - Module boundary enforcement.
 *   - Validation report aggregation and serialization.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

// ----- types & errors -----
export * from './types.js';
export * from './errors.js';

// ----- logging -----
export {
  Logger, LogLevel, ConsoleLogger, SilentLogger,
  scrubMetadata, shouldScrubField, SCRUBBED_FIELD_NAMES,
} from './logging.js';

// ----- schema -----
export {
  compileSchema, validateValue, describeType, SCHEMA_TYPES,
} from './schema/schema.js';
export type { SchemaDefinition, SchemaFieldDefinition } from './schema/schema.js';

// ----- manifest -----
export {
  validateManifest, assertManifest, isValidManifest,
} from './manifest/manifest.js';

// ----- compatibility -----
export {
  isSemver, parseSemver, compareSemver, compareParsedSemver,
  satisfies, checkBackwardCompat,
} from './compatibility/compatibility.js';

// ----- api -----
export {
  findEndpoint, validateRequest, validateResponse, assertValidContract,
} from './api/api.js';

// ----- sync -----
export {
  diffSchemas, mergeSchemas, fieldsEqual,
} from './sync/sync.js';

// ----- boundaries -----
export {
  enforceBoundary, detectViolations, matchRule, isPolicySatisfied,
} from './boundaries/boundaries.js';
export type { BoundaryResult, CallEdge, BoundaryViolation } from './boundaries/boundaries.js';

// ----- reporting -----
export {
  buildReport, aggregateReports, serializeReport, summarizeReport,
} from './reporting/reporting.js';
