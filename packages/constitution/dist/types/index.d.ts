/**
 * @manya/constitution — governance substrate for the MANYA Intelligence OS.
 *
 * Public API surface for @manya/constitution. Everything exported here is
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
export * from './types.js';
export * from './errors.js';
export { Logger, LogLevel, ConsoleLogger, SilentLogger, scrubMetadata, shouldScrubField, SCRUBBED_FIELD_NAMES, } from './logging.js';
export { evaluateRule, evaluateRuleSet, validateRule, RULE_CATEGORIES, } from './rules/rules.js';
export { evaluatePolicy, evaluatePolicySet, evaluateCondition, parseCondition, clearConditionCache, } from './policies/policies.js';
export { can, whoCan, grantRole, revokeRole, expandRoles, permissionsForRole, permissionMatches, rolesForSubject, validatePermissionModel, WILDCARD, } from './permissions/permissions.js';
export { requireNode, escalationPath, findCommonAuthority, canOverride, ancestors, roots, children, validateHierarchy, } from './hierarchy/hierarchy.js';
export { EmergencyController, validateProcedure, STATE_RANK, STATE_ORDER, } from './emergency/emergency.js';
export { SafetyChecker, validateSafetyRule, ENFORCEMENT_POINTS, } from './safety/safety.js';
export type { SafetyPredicate } from './safety/safety.js';
export { ConflictResolver, validateConflict, RESOLUTION_STRATEGIES, CONFLICT_SEVERITIES, } from './conflict/conflict.js';
export type { ResolveOptions } from './conflict/conflict.js';
export { EnforcementEngine } from './enforce/enforce.js';
export type { AuditEntry } from './enforce/enforce.js';
export { diffDocuments, isRatified, ratify, supersede, validateDocument, validateSection, compareVersions, formatVersion, parseVersion, SECTION_TYPES, DOCUMENT_STATUSES, } from './documents/documents.js';
//# sourceMappingURL=index.d.ts.map