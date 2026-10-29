# @manya/constitution

> Governance substrate for the MANYA Intelligence OS — ethical rules, operational policies, permission models (RBAC with inheritance), decision hierarchies, emergency procedures, safety invariants, conflict resolution, runtime enforcement, and versioned governance documents.

`@manya/constitution` is the governance layer of the **MANYA Intelligence OS** — a sovereign, modular, local-first intelligence operating system conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the **Manya Hael Foundation**.

The package provides a small, dependency-free governance engine that binds ethical rules, operational policies, role-based permissions, decision hierarchies, emergency procedures, safety invariants, and conflict resolution into a single runtime enforcement point with a full audit log. It also defines a versioned governance-document format with diffing and supersession semantics, so an organization can author, ratify, and evolve its own constitution in code.

---

## Vision

The Manya Hael Foundation stewards the MANYA Intelligence OS as a long-horizon, mission-driven project. `@manya/constitution` extends that sovereignty into the governance domain: **your rules, your policies, your authority structure — yours alone, auditable and machine-checkable.**

- **Sovereign.** No network calls. Every rule, policy, and permission is local and configurable.
- **Auditable.** Every enforcement evaluation produces a structured `AuditEntry` with a stable id, reasons, and violations.
- **Layered.** Ethics → policies → permissions → safety → audit. Each layer can be used independently or wired together via `EnforcementEngine`.
- **Expressible.** The policy condition language supports `==`, `!=`, `in`, `AND`, `OR`, `NOT`, and parentheses — without `eval()`.
- **Honest.** Decisions are deterministic and reproducible: identical inputs produce identical outputs.

---

## Features

| Area | What you get |
| --- | --- |
| **Ethical rules** | `EthicalRule` (prohibition or requirement), 6 categories (harm, deception, privacy, fairness, autonomy, transparency), 5 severity levels. `evaluateRule` / `evaluateRuleSet`. |
| **Policies** | `Policy` (condition + action + priority), `PolicySet`. Hand-written recursive-descent parser supporting `==`, `!=`, `in [...]`, `AND`, `OR`, `NOT`, and parentheses. `evaluatePolicySet` returns highest-priority matching action (with restrictiveness tiebreak). |
| **Permissions** | `PermissionModel` with `Role` (inheritance + wildcards `module:*` and `*`). `can`, `whoCan`, `grantRole`, `revokeRole`, `validatePermissionModel` with cycle detection. |
| **Hierarchy** | `DecisionHierarchy` tree of `DecisionNode`s. `escalationPath`, `findCommonAuthority` (lowest common ancestor), `canOverride` (authority comparison), `ancestors`, `roots`, `children`, `validateHierarchy` with cycle detection. |
| **Emergency** | `EmergencyController` with 4 states (`normal` → `heightened` → `emergency` → `critical`). One-level-at-a-time escalation, any-level de-escalation, action allowlists with `*` and `module:*` wildcards, timeouts, state-change listeners. |
| **Safety** | `SafetyChecker` registering `SafetyRule`s with `enforcementPoint: 'pre' \| 'post' \| 'both'`. `runPre`, `runPost`, `assertSafe` (throws on medium+ violations), `verifyInvariants`. |
| **Conflict** | `ConflictResolver` with 5 strategies: `consensus`, `majority`, `authority`, `arbitration`, `escalation`. Returns `ConflictResolution` with reason and dissenters. |
| **Enforcement** | `EnforcementEngine` binding rules + policies + permissions + safety. `evaluate(action, subject, context)` returns `EnforcementResult` with `allowed`, `reasons[]`, `violations[]`, and `auditId`. Immutable audit log. |
| **Documents** | `GovernanceDocument` with semver versioning, 4 lifecycle statuses (draft → proposed → ratified → superseded), section diffing, ratification, and supersession. |
| **Logging** | `Logger` interface, `ConsoleLogger` with secret-scrubbing, `SilentLogger`. |

---

## Install

```bash
npm install @manya/constitution
```

Requires Node.js 18+.

---

## Quick start

### 1. Evaluate a single ethical rule

```ts
import { evaluateRule } from '@manya/constitution';

const result = evaluateRule(
  {
    id: 'harm.no-physical-harm',
    name: 'No physical harm',
    description: 'do not harm a person',
    category: 'harm',
    forbidden: true,
    severity: 'critical',
  },
  { subject: 'agent', action: 'harm the user', timestamp: new Date().toISOString() },
);
console.log(result.violated); // true
console.log(result.reason);   // prohibition "harm.no-physical-harm" triggered: action matches "harm"
```

### 2. Build a permission model with role inheritance

```ts
import { can, whoCan } from '@manya/constitution';

const model = {
  roles: [
    { name: 'user', permissions: ['data:read'] },
    { name: 'operator', permissions: ['data:write'], inherits: ['user'] },
    { name: 'admin', permissions: ['data:delete'], inherits: ['operator'] },
  ],
  assignments: [
    { subject: 'alice', role: 'admin' },
    { subject: 'bob', role: 'user' },
  ],
};

can(model, 'alice', 'data:read');   // true  (admin inherits user)
can(model, 'bob', 'data:delete');   // false (user has no delete)
whoCan(model, 'data:read');         // ['alice', 'bob']
```

### 3. Use the enforcement engine end-to-end

