/**
 * Type declarations for @manya/shield
 */

// ---------------------------------------------------------------------------
// Policy types
// ---------------------------------------------------------------------------

/** A single permission entry within a role. */
export interface Permission {
  resource: string;
  actions: string[];
  grantedAt: string;
}

/** A role definition within a policy. */
export interface Role {
  name: string;
  description: string;
  priority: number;
  parent: string | null;
  permissions: Permission[];
  createdAt: string;
}

/** A registered subject (user or service). */
export interface Subject {
  id: string;
  roles: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
}

/** An ABAC rule within a policy. */
export interface ABACRule {
  name: string;
  effect: 'allow' | 'deny';
  condition: (subject: Subject, resource: string, action: string, context: Record<string, unknown>) => boolean;
  description: string;
  addedAt: string;
}

/** A policy instance returned by createPolicy(). */
export interface Policy {
  id: string;
  name: string;
  description: string;
  defaultAction: 'allow' | 'deny';
  roles: Map<string, Role>;
  rules: ABACRule[];
  subjects: Map<string, Subject>;
  createdAt: string;
  version: number;
}

/** Options for createPolicy(). */
export interface CreatePolicyOptions {
  description?: string;
  defaultAction?: 'allow' | 'deny';
}

/** Options for defineRole(). */
export interface DefineRoleOptions {
  description?: string;
  priority?: number;
  parent?: string;
}

/** A permission grant specification. */
export interface PermissionGrant {
  resource: string;
  actions: string[];
}

/** Options for registerSubject(). */
export interface RegisterSubjectOptions {
  roles?: string[];
  attributes?: Record<string, unknown>;
}

/** An ABAC rule specification for addRule(). */
export interface ABACRuleSpec {
  name: string;
  effect: 'allow' | 'deny';
  condition: (subject: Subject, resource: string, action: string, context: Record<string, unknown>) => boolean;
  description?: string;
}

// ---------------------------------------------------------------------------
// Policy operation result types
// ---------------------------------------------------------------------------

/** Result of defineRole(). */
export interface DefineRoleResult {
  name: string;
  description: string;
  priority: number;
  parent: string | null;
  permissions: Permission[];
  createdAt: string;
}

/** Result of grant(). */
export interface GrantResult {
  role: string;
  grantedCount: number;
}

/** Result of revoke(). */
export interface RevokeResult {
  role: string;
  revokedCount: number;
}

/** Result of registerSubject(). */
export interface RegisterSubjectResult {
  id: string;
  roles: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
}

/** Result of assignRole(). */
export interface AssignRoleResult {
  subject: string;
  role: string;
}

/** Result of removeRole(). */
export interface RemoveRoleResult {
  subject: string;
  role: string;
  removed: boolean;
}

/** A matched rule in an access check result. */
export interface MatchedRule {
  role?: string;
  resource?: string;
  action?: string;
  type: 'rbac' | 'rbac-inherited' | 'abac';
  inheritedFrom?: string;
  rule?: string;
  effect?: string;
}

/** Result of checkAccess(). */
export interface CheckAccessResult {
  allowed: boolean;
  reason: string;
  matchedRules: MatchedRule[];
  subject: string;
  resource: string;
  action: string;
}

/** Result of addRule(). */
export interface AddRuleResult {
  name: string;
  effect: string;
  description: string;
}

/** A single effective permission entry. */
export interface EffectivePermission {
  role: string;
  resource: string;
  actions: string[];
  inheritedFrom?: string;
}

/** Result of getEffectivePermissions(). */
export interface EffectivePermissionsResult {
  subject: string;
  roles: string[];
  permissions: EffectivePermission[];
}

// ---------------------------------------------------------------------------
// Audit types
// ---------------------------------------------------------------------------

/** A single audit log entry. */
export interface AuditEntry {
  id: string;
  subject: string;
  resource: string;
  action: string;
  granted: boolean;
  reason: string;
  context: Record<string, unknown>;
  timestamp: string;
  hash: string;
  previousHash: string | null;
}

/** Options for auditAccess(). */
export interface AuditAccessOptions {
  reason?: string;
  context?: Record<string, unknown>;
  previousHash?: string;
}

/** An access decision used to build an audit trail. */
export interface AccessDecision {
  subject: string;
  resource: string;
  action: string;
  granted: boolean;
  reason?: string;
  context?: Record<string, unknown>;
}

/** Result of buildAuditTrail(). */
export interface AuditTrail {
  entries: AuditEntry[];
  verified: boolean;
}

