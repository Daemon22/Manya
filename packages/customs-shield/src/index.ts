/**
 * @manya/customs-shield — compliance and supply-chain intelligence.
 *
 * Public API surface for @manya/customs-shield. Everything exported here is
 * part of the stable, semver-bound public API.
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

// ----- config -----
export { DEFAULT_CONFIG, mergeConfig } from './config/config.js';
export type { ShieldConfig } from './config/config.js';

// ----- hscode -----
export {
  buildDefaultCatalog, setCatalog, getCatalog, lookup, validate,
  normalize, chapter, heading, international, suggest, verifyMatch,
  isValidFormat,
} from './hscode/catalog.js';
export type { HSCatalog } from './hscode/catalog.js';

// ----- sanctions -----
export {
  DEFAULT_COUNTRY_SANCTIONS, setSanctionsList, getSanctionsList,
  normalizeName, levenshtein, similarity,
  screenParty, screenParties,
} from './sanctions/screener.js';
export type { ScreeningResult } from './sanctions/screener.js';

// ----- compliance -----
export {
  DEFAULT_RULE_SET, setRuleSet, getRuleSet,
  checkEmbargoes, checkLicenses, checkRestrictedOrigins, calculateDuty,
} from './compliance/rules.js';
export type {
  ComplianceRuleSet, EmbargoRule, LicenseRule, RestrictedOriginRule, DutyRule,
} from './compliance/rules.js';

// ----- restrictions -----
export {
  DEFAULT_PRODUCT_RESTRICTIONS, setRestrictions, getRestrictions,
} from './restrictions/rules.js';
export type { ProductRestriction } from './restrictions/rules.js';

// ----- risk -----
export {
  HIGH_RISK_TRANSSHIPMENT, INDICATOR_WEIGHTS,
  detectIndicators, bandFor, scoreFrom, analyzeVulnerabilities,
} from './risk/scoring.js';

// ----- reporting -----
export {
  buildImportDeclaration, buildSanctionsRecord, serialize,
  validate as validateReport,
} from './reporting/builder.js';

// ----- main pipeline -----
export { CustomsShield, screen } from './shield.js';
