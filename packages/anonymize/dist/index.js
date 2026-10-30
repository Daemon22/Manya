"use strict";
/**
 * @manya-os/anonymize — research-grade anonymization.
 *
 * Public API surface for @manya-os/anonymize. Everything exported here is part
 * of the stable, semver-bound public API.
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
exports.findOcrPiiCandidates = exports.stripOcrGeometry = exports.ocrPageToText = exports.normalizeOcrText = exports.assertClean = exports.diffMetadata = exports.scrubObjectMetadata = exports.isSensitiveKey = exports.SENSITIVE_METADATA_KEYS = exports.applyRedactions = exports.SynthesizeRedactor = exports.GeneralizeRedactor = exports.FullRedactor = exports.TokenRedactor = exports.HashRedactor = exports.MaskRedactor = exports.providerDetector = exports.medicationDetector = exports.healthConditionDetector = exports.addressDetector = exports.personNameDetector = exports.ALL_CONTEXT_DETECTORS = exports.zaIdChecksumValid = exports.luhnValid = exports.zaIdDetector = exports.usSsnDetector = exports.postalCodeDetector = exports.isoDateDetector = exports.apiKeyDetector = exports.jwtDetector = exports.ibanDetector = exports.creditCardDetector = exports.urlDetector = exports.macDetector = exports.ipv6Detector = exports.ipv4Detector = exports.phoneDetector = exports.emailDetector = exports.ALL_PATTERN_DETECTORS = exports.severityFor = exports.makeFinding = exports.resolveOverlaps = exports.DetectorRegistry = exports.mergeConfig = exports.DEFAULT_CONFIG = exports.SCRUBBED_FIELD_NAMES = exports.shouldScrubField = exports.scrubMetadata = exports.SilentLogger = exports.ConsoleLogger = void 0;
exports.redactorForStrategy = exports.defaultRegistry = exports.anonymize = exports.Anonymizer = exports.serializeManifest = exports.verifyManifest = exports.buildManifest = exports.hashDataset = exports.hashRecord = exports.hashConfig = exports.Validator = exports.assertDocumentClean = exports.scrubDocumentMetadata = exports.normalizeMetadata = exports.parseDocxCoreXml = exports.parsePdfInfo = exports.imageIdentifier = exports.dhash = exports.redactImage = exports.stripJpegExif = void 0;
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
// ----- config -----
var config_js_1 = require("./config/config.js");
Object.defineProperty(exports, "DEFAULT_CONFIG", { enumerable: true, get: function () { return config_js_1.DEFAULT_CONFIG; } });
Object.defineProperty(exports, "mergeConfig", { enumerable: true, get: function () { return config_js_1.mergeConfig; } });
// ----- detectors -----
var registry_js_1 = require("./detectors/registry.js");
Object.defineProperty(exports, "DetectorRegistry", { enumerable: true, get: function () { return registry_js_1.DetectorRegistry; } });
Object.defineProperty(exports, "resolveOverlaps", { enumerable: true, get: function () { return registry_js_1.resolveOverlaps; } });
Object.defineProperty(exports, "makeFinding", { enumerable: true, get: function () { return registry_js_1.makeFinding; } });
Object.defineProperty(exports, "severityFor", { enumerable: true, get: function () { return registry_js_1.severityFor; } });
var patterns_js_1 = require("./detectors/patterns.js");
Object.defineProperty(exports, "ALL_PATTERN_DETECTORS", { enumerable: true, get: function () { return patterns_js_1.ALL_PATTERN_DETECTORS; } });
Object.defineProperty(exports, "emailDetector", { enumerable: true, get: function () { return patterns_js_1.emailDetector; } });
Object.defineProperty(exports, "phoneDetector", { enumerable: true, get: function () { return patterns_js_1.phoneDetector; } });
Object.defineProperty(exports, "ipv4Detector", { enumerable: true, get: function () { return patterns_js_1.ipv4Detector; } });
Object.defineProperty(exports, "ipv6Detector", { enumerable: true, get: function () { return patterns_js_1.ipv6Detector; } });
Object.defineProperty(exports, "macDetector", { enumerable: true, get: function () { return patterns_js_1.macDetector; } });
Object.defineProperty(exports, "urlDetector", { enumerable: true, get: function () { return patterns_js_1.urlDetector; } });
Object.defineProperty(exports, "creditCardDetector", { enumerable: true, get: function () { return patterns_js_1.creditCardDetector; } });
Object.defineProperty(exports, "ibanDetector", { enumerable: true, get: function () { return patterns_js_1.ibanDetector; } });
Object.defineProperty(exports, "jwtDetector", { enumerable: true, get: function () { return patterns_js_1.jwtDetector; } });
Object.defineProperty(exports, "apiKeyDetector", { enumerable: true, get: function () { return patterns_js_1.apiKeyDetector; } });
Object.defineProperty(exports, "isoDateDetector", { enumerable: true, get: function () { return patterns_js_1.isoDateDetector; } });
Object.defineProperty(exports, "postalCodeDetector", { enumerable: true, get: function () { return patterns_js_1.postalCodeDetector; } });
Object.defineProperty(exports, "usSsnDetector", { enumerable: true, get: function () { return patterns_js_1.usSsnDetector; } });
Object.defineProperty(exports, "zaIdDetector", { enumerable: true, get: function () { return patterns_js_1.zaIdDetector; } });
Object.defineProperty(exports, "luhnValid", { enumerable: true, get: function () { return patterns_js_1.luhnValid; } });
Object.defineProperty(exports, "zaIdChecksumValid", { enumerable: true, get: function () { return patterns_js_1.zaIdChecksumValid; } });
var context_js_1 = require("./detectors/context.js");
Object.defineProperty(exports, "ALL_CONTEXT_DETECTORS", { enumerable: true, get: function () { return context_js_1.ALL_CONTEXT_DETECTORS; } });
Object.defineProperty(exports, "personNameDetector", { enumerable: true, get: function () { return context_js_1.personNameDetector; } });
Object.defineProperty(exports, "addressDetector", { enumerable: true, get: function () { return context_js_1.addressDetector; } });
Object.defineProperty(exports, "healthConditionDetector", { enumerable: true, get: function () { return context_js_1.healthConditionDetector; } });
Object.defineProperty(exports, "medicationDetector", { enumerable: true, get: function () { return context_js_1.medicationDetector; } });
Object.defineProperty(exports, "providerDetector", { enumerable: true, get: function () { return context_js_1.providerDetector; } });
// ----- redactors -----
var strategies_js_1 = require("./redactors/strategies.js");
Object.defineProperty(exports, "MaskRedactor", { enumerable: true, get: function () { return strategies_js_1.MaskRedactor; } });
Object.defineProperty(exports, "HashRedactor", { enumerable: true, get: function () { return strategies_js_1.HashRedactor; } });
Object.defineProperty(exports, "TokenRedactor", { enumerable: true, get: function () { return strategies_js_1.TokenRedactor; } });
Object.defineProperty(exports, "FullRedactor", { enumerable: true, get: function () { return strategies_js_1.FullRedactor; } });
Object.defineProperty(exports, "GeneralizeRedactor", { enumerable: true, get: function () { return strategies_js_1.GeneralizeRedactor; } });
Object.defineProperty(exports, "SynthesizeRedactor", { enumerable: true, get: function () { return strategies_js_1.SynthesizeRedactor; } });
Object.defineProperty(exports, "applyRedactions", { enumerable: true, get: function () { return strategies_js_1.applyRedactions; } });
// ----- metadata -----
var scrubber_js_1 = require("./metadata/scrubber.js");
Object.defineProperty(exports, "SENSITIVE_METADATA_KEYS", { enumerable: true, get: function () { return scrubber_js_1.SENSITIVE_METADATA_KEYS; } });
Object.defineProperty(exports, "isSensitiveKey", { enumerable: true, get: function () { return scrubber_js_1.isSensitiveKey; } });
Object.defineProperty(exports, "scrubObjectMetadata", { enumerable: true, get: function () { return scrubber_js_1.scrubMetadata; } });
Object.defineProperty(exports, "diffMetadata", { enumerable: true, get: function () { return scrubber_js_1.diffMetadata; } });
Object.defineProperty(exports, "assertClean", { enumerable: true, get: function () { return scrubber_js_1.assertClean; } });
// ----- ocr -----
var handling_js_1 = require("./ocr/handling.js");
Object.defineProperty(exports, "normalizeOcrText", { enumerable: true, get: function () { return handling_js_1.normalizeOcrText; } });
Object.defineProperty(exports, "ocrPageToText", { enumerable: true, get: function () { return handling_js_1.ocrPageToText; } });
Object.defineProperty(exports, "stripOcrGeometry", { enumerable: true, get: function () { return handling_js_1.stripOcrGeometry; } });
Object.defineProperty(exports, "findOcrPiiCandidates", { enumerable: true, get: function () { return handling_js_1.findOcrPiiCandidates; } });
// ----- images -----
var redact_js_1 = require("./images/redact.js");
Object.defineProperty(exports, "stripJpegExif", { enumerable: true, get: function () { return redact_js_1.stripJpegExif; } });
Object.defineProperty(exports, "redactImage", { enumerable: true, get: function () { return redact_js_1.redactImage; } });
Object.defineProperty(exports, "dhash", { enumerable: true, get: function () { return redact_js_1.dhash; } });
Object.defineProperty(exports, "imageIdentifier", { enumerable: true, get: function () { return redact_js_1.imageIdentifier; } });
// ----- documents -----
var metadata_js_1 = require("./documents/metadata.js");
Object.defineProperty(exports, "parsePdfInfo", { enumerable: true, get: function () { return metadata_js_1.parsePdfInfo; } });
Object.defineProperty(exports, "parseDocxCoreXml", { enumerable: true, get: function () { return metadata_js_1.parseDocxCoreXml; } });
Object.defineProperty(exports, "normalizeMetadata", { enumerable: true, get: function () { return metadata_js_1.normalizeMetadata; } });
Object.defineProperty(exports, "scrubDocumentMetadata", { enumerable: true, get: function () { return metadata_js_1.scrubDocumentMetadata; } });
Object.defineProperty(exports, "assertDocumentClean", { enumerable: true, get: function () { return metadata_js_1.assertDocumentClean; } });
// ----- validation -----
var validator_js_1 = require("./validation/validator.js");
Object.defineProperty(exports, "Validator", { enumerable: true, get: function () { return validator_js_1.Validator; } });
Object.defineProperty(exports, "hashConfig", { enumerable: true, get: function () { return validator_js_1.hashConfig; } });
// ----- publishing -----
var manifest_js_1 = require("./publishing/manifest.js");
Object.defineProperty(exports, "hashRecord", { enumerable: true, get: function () { return manifest_js_1.hashRecord; } });
Object.defineProperty(exports, "hashDataset", { enumerable: true, get: function () { return manifest_js_1.hashDataset; } });
Object.defineProperty(exports, "buildManifest", { enumerable: true, get: function () { return manifest_js_1.buildManifest; } });
Object.defineProperty(exports, "verifyManifest", { enumerable: true, get: function () { return manifest_js_1.verifyManifest; } });
Object.defineProperty(exports, "serializeManifest", { enumerable: true, get: function () { return manifest_js_1.serializeManifest; } });
// ----- main pipeline -----
var anonymizer_js_1 = require("./anonymizer.js");
Object.defineProperty(exports, "Anonymizer", { enumerable: true, get: function () { return anonymizer_js_1.Anonymizer; } });
Object.defineProperty(exports, "anonymize", { enumerable: true, get: function () { return anonymizer_js_1.anonymize; } });
Object.defineProperty(exports, "defaultRegistry", { enumerable: true, get: function () { return anonymizer_js_1.defaultRegistry; } });
Object.defineProperty(exports, "redactorForStrategy", { enumerable: true, get: function () { return anonymizer_js_1.redactorForStrategy; } });
//# sourceMappingURL=index.js.map