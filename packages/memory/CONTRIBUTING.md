# Contributing to @manya-os/memory

## Code style
- TypeScript strict mode mandatory.
- `.js` import specifiers in source.
- No external runtime dependencies — only Node built-ins (crypto, zlib).
- All public symbols must have JSDoc comments.

## Adding a new memory subsystem
1. Create `src/<name>/<name>.ts` with the new class.
2. Create `src/<name>/index.ts` as a barrel.
3. Add the subsystem to `MemorySystem` in `src/memory.ts`.
4. Add the subsystem's records to `MemorySnapshot` in `src/types.ts`.
5. Update `snapshot()`, `restore()`, `synchronize()`.
6. Add unit tests.
7. Update `docs/API.md` and `README.md`.

## Aging policy tuning
- `workingTtlMs` — short (minutes).
- `episodicMaxCount` — large (10k+).
- `episodicPruneThreshold` — importance below which events are pruned.
- `longtermCompressAfterDays` — age at which low-access records are compressed.

## Licensing
Apache-2.0, attributed to the Manya Hael Foundation. See root [CONTRIBUTING.md](../../CONTRIBUTING.md).
