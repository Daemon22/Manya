# @manya/economy

Tracks and enforces a shared resource budget — tokens, credits, API calls,
whatever unit you give it — with a tamper-evident usage ledger.

Composed from `@manya/vault` (holds the balance), `@manya/ledger` (records
every usage/refusal as a tamper-evident event), and `@manya/memory` (records
the same events episodically for the spending agent).

Economy does **not** hardcode model or provider tier names — you supply
your own tier map. Those details change too often, and per-vendor, for this
package to guess at.

## Usage

```js
import { memory } from '@manya/memory';
import { economy } from '@manya/economy';

const store = memory.createMemoryStore('household');
const budget = economy.createEconomy('household', store, 1_000_000);

if (economy.enforceBudget(budget, 5000)) {
  economy.trackUsage(budget, 'ara', 5000);
}

const tier = economy.routeTier(budget, 'high', {
  low: 'fast-tier',
  medium: 'balanced-tier',
  high: 'best-tier',
});

economy.verifyLedger(budget); // { valid: true, ... }
```

## Why this composition

`@manya/ledger` already pairs `stamp`'s hash chaining with `unify`'s event
bus to produce a tamper-evident, subscribable audit trail — that's exactly
what a spend ledger needs, so Economy reuses it rather than re-deriving the
same pattern with its own chain logic.
