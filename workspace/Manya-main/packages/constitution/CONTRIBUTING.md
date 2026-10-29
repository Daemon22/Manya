# Contributing to @manya/constitution

## Code style
- TypeScript strict mode mandatory.
- `.js` import specifiers in source (NodeNext convention).
- No external runtime dependencies — only Node built-ins.
- All public symbols have JSDoc comments.
- All errors extend `ConstitutionError` and carry a stable `code` string.
- Immutability: APIs that mutate a model (e.g. `grantRole`, `revokeRole`, `ratify`, `supersede`) return a new copy rather than mutating in place.

## Testing
- Run the suite: `npx jest packages/constitution --no-coverage` from the monorepo root.
- Type-check: `npx tsc --noEmit -p packages/constitution/tsconfig.json`.
- Every new feature MUST ship with at least one positive and one negative test.
- Add end-to-end tests to the `end-to-end: full constitution evaluation` describe block when adding new enforcement-layer behavior.

## Adding a new policy condition operator
1. Extend the tokenizer in `src/policies/policies.ts` to recognize the new operator (e.g. `>=`, `contains`).
2. Add the operator to the parser's `parseComparison` (and a new `op` literal in the `cmp` AST node if needed).
3. Extend the evaluator's `cmp` case.
4. Add unit tests in `tests/constitution.spec.ts` (in the `policy condition parser` describe block).
5. Update the grammar in `README.md` and `docs/API.md`.

## Adding a new ethical rule category
1. Add the new value to `RuleCategory` in `src/types.ts`.
2. Add the new value to `RULE_CATEGORIES` in `src/rules/rules.ts`.
3. Add a test rule in `tests/constitution.spec.ts` (in the `ethical rules` describe block).
4. Update `docs/API.md`.

## Adding a new conflict resolution strategy
1. Add the new value to `ResolutionStrategy` in `src/types.ts`.
2. Add the new value to `RESOLUTION_STRATEGIES` in `src/conflict/conflict.ts`.
3. Implement a private `resolveX` method on `ConflictResolver` and dispatch from `resolveConflict`.
4. Add a test in `tests/constitution.spec.ts` (in the `conflict resolution` describe block).

## Adding a new safety rule enforcement point
The `EnforcementPoint` union is `'pre' | 'post' | 'both'`. To add a new point (e.g. `'commit'`):
1. Update `EnforcementPoint` in `src/types.ts`.
2. Update `ENFORCEMENT_POINTS` in `src/safety/safety.ts`.
3. Update `appliesAt` in `src/safety/safety.ts`.
4. Add a `runCommit` method to `SafetyChecker` if appropriate, or wire it into `EnforcementEngine`.

## Keeping the constitution current
- Governance documents are versioned. Use `supersede` to retire an old ratified document and replace it with a higher-version one.
- Always run `validateDocument` before storing or publishing a `GovernanceDocument`.
- The runtime `EnforcementEngine` is intentionally layer-agnostic — it does not enforce that the registered rule/policy/permission/safety sets come from a ratified document. That mapping is the caller's responsibility.

## Licensing
Apache-2.0, attributed to the Manya Hael Foundation. See root [CONTRIBUTING.md](../../CONTRIBUTING.md).
