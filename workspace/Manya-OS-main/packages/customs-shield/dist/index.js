"use strict";
/**
 * @manya-os/customs-shield — compliance and supply-chain intelligence.
 *
 * Public API surface for @manya-os/customs-shield. Everything exported here is
 * part of the stable, semver-bound public API.
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
exports.screen = exports.CustomsShield = exports.validateReport = exports.serialize = exports.buildSanctionsRecord = exports.buildImportDeclaration = exports.analyzeVulnerabilities = exports.scoreFrom = exports.bandFor = exports.detectIndicators = exports.INDICATOR_WEIGHTS = exports.HIGH_RISK_TRANSSHIPMENT = exports.getRestrictions = exports.setRestrictions = exports.DEFAULT_PRODUCT_RESTRICTIONS = exports.calculateDuty = exports.checkRestrictedOrigins = exports.checkLicenses = exports.checkEmbargoes = exports.getRuleSet = exports.setRuleSet = exports.DEFAULT_RULE_SET = exports.screenParties = exports.screenParty = exports.similarity = exports.levenshtein = exports.normalizeName = exports.getSanctionsList = exports.setSanctionsList = exports.DEFAULT_COUNTRY_SANCTIONS = exports.isValidFormat = exports.verifyMatch = exports.suggest = exports.international = exports.heading = exports.chapter = exports.normalize = exports.validate = exports.lookup = exports.getCatalog = exports.setCatalog = exports.buildDefaultCatalog = exports.mergeConfig = exports.DEFAULT_CONFIG = exports.SCRUBBED_FIELD_NAMES = exports.shouldScrubField = exports.scrubMetadata = exports.SilentLogger = exports.ConsoleLogger = void 0;
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
// ----- hscode -----
var catalog_js_1 = require("./hscode/catalog.js");
Object.defineProperty(exports, "buildDefaultCatalog", { enumerable: true, get: function () { return catalog_js_1.buildDefaultCatalog; } });
Object.defineProperty(exports, "setCatalog", { enumerable: true, get: function () { return catalog_js_1.setCatalog; } });
Object.defineProperty(exports, "getCatalog", { enumerable: true, get: function () { return catalog_js_1.getCatalog; } });
Object.defineProperty(exports, "lookup", { enumerable: true, get: function () { return catalog_js_1.lookup; } });
Object.defineProperty(exports, "validate", { enumerable: true, get: function () { return catalog_js_1.validate; } });
Object.defineProperty(exports, "normalize", { enumerable: true, get: function () { return catalog_js_1.normalize; } });
Object.defineProperty(exports, "chapter", { enumerable: true, get: function () { return catalog_js_1.chapter; } });
Object.defineProperty(exports, "heading", { enumerable: true, get: function () { return catalog_js_1.heading; } });
Object.defineProperty(exports, "international", { enumerable: true, get: function () { return catalog_js_1.international; } });
Object.defineProperty(exports, "suggest", { enumerable: true, get: function () { return catalog_js_1.suggest; } });
Object.defineProperty(exports, "verifyMatch", { enumerable: true, get: function () { return catalog_js_1.verifyMatch; } });
Object.defineProperty(exports, "isValidFormat", { enumerable: true, get: function () { return catalog_js_1.isValidFormat; } });
// ----- sanctions -----
var screener_js_1 = require("./sanctions/screener.js");
Object.defineProperty(exports, "DEFAULT_COUNTRY_SANCTIONS", { enumerable: true, get: function () { return screener_js_1.DEFAULT_COUNTRY_SANCTIONS; } });
Object.defineProperty(exports, "setSanctionsList", { enumerable: true, get: function () { return screener_js_1.setSanctionsList; } });
Object.defineProperty(exports, "getSanctionsList", { enumerable: true, get: function () { return screener_js_1.getSanctionsList; } });
Object.defineProperty(exports, "normalizeName", { enumerable: true, get: function () { return screener_js_1.normalizeName; } });
Object.defineProperty(exports, "levenshtein", { enumerable: true, get: function () { return screener_js_1.levenshtein; } });
Object.defineProperty(exports, "similarity", { enumerable: true, get: function () { return screener_js_1.similarity; } });
Object.defineProperty(exports, "screenParty", { enumerable: true, get: function () { return screener_js_1.screenParty; } });
Object.defineProperty(exports, "screenParties", { enumerable: true, get: function () { return screener_js_1.screenParties; } });
// ----- compliance -----
var rules_js_1 = require("./compliance/rules.js");
Object.defineProperty(exports, "DEFAULT_RULE_SET", { enumerable: true, get: function () { return rules_js_1.DEFAULT_RULE_SET; } });
Object.defineProperty(exports, "setRuleSet", { enumerable: true, get: function () { return rules_js_1.setRuleSet; } });
Object.defineProperty(exports, "getRuleSet", { enumerable: true, get: function () { return rules_js_1.getRuleSet; } });
Object.defineProperty(exports, "checkEmbargoes", { enumerable: true, get: function () { return rules_js_1.checkEmbargoes; } });
Object.defineProperty(exports, "checkLicenses", { enumerable: true, get: function () { return rules_js_1.checkLicenses; } });
Object.defineProperty(exports, "checkRestrictedOrigins", { enumerable: true, get: function () { return rules_js_1.checkRestrictedOrigins; } });
Object.defineProperty(exports, "calculateDuty", { enumerable: true, get: function () { return rules_js_1.calculateDuty; } });
// ----- restrictions -----
var rules_js_2 = require("./restrictions/rules.js");
Object.defineProperty(exports, "DEFAULT_PRODUCT_RESTRICTIONS", { enumerable: true, get: function () { return rules_js_2.DEFAULT_PRODUCT_RESTRICTIONS; } });
Object.defineProperty(exports, "setRestrictions", { enumerable: true, get: function () { return rules_js_2.setRestrictions; } });
Object.defineProperty(exports, "getRestrictions", { enumerable: true, get: function () { return rules_js_2.getRestrictions; } });
// ----- risk -----
var scoring_js_1 = require("./risk/scoring.js");
Object.defineProperty(exports, "HIGH_RISK_TRANSSHIPMENT", { enumerable: true, get: function () { return scoring_js_1.HIGH_RISK_TRANSSHIPMENT; } });
Object.defineProperty(exports, "INDICATOR_WEIGHTS", { enumerable: true, get: function () { return scoring_js_1.INDICATOR_WEIGHTS; } });
Object.defineProperty(exports, "detectIndicators", { enumerable: true, get: function () { return scoring_js_1.detectIndicators; } });
Object.defineProperty(exports, "bandFor", { enumerable: true, get: function () { return scoring_js_1.bandFor; } });
Object.defineProperty(exports, "scoreFrom", { enumerable: true, get: function () { return scoring_js_1.scoreFrom; } });
Object.defineProperty(exports, "analyzeVulnerabilities", { enumerable: true, get: function () { return scoring_js_1.analyzeVulnerabilities; } });
// ----- reporting -----
var builder_js_1 = require("./reporting/builder.js");
Object.defineProperty(exports, "buildImportDeclaration", { enumerable: true, get: function () { return builder_js_1.buildImportDeclaration; } });
Object.defineProperty(exports, "buildSanctionsRecord", { enumerable: true, get: function () { return builder_js_1.buildSanctionsRecord; } });
Object.defineProperty(exports, "serialize", { enumerable: true, get: function () { return builder_js_1.serialize; } });
Object.defineProperty(exports, "validateReport", { enumerable: true, get: function () { return builder_js_1.validate; } });
// ----- main pipeline -----
var shield_js_1 = require("./shield.js");
Object.defineProperty(exports, "CustomsShield", { enumerable: true, get: function () { return shield_js_1.CustomsShield; } });
Object.defineProperty(exports, "screen", { enumerable: true, get: function () { return shield_js_1.screen; } });
//# sourceMappingURL=index.js.map