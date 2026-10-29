# Contributing to @manya/contracts

## Code style
- TypeScript strict mode mandatory.
- `.js` import specifiers in source (NodeNext convention).
- No external runtime dependencies — only Node built-ins.
- Every public symbol needs a JSDoc comment.
- Validation routines return `{ valid, errors }` rather than throwing on a bad value; only structural defects (e.g. unparseable schema) raise typed errors.

## Testing
- Tests use `jest` + `ts-jest`. Import from `'../src'`.
- Add at least one positive and one negative test for every new public behavior.
- Run from monorepo root:
  ```bash
  npx jest packages/contracts --no-coverage
  npx tsc --noEmit -p packages/contracts/tsconfig.json
  ```

## Adding a new schema type
1. Add the literal to the `SchemaType` union in `src/types.ts`.
2. Add it to `SCHEMA_TYPES` in `src/schema/schema.ts`.
3. Extend `compileField` validation (any required extra fields, e.g. `of` for arrays).
4. Add a `case` to the `validateField` switch.
5. Update `src/schema/index.ts`, `src/index.ts`, `docs/API.md`, and the README table.
6. Add unit tests covering at least one passing and one failing value.

## Adding a new compatibility rule
1. If a new `BreakingChange.type` literal is needed, add it to the `BreakingChange` type in `src/types.ts`.
2. Push a new `BreakingChange` to the `breakingChanges` array in `checkBackwardCompat` (`src/compatibility/compatibility.ts`).
3. Document the new literal in `docs/API.md` and add a test.

## Adding a new boundary-policy rule shape
1. Extend `BoundaryRule` in `src/types.ts` if new fields are needed.
2. Update `matchRule` specificity ordering in `src/boundaries/boundaries.ts`.
3. Add tests for the new rule shape and its interaction with `defaultAllow`.

## Licensing
Apache-2.0, attributed to the Manya Hael Foundation. See root [CONTRIBUTING.md](../../CONTRIBUTING.md).
