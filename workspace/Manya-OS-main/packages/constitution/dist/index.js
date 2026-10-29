"use strict";
/**
 * @manya-os/constitution — governance substrate for the MANYA Intelligence OS.
 *
 * Public API surface for @manya-os/constitution. Everything exported here is
 * part of the stable, semver-bound public API.
 *
 * Capabilities:
 *   - Ethical rules (`EthicalRule`, `RuleSet`, `evaluateRule`, `evaluateRuleSet`).
 *   - Operational policies with a small condition language
 *     (`Policy`, `PolicySet`, `evaluatePolicy`, `evaluatePolicySet`,
 *     `evaluateCondition`, `parseCondition`).
 *   - Permission model with role inheritance (`PermissionModel`, `Role`,
 *     `can`, `whoCan`, `grantRole`, `revokeRole`).
 *   - Decision hierarchy (`DecisionHierarchy`, `findCommonAuthority`,
 *     `canOverride`, `escalationPath`).
 *   - Emergency procedures (`EmergencyController`, `EmergencyProcedure`,
 *     `declareEmergency`, `liftEmergency`, `isActionAllowed`).
 *   - Safety rules (`SafetyChecker`, `SafetyRule`, `assertSafe`,
 *     `verifyInvariants`).
 *   - Conflict resolution (`ConflictResolver`, `Conflict`, `ResolutionStrategy`).
 *   - Runtime enforcement (`EnforcementEngine`, `evaluate`).
 *   - Versioned governance documents (`GovernanceDocument`, `diffDocuments`,
 *     `isRatified`, `supersede`).
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
exports.validateSection = exports.validateDocument = exports.supersede = exports.ratify = exports.isRatified = exports.diffDocuments = exports.EnforcementEngine = exports.CONFLICT_SEVERITIES = exports.RESOLUTION_STRATEGIES = exports.validateConflict = exports.ConflictResolver = exports.ENFORCEMENT_POINTS = exports.validateSafetyRule = exports.SafetyChecker = exports.STATE_ORDER = exports.STATE_RANK = exports.validateProcedure = exports.EmergencyController = exports.validateHierarchy = exports.children = exports.roots = exports.ancestors = exports.canOverride = exports.findCommonAuthority = exports.escalationPath = exports.requireNode = exports.WILDCARD = exports.validatePermissionModel = exports.rolesForSubject = exports.permissionMatches = exports.permissionsForRole = exports.expandRoles = exports.revokeRole = exports.grantRole = exports.whoCan = exports.can = exports.clearConditionCache = exports.parseCondition = exports.evaluateCondition = exports.evaluatePolicySet = exports.evaluatePolicy = exports.RULE_CATEGORIES = exports.validateRule = exports.evaluateRuleSet = exports.evaluateRule = exports.SCRUBBED_FIELD_NAMES = exports.shouldScrubField = exports.scrubMetadata = exports.SilentLogger = exports.ConsoleLogger = void 0;
exports.DOCUMENT_STATUSES = exports.SECTION_TYPES = exports.parseVersion = exports.formatVersion = exports.compareVersions = void 0;
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
// ----- rules -----
var rules_js_1 = require("./rules/rules.js");
Object.defineProperty(exports, "evaluateRule", { enumerable: true, get: function () { return rules_js_1.evaluateRule; } });
Object.defineProperty(exports, "evaluateRuleSet", { enumerable: true, get: function () { return rules_js_1.evaluateRuleSet; } });
Object.defineProperty(exports, "validateRule", { enumerable: true, get: function () { return rules_js_1.validateRule; } });
Object.defineProperty(exports, "RULE_CATEGORIES", { enumerable: true, get: function () { return rules_js_1.RULE_CATEGORIES; } });
// ----- policies -----
var policies_js_1 = require("./policies/policies.js");
Object.defineProperty(exports, "evaluatePolicy", { enumerable: true, get: function () { return policies_js_1.evaluatePolicy; } });
Object.defineProperty(exports, "evaluatePolicySet", { enumerable: true, get: function () { return policies_js_1.evaluatePolicySet; } });
Object.defineProperty(exports, "evaluateCondition", { enumerable: true, get: function () { return policies_js_1.evaluateCondition; } });
Object.defineProperty(exports, "parseCondition", { enumerable: true, get: function () { return policies_js_1.parseCondition; } });
Object.defineProperty(exports, "clearConditionCache", { enumerable: true, get: function () { return policies_js_1.clearConditionCache; } });
// ----- permissions -----
var permissions_js_1 = require("./permissions/permissions.js");
Object.defineProperty(exports, "can", { enumerable: true, get: function () { return permissions_js_1.can; } });
Object.defineProperty(exports, "whoCan", { enumerable: true, get: function () { return permissions_js_1.whoCan; } });
Object.defineProperty(exports, "grantRole", { enumerable: true, get: function () { return permissions_js_1.grantRole; } });
Object.defineProperty(exports, "revokeRole", { enumerable: true, get: function () { return permissions_js_1.revokeRole; } });
Object.defineProperty(exports, "expandRoles", { enumerable: true, get: function () { return permissions_js_1.expandRoles; } });
Object.defineProperty(exports, "permissionsForRole", { enumerable: true, get: function () { return permissions_js_1.permissionsForRole; } });
Object.defineProperty(exports, "permissionMatches", { enumerable: true, get: function () { return permissions_js_1.permissionMatches; } });
Object.defineProperty(exports, "rolesForSubject", { enumerable: true, get: function () { return permissions_js_1.rolesForSubject; } });
Object.defineProperty(exports, "validatePermissionModel", { enumerable: true, get: function () { return permissions_js_1.validatePermissionModel; } });
Object.defineProperty(exports, "WILDCARD", { enumerable: true, get: function () { return permissions_js_1.WILDCARD; } });
// ----- hierarchy -----
var hierarchy_js_1 = require("./hierarchy/hierarchy.js");
Object.defineProperty(exports, "requireNode", { enumerable: true, get: function () { return hierarchy_js_1.requireNode; } });
Object.defineProperty(exports, "escalationPath", { enumerable: true, get: function () { return hierarchy_js_1.escalationPath; } });
Object.defineProperty(exports, "findCommonAuthority", { enumerable: true, get: function () { return hierarchy_js_1.findCommonAuthority; } });
Object.defineProperty(exports, "canOverride", { enumerable: true, get: function () { return hierarchy_js_1.canOverride; } });
Object.defineProperty(exports, "ancestors", { enumerable: true, get: function () { return hierarchy_js_1.ancestors; } });
Object.defineProperty(exports, "roots", { enumerable: true, get: function () { return hierarchy_js_1.roots; } });
Object.defineProperty(exports, "children", { enumerable: true, get: function () { return hierarchy_js_1.children; } });
Object.defineProperty(exports, "validateHierarchy", { enumerable: true, get: function () { return hierarchy_js_1.validateHierarchy; } });
// ----- emergency -----
var emergency_js_1 = require("./emergency/emergency.js");
Object.defineProperty(exports, "EmergencyController", { enumerable: true, get: function () { return emergency_js_1.EmergencyController; } });
Object.defineProperty(exports, "validateProcedure", { enumerable: true, get: function () { return emergency_js_1.validateProcedure; } });
Object.defineProperty(exports, "STATE_RANK", { enumerable: true, get: function () { return emergency_js_1.STATE_RANK; } });
Object.defineProperty(exports, "STATE_ORDER", { enumerable: true, get: function () { return emergency_js_1.STATE_ORDER; } });
// ----- safety -----
var safety_js_1 = require("./safety/safety.js");
Object.defineProperty(exports, "SafetyChecker", { enumerable: true, get: function () { return safety_js_1.SafetyChecker; } });
Object.defineProperty(exports, "validateSafetyRule", { enumerable: true, get: function () { return safety_js_1.validateSafetyRule; } });
Object.defineProperty(exports, "ENFORCEMENT_POINTS", { enumerable: true, get: function () { return safety_js_1.ENFORCEMENT_POINTS; } });
// ----- conflict -----
var conflict_js_1 = require("./conflict/conflict.js");
Object.defineProperty(exports, "ConflictResolver", { enumerable: true, get: function () { return conflict_js_1.ConflictResolver; } });
Object.defineProperty(exports, "validateConflict", { enumerable: true, get: function () { return conflict_js_1.validateConflict; } });
Object.defineProperty(exports, "RESOLUTION_STRATEGIES", { enumerable: true, get: function () { return conflict_js_1.RESOLUTION_STRATEGIES; } });
Object.defineProperty(exports, "CONFLICT_SEVERITIES", { enumerable: true, get: function () { return conflict_js_1.CONFLICT_SEVERITIES; } });
// ----- enforce -----
var enforce_js_1 = require("./enforce/enforce.js");
Object.defineProperty(exports, "EnforcementEngine", { enumerable: true, get: function () { return enforce_js_1.EnforcementEngine; } });
// ----- documents -----
var documents_js_1 = require("./documents/documents.js");
Object.defineProperty(exports, "diffDocuments", { enumerable: true, get: function () { return documents_js_1.diffDocuments; } });
Object.defineProperty(exports, "isRatified", { enumerable: true, get: function () { return documents_js_1.isRatified; } });
Object.defineProperty(exports, "ratify", { enumerable: true, get: function () { return documents_js_1.ratify; } });
Object.defineProperty(exports, "supersede", { enumerable: true, get: function () { return documents_js_1.supersede; } });
Object.defineProperty(exports, "validateDocument", { enumerable: true, get: function () { return documents_js_1.validateDocument; } });
Object.defineProperty(exports, "validateSection", { enumerable: true, get: function () { return documents_js_1.validateSection; } });
Object.defineProperty(exports, "compareVersions", { enumerable: true, get: function () { return documents_js_1.compareVersions; } });
Object.defineProperty(exports, "formatVersion", { enumerable: true, get: function () { return documents_js_1.formatVersion; } });
Object.defineProperty(exports, "parseVersion", { enumerable: true, get: function () { return documents_js_1.parseVersion; } });
Object.defineProperty(exports, "SECTION_TYPES", { enumerable: true, get: function () { return documents_js_1.SECTION_TYPES; } });
Object.defineProperty(exports, "DOCUMENT_STATUSES", { enumerable: true, get: function () { return documents_js_1.DOCUMENT_STATUSES; } });
//# sourceMappingURL=index.js.map