# Contributing to @manya/customs-shield

## Code style
- TypeScript strict mode mandatory.
- `.js` import specifiers in source.
- No external runtime dependencies — only Node `crypto`.
- All sanctions/rule/restriction data is data-driven and overridable.

## Adding a new compliance check
1. Add the rule type to `src/types.ts`.
2. Implement the check in `src/compliance/rules.ts` or `src/restrictions/rules.ts`.
3. Wire it into `CustomsShield.screen()` in `src/shield.ts`.
4. Add unit tests covering at least one positive and one negative case.
5. Update `docs/API.md` and `README.md`.

## Keeping sanctions lists current
- The built-in list is a starter only.
- Production deployments MUST subscribe to OFAC SDN, EU Consolidated, UN Security Council, and UK OFSI lists and call `setSanctionsList` on startup.
- Update `HIGH_RISK_TRANSSHIPMENT` annually based on FATF and customs authority guidance.

## Licensing
Apache-2.0, attributed to the Manya Hael Foundation. See root [CONTRIBUTING.md](../../CONTRIBUTING.md).
