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
export * from './types.js';
export * from './errors.js';
export { Logger, LogLevel, ConsoleLogger, SilentLogger, scrubMetadata, shouldScrubField, SCRUBBED_FIELD_NAMES, } from './logging.js';
export { DEFAULT_CONFIG, mergeConfig } from './config/config.js';
export type { AnonymizerConfig } from './config/config.js';
export { DetectorRegistry, resolveOverlaps, makeFinding, severityFor } from './detectors/registry.js';
export type { Detector, DetectorConfig } from './detectors/registry.js';
export { ALL_PATTERN_DETECTORS, emailDetector, phoneDetector, ipv4Detector, ipv6Detector, macDetector, urlDetector, creditCardDetector, ibanDetector, jwtDetector, apiKeyDetector, isoDateDetector, postalCodeDetector, usSsnDetector, zaIdDetector, luhnValid, zaIdChecksumValid, } from './detectors/patterns.js';
export { ALL_CONTEXT_DETECTORS, personNameDetector, addressDetector, healthConditionDetector, medicationDetector, providerDetector, } from './detectors/context.js';
export { MaskRedactor, HashRedactor, TokenRedactor, FullRedactor, GeneralizeRedactor, SynthesizeRedactor, applyRedactions, } from './redactors/strategies.js';
export type { Redactor } from './redactors/strategies.js';
export { SENSITIVE_METADATA_KEYS, isSensitiveKey, scrubMetadata as scrubObjectMetadata, diffMetadata, assertClean, } from './metadata/scrubber.js';
export type { MetadataScrubOptions } from './metadata/scrubber.js';
export { normalizeOcrText, ocrPageToText, stripOcrGeometry, findOcrPiiCandidates, } from './ocr/handling.js';
export type { OcrWord, OcrPage } from './ocr/handling.js';
export { stripJpegExif, redactImage, dhash, imageIdentifier } from './images/redact.js';
export type { ImageRedactionResult } from './images/redact.js';
export { parsePdfInfo, parseDocxCoreXml, normalizeMetadata, scrubDocumentMetadata, assertDocumentClean, } from './documents/metadata.js';
export type { DocumentKind, DocumentMetadata } from './documents/metadata.js';
export { Validator, hashConfig } from './validation/validator.js';
export type { ValidatorOptions } from './validation/validator.js';
export { hashRecord, hashDataset, buildManifest, verifyManifest, serializeManifest, } from './publishing/manifest.js';
export { Anonymizer, anonymize, defaultRegistry, redactorForStrategy } from './anonymizer.js';
//# sourceMappingURL=index.d.ts.map