# @manya/constitution — API Reference

> Complete TypeScript API reference for `@manya/constitution` v1.0.0.

## Contents
- [Types](#types)
- [Errors](#errors)
- [Logging](#logging)
- [Ethical Rules](#ethical-rules)
- [Policies](#policies)
- [Permissions](#permissions)
- [Decision Hierarchy](#decision-hierarchy)
- [Emergency](#emergency)
- [Safety](#safety)
- [Conflict Resolution](#conflict-resolution)
- [Enforcement Engine](#enforcement-engine)
- [Governance Documents](#governance-documents)

---

## Types

### `GovernanceContext`
```ts
interface GovernanceContext {
  subject: string;
  action: string;
  resource?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}
```

### `SemverVersion`
```ts
interface SemverVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}
```

### `EnforcementResult`
```ts
interface EnforcementResult {
  allowed: boolean;
  reasons: string[];
  violations: string[];
  auditId: string;
}
```

### `EthicalRule` and friends
```ts
type RuleCategory =
  | 'harm' | 'deception' | 'privacy'
  | 'fairness' | 'autonomy' | 'transparency';

type RuleSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

interface EthicalRule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  forbidden: boolean;
  severity: RuleSeverity;
}

interface RuleSet { id: string; name?: string; rules: EthicalRule[]; }

interface RuleEvaluation {
  violated: boolean;
  reason?: string;
  ruleId: string;
  severity: RuleSeverity;
}
```

### `Policy` and friends
```ts
type PolicyAction = 'allow' | 'deny' | 'require_approval';

interface Policy {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: PolicyAction;
  priority: number;
}

interface PolicySet { id: string; name?: string; policies: Policy[]; }

interface PolicyEvaluation {
  matched: boolean;
  action: PolicyAction;
  reason?: string;
  policyId: string;
}
```

### `Permission` and friends
```ts
type Permission = string;  // 'module:action' or '*'

interface Role {
  name: string;
  permissions: Permission[];
  inherits?: string[];
}

interface RoleAssignment { subject: string; role: string; }

interface PermissionModel {
  roles: Role[];
  assignments: RoleAssignment[];
}
```

### `DecisionHierarchy` and friends
```ts
interface DecisionNode {
  id: string;
  role: string;
  authority: number;
  parent?: string;
}

interface DecisionHierarchy { nodes: DecisionNode[]; }
```

### `EmergencyProcedure` and friends
```ts
type EmergencyState = 'normal' | 'heightened' | 'emergency' | 'critical';

interface EmergencyProcedure {
  id: string;
  name: string;
  state: EmergencyState;
  triggerConditions: string[];
  allowedActions: string[];
  requiredApprovals: string[];
  timeout: number;  // ms; 0 = no timeout
}
```

### `SafetyRule` and friends
```ts
type EnforcementPoint = 'pre' | 'post' | 'both';

interface SafetyRule {
  id: string;
  invariant: string;
  enforcementPoint: EnforcementPoint;
  severity: RuleSeverity;
}

interface SafetyViolation {
  ruleId: string;
  invariant: string;
  reason: string;
  enforcementPoint: 'pre' | 'post';
  severity: RuleSeverity;
}
```

### `Conflict` and friends
```ts
type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

type ResolutionStrategy =
  | 'consensus' | 'majority' | 'authority'
  | 'arbitration' | 'escalation';

interface Conflict {
  id: string;
  parties: string[];
  description: string;
  severity: ConflictSeverity;
}

interface ConflictResolution {
  resolution: string;
  reason: string;
  dissenters?: string[];
  strategy: ResolutionStrategy;
}
```

### `GovernanceDocument` and friends
```ts
type DocumentSectionType =
  | 'preamble' | 'article' | 'amendment'
  | 'appendix' | 'schedule' | 'other';

type DocumentStatus = 'draft' | 'proposed' | 'ratified' | 'superseded';

interface DocumentSection {
  id: string;
  title: string;
  content: string;
  type: DocumentSectionType;
}

interface GovernanceDocument {
  id: string;
  name: string;
  version: SemverVersion;
  sections: DocumentSection[];
  status: DocumentStatus;
  ratifiedAt?: string;
  supersededBy?: string;
}

interface DocumentDiff {
  added: DocumentSection[];
  removed: DocumentSection[];
  changed: Array<{ id: string; oldSection: DocumentSection; newSection: DocumentSection }>;
}
```

---

## Errors

All errors extend `ConstitutionError` and carry a stable `code` string.

| Class | Code | When |
| --- | --- | --- |
| `ConstitutionError` | `CONSTITUTION_ERROR` | Base class |
| `RuleError` | `RULE_ERROR` | Ethical rule evaluation failure |
| `PolicyError` | `POLICY_ERROR` | Policy condition parse / evaluation failure |
| `PermissionError` | `PERMISSION_ERROR` | Permission model failure (cycle, unknown role, etc.) |
| `HierarchyError` | `HIERARCHY_ERROR` | Decision hierarchy failure (cycle, unknown node, etc.) |
| `EmergencyError` | `EMERGENCY_ERROR` | Emergency state transition or procedure failure |
| `SafetyError` | `SAFETY_ERROR` | Safety invariant violation or malformed rule |
| `ConflictError` | `CONFLICT_ERROR` | Conflict resolution failure |
| `EnforcementError` | `ENFORCEMENT_ERROR` | Enforcement engine failure |
| `DocumentError` | `DOCUMENT_ERROR` | Governance document failure |

---

## Logging

### Interfaces
- `Logger` — `{ debug, info, warn, error }`.
- `LogLevel` — `'debug' | 'info' | 'warn' | 'error' | 'silent'`.

### Constants
- `SCRUBBED_FIELD_NAMES` — `['taxId', 'secret', 'token', 'apiKey', 'password']`.

### Functions
- `shouldScrubField(name: string): boolean`
- `scrubMetadata(meta: unknown): unknown`

### Classes
- `ConsoleLogger` — `new ConsoleLogger(level?: LogLevel)`. Writes JSON lines to stdout/stderr.
- `SilentLogger` — discards everything.

---

## Ethical Rules

### Constants
- `RULE_CATEGORIES` — `['harm', 'deception', 'privacy', 'fairness', 'autonomy', 'transparency']`.

### Functions
- `evaluateRule(rule: EthicalRule, context: GovernanceContext): RuleEvaluation`
- `evaluateRuleSet(rules: RuleSet, context: GovernanceContext): RuleEvaluation[]` — returns only violated rules.
- `validateRule(rule: EthicalRule): void`

### Evaluation semantics
- `forbidden: true` (prohibition): violated when the rule's action verb appears in `context.action` or `context.metadata.reason`.
- `forbidden: false` (requirement): violated when the rule's action verb does NOT appear.

The action verb is the first lowercase word in the description, after stripping leading `do not` / `must not` / `shall not` / `must` / `shall` / `should` prefixes.

---

## Policies

### Functions
- `evaluatePolicy(policy: Policy, context: GovernanceContext): PolicyEvaluation`
- `evaluatePolicySet(policies: PolicySet, context: GovernanceContext): PolicyEvaluation`
- `evaluateCondition(condition: string, context: GovernanceContext): boolean`
- `parseCondition(condition: string): AstNode` — returns the parsed AST.
- `clearConditionCache(): void`

### Condition grammar
```
expr     := or
or       := and ('OR' and)*
and      := not ('AND' not)*
not      := 'NOT' not | primary
primary  := '(' expr ')' | comparison
comparison := operand ('==' | '!=' | 'in') operand
operand  := field | literal | list
field    := 'context.' IDENT ('.' IDENT)*
literal  := STRING | NUMBER | 'true' | 'false' | 'null'
list     := '[' (literal (',' literal)*)? ']'
```

Precedence (lowest to highest): `OR` < `AND` < `NOT` < comparison. Parentheses override.

### Field resolution
- `context.subject`, `context.action`, `context.resource`, `context.timestamp` → top-level fields.
- Any other `context.<name>` → looked up in `context.metadata`.
- When a top-level field is `undefined`, the lookup falls back to `metadata.<name>`.

### `evaluatePolicySet` behavior
- Returns the action of the highest-priority matching policy.
- When two matching policies share the top priority, the more restrictive wins: `deny > require_approval > allow`.
- When no policy matches, returns `{ matched: false, action: 'allow', reason: 'no matching policy; defaulting to allow' }`.

---

## Permissions

### Constants
- `WILDCARD` — `'*'`.

### Functions
- `can(model: PermissionModel, subject: string, permission: Permission): boolean`
- `whoCan(model: PermissionModel, permission: Permission): string[]` — sorted.
- `grantRole(model: PermissionModel, subject: string, role: string): PermissionModel` — immutable.
- `revokeRole(model: PermissionModel, subject: string, role: string): PermissionModel` — immutable.
- `expandRoles(model: PermissionModel, start: string): Set<string>` — transitive closure. Throws on cycles.
- `permissionsForRole(model: PermissionModel, role: string): Set<Permission>` — includes inherited.
- `permissionMatches(granted: Permission, requested: Permission): boolean` — supports `'*'` and `'module:*'` wildcards.
- `rolesForSubject(model: PermissionModel, subject: string): string[]`
- `validatePermissionModel(model: PermissionModel): void` — checks duplicate role names, unknown parents, cycles, invalid permission strings, unknown role references in assignments.

### Wildcard semantics
- `'*'` matches every permission.
- `'module:*'` matches every action in `module`.
- Exact match: `'module:action'`.

---

## Decision Hierarchy

### Functions
- `requireNode(hierarchy: DecisionHierarchy, id: string): DecisionNode` — throws `HierarchyError` if not found.
- `escalationPath(hierarchy: DecisionHierarchy, id: string): string[]` — leaf-to-root chain (inclusive of `id`).
- `findCommonAuthority(hierarchy: DecisionHierarchy, a: string, b: string): string | undefined` — lowest common ancestor.
- `canOverride(hierarchy: DecisionHierarchy, decider: string, original: string): boolean` — `decider.authority > original.authority`.
- `ancestors(hierarchy: DecisionHierarchy, id: string): string[]` — immediate-parent-first chain (excludes `id`).
- `roots(hierarchy: DecisionHierarchy): DecisionNode[]` — nodes without parents.
- `children(hierarchy: DecisionHierarchy, id: string): DecisionNode[]` — direct children.
- `validateHierarchy(hierarchy: DecisionHierarchy): void` — checks duplicate ids, unknown parents, cycles.

---

## Emergency

### Constants
- `STATE_RANK` — `{ normal: 0, heightened: 1, emergency: 2, critical: 3 }`.
- `STATE_ORDER` — `['normal', 'heightened', 'emergency', 'critical']`.

### `class EmergencyController`
- `getState(): EmergencyState`
- `getActiveProcedure(): EmergencyProcedure | undefined`
- `getDeclaredAt(): string | undefined`
- `declareEmergency(state: EmergencyState, procedure: EmergencyProcedure): void`
- `liftEmergency(): void`
- `isActionAllowed(action: string): boolean`
- `isTimedOut(now: string): boolean`
- `onStateChange(listener: (state: EmergencyState, procedure?: EmergencyProcedure) => void): void`

### State machine
- Escalation: only one level at a time (`normal → heightened`, never `normal → emergency`).
- De-escalation: any number of levels.
- `liftEmergency()` returns to `normal`.

### Action allowlist
- Exact match: `action === entry`.
- Module wildcard: entry `'module:*'` matches every `module:<anything>`.
- Full wildcard: entry `'*'` matches every action.
- When no procedure is active (state is `normal`), all actions are allowed.

### `validateProcedure(procedure: EmergencyProcedure): void`

---

## Safety

### Constants
- `ENFORCEMENT_POINTS` — `['pre', 'post', 'both']`.

### `type SafetyPredicate`
```ts
type SafetyPredicate = (
  rule: SafetyRule,
  context: GovernanceContext,
) => { satisfied: boolean; reason?: string };
```

### `class SafetyChecker`
- `register(rule: SafetyRule, predicate: SafetyPredicate): this`
- `unregister(id: string): this`
- `list(): SafetyRule[]` — insertion order.
- `get(id: string): SafetyRule | undefined`
- `run(point: 'pre' | 'post', context: GovernanceContext): SafetyViolation[]`
- `runPre(context: GovernanceContext): SafetyViolation[]`
- `runPost(context: GovernanceContext): SafetyViolation[]`
- `assertSafe(context: GovernanceContext): SafetyViolation[]` — throws `SafetyError` when any pre-check with severity `medium+` is violated.
- `verifyInvariants(context: GovernanceContext): SafetyViolation[]` — runs every rule, regardless of enforcement point.

### `validateSafetyRule(rule: SafetyRule): void`

---

## Conflict Resolution

### Constants
- `RESOLUTION_STRATEGIES` — `['consensus', 'majority', 'authority', 'arbitration', 'escalation']`.
- `CONFLICT_SEVERITIES` — `['low', 'medium', 'high', 'critical']`.

### `interface ResolveOptions`
```ts
interface ResolveOptions {
  agreements?: string[];                       // consensus / majority
  authorities?: Record<string, number>;        // authority
  arbitrator?: string;                         // arbitration
  proposedResolution?: string;
}
```

### `class ConflictResolver`
- `resolveConflict(conflict: Conflict, strategy: ResolutionStrategy, options?: ResolveOptions): ConflictResolution`

### Strategy behavior
| Strategy | Required options | Behavior |
| --- | --- | --- |
| `consensus` | `agreements` | Resolution when all parties agree; otherwise reports dissenters. |
| `majority` | `agreements` | Resolution at `ceil(n/2)` agreements; otherwise reports dissenters. |
| `authority` | `authorities` (per party) | Resolution by the highest-authority party; others are dissenters. |
| `arbitration` | `arbitrator` | Resolution by the named arbitrator. |
| `escalation` | none | Always produces an escalation resolution. |

### `validateConflict(conflict: Conflict): void`

---

## Enforcement Engine

### `interface AuditEntry`
```ts
interface AuditEntry {
  auditId: string;
  timestamp: string;
  action: string;
  subject: string;
  allowed: boolean;
  reasons: string[];
  violations: string[];
}
```

### `class EnforcementEngine`
- `new EnforcementEngine(opts?: { requireApprovalDenies?: boolean })` — defaults to `true`.
- `registerRuleSet(ruleSet: RuleSet): this`
- `registerPolicySet(policySet: PolicySet): this`
- `registerPermissionModel(model: PermissionModel): this`
- `registerSafetyChecker(checker: SafetyChecker): this`
- `registerSafetyChecker(rules: Array<{ rule: SafetyRule; predicate: SafetyPredicate }>): this` — overload that builds a fresh `SafetyChecker`.
- `evaluate(action: string, subject: string, context: GovernanceContext): EnforcementResult`
- `getAuditLog(): AuditEntry[]` — defensive copy.
- `getAuditEntry(id: string): AuditEntry | undefined`
- `clearAuditLog(): void`

### Evaluation order
1. **Permissions** — `can(subject, action)` must be `true`.
2. **Policies** — the highest-priority matching policy decides. `deny` blocks. `require_approval` blocks by default (configurable).
3. **Safety (pre)** — any pre/both rule with severity `medium+` that fails blocks. Lower-severity violations are advisory.
4. **Ethical rules** — any violated rule blocks.

If all four pass, `allowed = true`. Every evaluation produces an `AuditEntry`.

---

## Governance Documents

### Constants
- `SECTION_TYPES` — `['preamble', 'article', 'amendment', 'appendix', 'schedule', 'other']`.
- `DOCUMENT_STATUSES` — `['draft', 'proposed', 'ratified', 'superseded']`.

### Functions
- `parseVersion(s: string): SemverVersion`
- `formatVersion(v: SemverVersion): string`
- `compareVersions(a: SemverVersion, b: SemverVersion): number` — negative when `a < b`, positive when `a > b`, 0 when equal. Prerelease versions are lower than their corresponding release.
- `isRatified(doc: GovernanceDocument): boolean`
- `ratify(doc: GovernanceDocument, at?: string): GovernanceDocument` — immutable. Throws if already ratified or superseded.
- `diffDocuments(oldDoc: GovernanceDocument, newDoc: GovernanceDocument): DocumentDiff`
- `supersede(oldDoc: GovernanceDocument, newDoc: GovernanceDocument): { superseded: GovernanceDocument; successor: GovernanceDocument }` — `oldDoc` must be ratified; `newDoc.version` must be strictly higher than `oldDoc.version`; `newDoc.status` must be `'proposed'` or `'ratified'`.
- `validateSection(section: DocumentSection): void`
- `validateDocument(doc: GovernanceDocument): void` — checks ids, version, sections, status, `ratifiedAt` consistency.

### Lifecycle
```
draft → proposed → ratified → superseded
                  ↑                ↑
              ratify()        supersede()
```
