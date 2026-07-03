# Task 3-4: CLI and API Route Upgrades

## Agent: Subagent

## Summary
Upgraded Craft encryption tool's CLI and API routes with passphrase strength metering, elapsed time display, compression ratio visualization, CORS support, and request tracing.

## Files Modified
1. `src/lib/craft/cli/index.ts` — 4 CLI upgrades
2. `src/app/api/craft/nano/route.ts` — CORS + OPTIONS + processing time + request ID
3. `src/app/api/craft/macro/route.ts` — CORS + OPTIONS + processing time + request ID

## Part A: CLI Upgrades

### 1. Passphrase Strength Meter
- `ratePassphrase()` rates passphrases: <12=Invalid, 12-15=Basic, 16-23=Strong, 24+=Fortress
- Considers unique chars and character mix (upper/lower/digits/symbols)
- `displayStrengthMeter()` renders: `✓ Passphrase strength: ████████░░ Strong (18 chars)`
- Shown after Nano and Macro operations

### 2. Elapsed Time Display
- `performance.now()` wraps Nano and Macro calls
- Displays: `✓ Completed in 1.23s`

### 3. Nano Compression Ratio Bar
- 20-segment visual bar when spaceSavedPercent > 0
- Format: `✓ Compression:  [████████████████░░░░] 82.3% smaller`

### 4. Better Short Passphrase Error
- Shows char count: `Passphrase must be at least 12 characters (yours is 8).`
- Shows strength meter with hint for improvement

## Part B: API Route Upgrades

### Both Nano and Macro routes:
- CORS headers: `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type`
- OPTIONS handler: returns 204 with CORS headers
- `X-Craft-Processing-Time`: milliseconds measured with `performance.now()`
- `X-Craft-Request-Id`: random UUID via `crypto.randomUUID()`
- All responses (success + error) include CORS headers, request ID, and processing time

## Verification
- ESLint: passes with no errors
- TypeScript: no new errors (pre-existing Buffer→BodyInit and compress7 type errors remain)
- Only 3 files modified as specified
