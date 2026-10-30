# Contributing to @manya-os/cortex

## Code style
- TypeScript strict mode mandatory.
- `.js` import specifiers in source.
- No external runtime dependencies — only Node built-ins.
- All public symbols must have JSDoc comments.

## Adding a new tool
1. Implement the `Tool` interface (name, description, handler).
2. Register via `cortex.registerTool(tool)` or `registry.register(tool)`.
3. Add tests for the tool's behavior.
4. Document the tool's expected input/output in `docs/API.md`.

## Adding a new intent type
1. Add the intent to the `Intent` union in `src/types.ts`.
2. Add cues to `INTENT_CUES` in `src/router/router.ts`.
3. Add a default component mapping in `INTENT_TO_COMPONENT`.
4. Add tests covering classification + routing.

## Retry policy tuning
- `maxAttempts` — total tries (including the first).
- `backoff` — 'fixed', 'linear', or 'exponential'.
- `baseDelayMs` — delay before the first retry.
- `maxDelayMs` — cap on delay between retries.
- `retryableErrors` — substring matches; empty = retry everything.

## Licensing
Apache-2.0, attributed to the Manya Hael Foundation. See root [CONTRIBUTING.md](../../CONTRIBUTING.md).
