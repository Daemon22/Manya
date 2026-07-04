/**
 * @manya/constitution — shared type definitions.
 *
 * All cross-module type definitions live here so that modules can import the
 * shape they need without circular dependencies. Per-module "value" interfaces
 * (e.g. `EthicalRule`) are also declared here for symmetry with other MANYA
 * packages and to keep the public surface discoverable.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
/**
 * Runtime governance context. Passed to every evaluator (rules, policies,
 * safety, enforcement). Captures who is acting, what they are doing, and
 * optional metadata about the action.
 */
export interface GovernanceContext {
    /** The subject performing the action (user id, role id, service id). */
    subject: string;
    /** The action being performed (e.g. 'ledger:append', 'data:delete'). */
    action: string;
    /** Optional resource identifier the action targets. */
    resource?: string;
    /** Optional arbitrary metadata. */
    metadata?: Record<string, unknown>;
    /** ISO 8601 timestamp of the action. */
    timestamp: string;
}
/** A semantic-version number, following semver.org. */
export interface SemverVersion {
    major: number;
    minor: number;
    patch: number;
    /** Optional prerelease tag (e.g. 'alpha.1'). */
    prerelease?: string;
    /** Optional build metadata (e.g. 'exp.sha.5114f85'). */
    build?: string;
}
/** Result returned by `EnforcementEngine.evaluate`. */
export interface EnforcementResult {
    /** Whether the action is permitted. */
    allowed: boolean;
    /** Human-readable reasons contributing to the decision. */
    reasons: string[];
    /** Violation messages that contributed to a denial. */
    violations: string[];
    /** Stable audit-log id for this evaluation. */
    auditId: string;
}
/** Category of an ethical rule. */
export type RuleCategory = 'harm' | 'deception' | 'privacy' | 'fairness' | 'autonomy' | 'transparency';
/** Severity of an ethical rule. */
export type RuleSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
/** A single ethical rule. */
export interface EthicalRule {
    /** Stable, unique id (e.g. 'harm.no-physical-harm'). */
    id: string;
    /** Human-readable name. */
    name: string;
    /** What the rule forbids or requires. */
    description: string;
    /** Category bucket (see `RuleCategory`). */
    category: RuleCategory;
    /**
     * When `true`, the rule is a prohibition: it is violated when the
     * described behavior occurs. When `false`, the rule is a requirement:
     * it is violated when the described behavior does NOT occur.
     */
    forbidden: boolean;
    /** Severity used for escalation. */
    severity: RuleSeverity;
}
/** A collection of ethical rules. */
export interface RuleSet {
    /** Stable id for the rule set. */
    id: string;
    /** Optional human-readable name. */
    name?: string;
    /** The rules in the set. */
    rules: EthicalRule[];
}
/** Result of evaluating a single rule. */
export interface RuleEvaluation {
    /** Whether the rule was violated. */
    violated: boolean;
    /** Human-readable reason for the violation, when present. */
    reason?: string;
    /** The rule that was evaluated. */
    ruleId: string;
    /** The rule's severity, copied for convenience. */
    severity: RuleSeverity;
}
/** Action a policy directs the engine to take when its condition matches. */
export type PolicyAction = 'allow' | 'deny' | 'require_approval';
/** An operational policy. */
export interface Policy {
    /** Stable unique id. */
    id: string;
    /** Human-readable name. */
    name: string;
    /** What the policy governs. */
    description: string;
    /**
     * Condition expression. Supported syntax:
     *   - `context.field == value`
     *   - `context.field != value`
     *   - `context.field in [a, b, c]`
     *   - `NOT <expr>`
     *   - `<expr> AND <expr>`
     *   - `<expr> OR <expr>`
     *   - parentheses for grouping
     */
    condition: string;
    /** Action taken when the condition matches. */
    action: PolicyAction;
    /** Higher priority policies win. Defaults to 0. */
    priority: number;
}
/** A collection of policies. */
export interface PolicySet {
    id: string;
    name?: string;
    policies: Policy[];
}
/** Result of evaluating a single policy. */
export interface PolicyEvaluation {
    /** Whether the policy's condition matched. */
    matched: boolean;
    /** The policy's action (returned even when not matched, for reference). */
    action: PolicyAction;
    /** Reason for the match decision. */
    reason?: string;
    /** The policy's id. */
    policyId: string;
}
/** A permission string of the form `module:action` (e.g. `ledger:append`). */
export type Permission = string;
/** A role that bundles permissions and may inherit from other roles. */
export interface Role {
    /** Role name (unique within a `PermissionModel`). */
    name: string;
    /** Permissions granted directly by this role. */
    permissions: Permission[];
    /** Roles this role inherits from (transitively). */
    inherits?: string[];
}
/** A subject-to-role assignment. */
export interface RoleAssignment {
    /** Subject id. */
    subject: string;
    /** Role name. */
    role: string;
}
/** A complete permission model: roles + assignments. */
export interface PermissionModel {
    /** All known roles. */
    roles: Role[];
    /** Role assignments per subject. */
    assignments: RoleAssignment[];
}
/** A node in a decision hierarchy. */
export interface DecisionNode {
    /** Stable unique id. */
    id: string;
    /** Role associated with this node. */
    role: string;
    /** Authority level — higher means more authority. */
    authority: number;
    /** Parent node id, if any. */
    parent?: string;
}
/** A decision hierarchy: a tree (or forest) of `DecisionNode`s. */
export interface DecisionHierarchy {
    /** All nodes. */
    nodes: DecisionNode[];
}
/** Emergency state levels, ordered by severity. */
export type EmergencyState = 'normal' | 'heightened' | 'emergency' | 'critical';
/** An emergency procedure. */
export interface EmergencyProcedure {
    /** Stable unique id. */
    id: string;
    /** Human-readable name. */
    name: string;
    /** The state this procedure applies to. */
    state: EmergencyState;
    /** Trigger conditions (free-form descriptions). */
    triggerConditions: string[];
    /** Actions allowed while the procedure is active. */
    allowedActions: string[];
    /** Roles whose approval is required to invoke actions. */
    requiredApprovals: string[];
    /** Timeout (ms) after which the procedure auto-lifts. 0 = no timeout. */
    timeout: number;
}
/** When a safety rule is enforced. */
export type EnforcementPoint = 'pre' | 'post' | 'both';
/** A safety rule (an invariant that must hold). */
export interface SafetyRule {
    /** Stable unique id. */
    id: string;
    /** The invariant, expressed as a human-readable predicate. */
    invariant: string;
    /** When the rule is enforced. */
    enforcementPoint: EnforcementPoint;
    /** Severity when violated. */
    severity: RuleSeverity;
}
/** A safety violation detected by a `SafetyChecker`. */
export interface SafetyViolation {
    /** The rule that was violated. */
    ruleId: string;
    /** The invariant text, for convenience. */
    invariant: string;
    /** Why the invariant was violated. */
    reason: string;
    /** When the violation was detected. */
    enforcementPoint: 'pre' | 'post';
    /** Severity of the violation. */
    severity: RuleSeverity;
}
/** Severity of a conflict. */
export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';
/** Strategy used to resolve a conflict. */
export type ResolutionStrategy = 'consensus' | 'majority' | 'authority' | 'arbitration' | 'escalation';
/** A conflict between parties. */
export interface Conflict {
    /** Stable unique id. */
    id: string;
    /** Party ids involved in the conflict. */
    parties: string[];
    /** Human-readable description. */
    description: string;
    /** Severity. */
    severity: ConflictSeverity;
}
/** Result of resolving a conflict. */
export interface ConflictResolution {
    /** The resolution text. */
    resolution: string;
    /** Why this resolution was chosen. */
    reason: string;
    /** Parties that dissented (for majority / authority strategies). */
    dissenters?: string[];
    /** Strategy used. */
    strategy: ResolutionStrategy;
}
/** Section type. */
export type DocumentSectionType = 'preamble' | 'article' | 'amendment' | 'appendix' | 'schedule' | 'other';
/** A section within a governance document. */
export interface DocumentSection {
    /** Stable unique id within the document. */
    id: string;
    /** Section title. */
    title: string;
    /** Section body content. */
    content: string;
    /** Section type. */
    type: DocumentSectionType;
}
/** Lifecycle status of a governance document. */
export type DocumentStatus = 'draft' | 'proposed' | 'ratified' | 'superseded';
/** A versioned governance document. */
export interface GovernanceDocument {
    /** Stable unique id. */
    id: string;
    /** Human-readable name. */
    name: string;
    /** Semantic version. */
    version: SemverVersion;
    /** Document sections. */
    sections: DocumentSection[];
    /** Lifecycle status. */
    status: DocumentStatus;
    /** ISO 8601 timestamp of ratification, when ratified. */
    ratifiedAt?: string;
    /** Optional id of the document that supersedes this one. */
    supersededBy?: string;
}
/** A diff between two documents. */
export interface DocumentDiff {
    /** Section ids added in the new document. */
    added: DocumentSection[];
    /** Section ids removed from the old document. */
    removed: DocumentSection[];
    /** Section ids whose content changed. */
    changed: Array<{
        id: string;
        oldSection: DocumentSection;
        newSection: DocumentSection;
    }>;
}
//# sourceMappingURL=types.d.ts.map