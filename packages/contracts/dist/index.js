"use strict";
/**
 * @manya-os/contracts — universal contract and schema validation.
 *
 * Public API surface for @manya-os/contracts. Everything exported here is part
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeReport = exports.serializeReport = exports.aggregateReports = exports.buildReport = exports.isPolicySatisfied = exports.matchRule = exports.detectViolations = exports.enforceBoundary = exports.fieldsEqual = exports.mergeSchemas = exports.diffSchemas = exports.assertValidContract = exports.validateResponse = exports.validateRequest = exports.findEndpoint = exports.checkBackwardCompat = exports.satisfies = exports.compareParsedSemver = exports.compareSemver = exports.parseSemver = exports.isSemver = exports.isValidManifest = exports.assertManifest = exports.validateManifest = exports.SCHEMA_TYPES = exports.describeType = exports.validateValue = exports.compileSchema = exports.SCRUBBED_FIELD_NAMES = exports.shouldScrubField = exports.scrubMetadata = exports.SilentLogger = exports.ConsoleLogger = void 0;
// ----- types & errors -----
__exportStar(require("./types.js"), exports);
__exportStar(require("./errors.js"), exports);
// ----- logging -----
var logging_js_1 = require("./logging.js");
Object.defineProperty(exports, "ConsoleLogger", { enumerable: true, get: function () { return logging_js_1.ConsoleLogger; } });
Object.defineProperty(exports, "SilentLogger", { enumerable: true, get: function () { return logging_js_1.SilentLogger; } });
Object.defineProperty(exports, "scrubMetadata", { enumerable: true, get: function () { return logging_js_1.scrubMetadata; } });
Object.defineProperty(exports, "shouldScrubField", { enumerable: true, get: function () { return logging_js_1.shouldScrubField; } });
Object.defineProperty(exports, "SCRUBBED_FIELD_NAMES", { enumerable: true, get: function () { return logging_js_1.SCRUBBED_FIELD_NAMES; } });
// ----- schema -----
var schema_js_1 = require("./schema/schema.js");
Object.defineProperty(exports, "compileSchema", { enumerable: true, get: function () { return schema_js_1.compileSchema; } });
Object.defineProperty(exports, "validateValue", { enumerable: true, get: function () { return schema_js_1.validateValue; } });
Object.defineProperty(exports, "describeType", { enumerable: true, get: function () { return schema_js_1.describeType; } });
Object.defineProperty(exports, "SCHEMA_TYPES", { enumerable: true, get: function () { return schema_js_1.SCHEMA_TYPES; } });
// ----- manifest -----
var manifest_js_1 = require("./manifest/manifest.js");
Object.defineProperty(exports, "validateManifest", { enumerable: true, get: function () { return manifest_js_1.validateManifest; } });
Object.defineProperty(exports, "assertManifest", { enumerable: true, get: function () { return manifest_js_1.assertManifest; } });
Object.defineProperty(exports, "isValidManifest", { enumerable: true, get: function () { return manifest_js_1.isValidManifest; } });
// ----- compatibility -----
var compatibility_js_1 = require("./compatibility/compatibility.js");
Object.defineProperty(exports, "isSemver", { enumerable: true, get: function () { return compatibility_js_1.isSemver; } });
Object.defineProperty(exports, "parseSemver", { enumerable: true, get: function () { return compatibility_js_1.parseSemver; } });
Object.defineProperty(exports, "compareSemver", { enumerable: true, get: function () { return compatibility_js_1.compareSemver; } });
Object.defineProperty(exports, "compareParsedSemver", { enumerable: true, get: function () { return compatibility_js_1.compareParsedSemver; } });
Object.defineProperty(exports, "satisfies", { enumerable: true, get: function () { return compatibility_js_1.satisfies; } });
Object.defineProperty(exports, "checkBackwardCompat", { enumerable: true, get: function () { return compatibility_js_1.checkBackwardCompat; } });
// ----- api -----
var api_js_1 = require("./api/api.js");
Object.defineProperty(exports, "findEndpoint", { enumerable: true, get: function () { return api_js_1.findEndpoint; } });
Object.defineProperty(exports, "validateRequest", { enumerable: true, get: function () { return api_js_1.validateRequest; } });
Object.defineProperty(exports, "validateResponse", { enumerable: true, get: function () { return api_js_1.validateResponse; } });
Object.defineProperty(exports, "assertValidContract", { enumerable: true, get: function () { return api_js_1.assertValidContract; } });
// ----- sync -----
var sync_js_1 = require("./sync/sync.js");
Object.defineProperty(exports, "diffSchemas", { enumerable: true, get: function () { return sync_js_1.diffSchemas; } });
Object.defineProperty(exports, "mergeSchemas", { enumerable: true, get: function () { return sync_js_1.mergeSchemas; } });
Object.defineProperty(exports, "fieldsEqual", { enumerable: true, get: function () { return sync_js_1.fieldsEqual; } });
// ----- boundaries -----
var boundaries_js_1 = require("./boundaries/boundaries.js");
Object.defineProperty(exports, "enforceBoundary", { enumerable: true, get: function () { return boundaries_js_1.enforceBoundary; } });
Object.defineProperty(exports, "detectViolations", { enumerable: true, get: function () { return boundaries_js_1.detectViolations; } });
Object.defineProperty(exports, "matchRule", { enumerable: true, get: function () { return boundaries_js_1.matchRule; } });
Object.defineProperty(exports, "isPolicySatisfied", { enumerable: true, get: function () { return boundaries_js_1.isPolicySatisfied; } });
// ----- reporting -----
var reporting_js_1 = require("./reporting/reporting.js");
Object.defineProperty(exports, "buildReport", { enumerable: true, get: function () { return reporting_js_1.buildReport; } });
Object.defineProperty(exports, "aggregateReports", { enumerable: true, get: function () { return reporting_js_1.aggregateReports; } });
Object.defineProperty(exports, "serializeReport", { enumerable: true, get: function () { return reporting_js_1.serializeReport; } });
Object.defineProperty(exports, "summarizeReport", { enumerable: true, get: function () { return reporting_js_1.summarizeReport; } });
//# sourceMappingURL=index.js.map