```ts
import {
  EnforcementEngine, SafetyChecker,
} from '@manya/constitution';

const safety = new SafetyChecker();
safety.register(
  { id: 'no-read-in-emergency', invariant: 'context.metadata.emergency != true',
    enforcementPoint: 'pre', severity: 'critical' },
  (rule, ctx) => ({
    satisfied: ctx.metadata?.emergency !== true,
    reason: 'reads forbidden during emergency',
  }),
);

const engine = new EnforcementEngine()
  .registerPermissionModel(model)         // from example 2
  .registerPolicySet({
    id: 'policies',
    policies: [
      { id: 'deny-delete', name: 'deny delete', description: 'd',
        condition: 'context.action == "data:delete"', action: 'deny', priority: 100 },
    ],
  })
  .registerSafetyChecker(safety);

const r = engine.evaluate(
  'data:delete', 'alice',
  { subject: 'alice', action: 'data:delete', timestamp: new Date().toISOString() },
);
console.log(r.allowed);    // false (policy denies)
console.log(r.violations); // ['policy deny-delete denied: ...']
console.log(r.auditId);    // 'audit-...'
```

### 4. Author and supersede a governance document

```ts
import { ratify, supersede, diffDocuments } from '@manya/constitution';

const v1 = ratify({
  id: 'constitution-v1', name: 'Constitution',
  version: { major: 1, minor: 0, patch: 0 },
  status: 'proposed',
  sections: [
    { id: 'art-1', title: 'Article 1', content: 'Preamble', type: 'preamble' },
  ],
}, '2024-01-15T00:00:00.000Z');

const v2 = {
  ...v1,
  id: 'constitution-v2',
  version: { major: 2, minor: 0, patch: 0 },
  sections: [
    ...v1.sections,
    { id: 'art-2', title: 'Article 2', content: 'Rights', type: 'article' },
  ],
};

const diff = diffDocuments(v1, v2);
console.log(diff.added); // [Article 2]

const { superseded, successor } = supersede(v1, v2);
console.log(superseded.status);        // 'superseded'
console.log(superseded.supersededBy);  // 'constitution-v2'
```

---

## Configuration

### Policy condition language

The condition expression grammar (BNF-ish):

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

Fields are resolved against the `GovernanceContext`:
- `context.subject`, `context.action`, `context.resource`, `context.timestamp` → top-level fields.
- Any other `context.<name>` → looked up in `context.metadata`.
- If a top-level field is `undefined`, the lookup falls back to `metadata.<name>`.

### Permission wildcards

- `'*'` matches every permission.
- `'module:*'` matches every action in `module`.
- Exact match: `'module:action'`.

### Emergency state machine

```
normal ⇄ heightened ⇄ emergency ⇄ critical
```

- Escalation: only one level at a time (`normal → heightened`, never `normal → emergency`).
- De-escalation: any number of levels (`critical → heightened` is allowed).
- Use `liftEmergency()` to return to `normal`.

### Safety enforcement points

| Point | When to use |
| --- | --- |
| `pre` | Before an action runs. Blocks the action when violated. |
| `post` | After an action runs. Used for invariant verification. |
| `both` | Run at both pre and post. |

`assertSafe()` throws `SafetyError` when any pre-check with severity `medium` or higher is violated. Lower-severity violations are returned but do not block.

### Enforcement evaluation order

1. **Permissions** — `can(subject, action)` must be `true`.
2. **Policies** — the highest-priority matching policy decides. `deny` blocks. `require_approval` blocks by default (configurable via `{ requireApprovalDenies: false }`).
3. **Safety (pre)** — any pre/both rule with severity `medium+` that fails blocks. Lower-severity violations are recorded as advisory reasons.
4. **Ethical rules** — any violated rule blocks.

If all four pass, `allowed = true`. Every evaluation produces an `AuditEntry`.

---

## Extending

### Add a custom ethical rule category

`RuleCategory` is a closed union (`'harm' | 'deception' | 'privacy' | 'fairness' | 'autonomy' | 'transparency'`). To add a new category:

1. Update `RuleCategory` in `src/types.ts`.
2. Add the new category to `RULE_CATEGORIES` in `src/rules/rules.ts`.
3. Add unit tests in `tests/constitution.spec.ts`.

### Add a custom policy condition operator

1. Extend the tokenizer in `src/policies/policies.ts` to recognize the new operator (e.g. `>=`).
2. Add an `AstNode` variant (e.g. `{ kind: 'cmp', op: '>=', left, right }`).
3. Extend the parser's `parseComparison` to consume the operator.
4. Extend the evaluator's `cmp` case.
5. Add unit tests.

### Add a custom conflict resolution strategy

1. Add the strategy to `ResolutionStrategy` in `src/types.ts`.
2. Add it to `RESOLUTION_STRATEGIES` in `src/conflict/conflict.ts`.
3. Add a private `resolveX` method to `ConflictResolver` and dispatch from `resolveConflict`.

---

## Security notes

- **Local-only.** No data leaves the host process.
- **No `eval`.** The policy condition language is parsed by a hand-written recursive-descent parser; arbitrary JavaScript cannot be executed via a condition string.
- **No PII in logs.** `taxId`, `secret`, `token`, `apiKey`, `password` are scrubbed by `ConsoleLogger`.
- **Audit trail.** Every enforcement evaluation is recorded with a stable audit id.
- **Defense in depth.** Enforcement evaluates permissions, policies, safety, AND ethics — a single layer's failure does not compromise the others.

For threat models, see [SECURITY.md](./SECURITY.md) and the root [SECURITY.md](../../SECURITY.md).

---

## Documentation

- [docs/API.md](./docs/API.md) — full TypeScript API reference.
- [CHANGELOG.md](./CHANGELOG.md) — release history.
- [CONTRIBUTING.md](./CONTRIBUTING.md) — package-specific contributor notes.
- [SECURITY.md](./SECURITY.md) — package-specific security surface.
- [LICENSE](./LICENSE) — Apache-2.0.

---

## License

Apache-2.0. Copyright 2024 Manya Hael Foundation. All rights reserved.

Conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the Manya Hael Foundation.