/** Result of verifyAuditTrail(). */
export interface TrailVerifyResult {
  valid: boolean;
  brokenAt: number | null;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Function declarations
// ---------------------------------------------------------------------------

/**
 * Creates a new access control policy.
 * @param name - The policy name.
 * @param options - Policy options.
 * @throws {Error} If name is missing or not a string.
 */
export function createPolicy(name: string, options?: CreatePolicyOptions): Policy;

/**
 * Defines a role with permissions.
 * @param policy - The policy instance.
 * @param name - Role name.
 * @param options - Role options.
 * @throws {Error} If policy is invalid or role name is missing.
 */
export function defineRole(policy: Policy, name: string, options?: DefineRoleOptions): DefineRoleResult;

/**
 * Grants permissions to a role.
 * @param policy - The policy instance.
 * @param roleName - The role name.
 * @param permissions - Permissions to grant.
 * @throws {Error} If policy is invalid, role doesn't exist, or permissions are invalid.
 */
export function grant(policy: Policy, roleName: string, permissions: PermissionGrant[]): GrantResult;

/**
 * Revokes permissions from a role.
 * @param policy - The policy instance.
 * @param roleName - The role name.
 * @param resource - Optional resource filter. If omitted, revokes all.
 * @throws {Error} If policy is invalid or role doesn't exist.
 */
export function revoke(policy: Policy, roleName: string, resource?: string): RevokeResult;

/**
 * Registers a subject (user/service) with assigned roles.
 * @param policy - The policy instance.
 * @param subjectId - The subject identifier.
 * @param options - Subject options.
 * @throws {Error} If policy is invalid or subjectId is missing.
 */
export function registerSubject(policy: Policy, subjectId: string, options?: RegisterSubjectOptions): RegisterSubjectResult;

/**
 * Assigns a role to a subject.
 * @param policy - The policy instance.
 * @param subjectId - The subject identifier.
 * @param roleName - The role to assign.
 * @throws {Error} If subject or role doesn't exist.
 */
export function assignRole(policy: Policy, subjectId: string, roleName: string): AssignRoleResult;

/**
 * Removes a role from a subject.
 * @param policy - The policy instance.
 * @param subjectId - The subject identifier.
 * @param roleName - The role to remove.
 * @throws {Error} If subject doesn't exist.
 */
export function removeRole(policy: Policy, subjectId: string, roleName: string): RemoveRoleResult;

/**
 * Checks if a subject has access to a resource with a specific action.
 * @param policy - The policy instance.
 * @param subjectId - The subject identifier.
 * @param resource - The resource being accessed.
 * @param action - The action being performed.
 * @param context - ABAC context attributes.
 */
export function checkAccess(
  policy: Policy,
  subjectId: string,
  resource: string,
  action: string,
  context?: Record<string, unknown>,
): CheckAccessResult;

/**
 * Adds an ABAC rule to the policy.
 * @param policy - The policy instance.
 * @param rule - The ABAC rule specification.
 * @throws {Error} If rule is invalid or effect is not 'allow' or 'deny'.
 */
export function addRule(policy: Policy, rule: ABACRuleSpec): AddRuleResult;

/**
 * Gets all effective permissions for a subject.
 * @param policy - The policy instance.
 * @param subjectId - The subject identifier.
 * @throws {Error} If subject doesn't exist.
 */
export function getEffectivePermissions(policy: Policy, subjectId: string): EffectivePermissionsResult;

/**
 * Creates an access audit log entry.
 * @param subjectId - Who made the access attempt.
 * @param resource - What resource was accessed.
 * @param action - What action was attempted.
 * @param granted - Whether access was granted.
 * @param options - Audit entry options.
 * @throws {Error} If subjectId, resource, or action is missing.
 */
export function auditAccess(
  subjectId: string,
  resource: string,
  action: string,
  granted: boolean,
  options?: AuditAccessOptions,
): AuditEntry;

/**
 * Builds a tamper-proof audit trail from access decisions.
 * @param decisions - Access decisions to chain.
 * @throws {Error} If decisions is not a non-empty array.
 */
export function buildAuditTrail(decisions: AccessDecision[]): AuditTrail;

/**
 * Verifies the integrity of an audit trail.
 * @param trail - The audit trail to verify.
 */
export function verifyAuditTrail(trail: AuditTrail): TrailVerifyResult;

/** Unified Shield API object. */
export const shield: {
  createPolicy: typeof createPolicy;
  defineRole: typeof defineRole;
  grant: typeof grant;
  revoke: typeof revoke;
  registerSubject: typeof registerSubject;
  assignRole: typeof assignRole;
  removeRole: typeof removeRole;
  checkAccess: typeof checkAccess;
  addRule: typeof addRule;
  getEffectivePermissions: typeof getEffectivePermissions;
  auditAccess: typeof auditAccess;
  buildAuditTrail: typeof buildAuditTrail;
  verifyAuditTrail: typeof verifyAuditTrail;
};

export default typeof shield;
