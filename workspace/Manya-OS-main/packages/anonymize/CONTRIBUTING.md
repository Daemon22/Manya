# Contributing to @manya-os/anonymize

Thank you for considering a contribution to `@manya-os/anonymize`. This package is part of the MANYA Intelligence OS, stewarded by the Manya Hael Foundation.

## Code style

- TypeScript strict mode is mandatory.
- All public symbols must have JSDoc comments.
- Use `.js` import specifiers in source (NodeNext convention).
- No external runtime dependencies — only Node `crypto`.
- All detectors must be pure functions (no I/O, no global state).

## Tests

- Every public function must have at least one positive and one negative test.
- Luhn, SHA-256, and other crypto primitives must be tested with known vectors.
- The `Anonymizer` end-to-end tests must exercise at least one finding per detector category.

## Adding a new detector

1. Implement the `Detector` interface in `src/detectors/`.
2. Add it to the appropriate `ALL_*_DETECTORS` array.
3. Add at least 2 unit tests (positive + negative).
4. Update `docs/API.md` and `README.md` detector table.

## Adding a new redactor

1. Implement the `Redactor` interface in `src/redactors/`.
2. Register it in `redactorForStrategy` in `src/anonymizer.ts`.
3. Add unit tests for behavior and edge cases (empty, single-char, etc.).
4. Update docs.

## Security review

Any change to detection logic or redaction strategies must be reviewed for:
- False negatives (missed PII)
- False positives (over-redaction of benign content)
- Residual risk (does the output still leak the finding?)

The Validator must always pass on outputs produced by the pipeline.

## Licensing

All contributions are licensed under Apache-2.0 and attributed to the Manya Hael Foundation. See the root [CONTRIBUTING.md](../../CONTRIBUTING.md) for the full contributor agreement.
