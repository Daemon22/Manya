# Contributing to @manya/council

## Code style
- TypeScript strict mode mandatory.
- `.js` import specifiers in source (NodeNext convention).
- No external runtime dependencies — only Node built-ins.
- All public symbols have JSDoc comments.
- All errors extend `CouncilError` and carry a stable `code` string.
- Immutability: APIs that mutate state (e.g. `register`, `submit`, `record`) return `this` for chaining but mutate the receiver; APIs that produce a result (e.g. `build`, `synthesize`, `buildReport`) return fresh objects and do not mutate their inputs.

## Testing
- Run the suite: `npx jest packages/council --no-coverage` from the monorepo root.
- Type-check: `npx tsc --noEmit -p packages/council/tsconfig.json`.
- Every new feature MUST ship with at least one positive and one negative test.
- Add end-to-end coverage to the `end-to-end: full council pipeline` describe block when adding a new stage or wiring.

## Adding a new conflict detection rule
1. Add the new value to `ConflictType` in `src/types.ts`.
2. Add the new value to `CONFLICT_TYPES` in `src/conflict/conflict.ts`.
3. Add a pairwise detection branch inside `ConflictDetector.detect`. Use the shared helpers in `src/util.ts` (`tokenize`, `tokenSet`, `jaccard`, `polarity`) for any text comparison. Compute `severity` via `severityFor` for consistency.
4. Construct a stable, deterministic id (e.g. `conflict-<type>-<aId>-<bId>`).
5. Add unit tests in `tests/council.spec.ts` (in the `conflict` describe block): at least one positive test that triggers the new conflict type and one negative test that does not.
6. Update `docs/API.md` and the conflict-thresholds table in `README.md`.

## Adding a new consensus level
1. Add the new value to `ConsensusLevel` in `src/types.ts`.
2. Update `classifyConsensus` in `src/synthesizer/synthesizer.ts` with the condition for the new level.
3. Add unit tests in `tests/council.spec.ts` (in the `synthesizer > classifyConsensus` describe block) covering both the new level and the levels immediately adjacent to it.
4. Update `docs/API.md` and the consensus-level classification table in `README.md`.

## Adding a polarity marker
1. Add the word (in its stem form, e.g. `'endorse'`, not `'endorsed'`) to `POSITIVE_MARKERS` or `NEGATIVE_MARKERS` in `src/util.ts`. The light stemmer in `stem()` will normalize `'endorsing'`, `'endorsed'`, `'endorses'` back to `'endorse'`.
2. Add a test in `tests/council.spec.ts` that submits an analysis using the new marker and asserts the expected polarity (via the consensus builder's decision direction, or via conflict detection).

## Adding a new debate-validation rule
1. Add the check to `DebateFacilitator.submitRound` (or `open` / `conclude` as appropriate). Throw `DebateError` with a clear message.
2. Add a positive test (the rule does not reject valid input) and a negative test (the rule rejects invalid input) in `tests/council.spec.ts` (in the `debate` describe block).

## Tuning the text utilities
- `STOP_WORDS`, `POSITIVE_MARKERS`, and `NEGATIVE_MARKERS` are exported from `src/util.ts`. They are intentionally short and conservative. When adding entries, prefer stems (e.g. `'recommend'` rather than `'recommends'`) so the stemmer handles inflections.
- The stemmer in `stem()` only strips `'ing'`, `'ed'`, and a trailing `'s'` from tokens of length > 4. Do not extend it without adding tests; aggressive stemming can collapse unrelated words (e.g. `'pass'` → `'pas'`).

## Licensing
Apache-2.0, attributed to the Manya Hael Foundation. See root [CONTRIBUTING.md](../../CONTRIBUTING.md).
