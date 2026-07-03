# Task 5 — hawk-tool-creator

## Summary
Created the `@manya/hawk` tool from scratch at `/home/z/my-project/upload/Manya-main-extracted/Manya-main/tools/hawk/`.

## What was built
A device detection and environment monitoring engine for the Manya ecosystem with 4 public APIs:
- `hawk.detect()` — device type, brand, model, OS, browser, engine from UA + feature checks
- `hawk.fingerprint()` — privacy-respecting fingerprint via canvas, WebGL, audio, fonts, screen, timezone signals
- `hawk.monitor(callback)` — subscribe to visibility, network, connection, battery changes
- `hawk.snapshot()` — all three combined in one call

## Test results
All 18 tests pass using `node --test`.

## Source footprint
284 lines across 4 JS source files. Zero dependencies. ESM module.
