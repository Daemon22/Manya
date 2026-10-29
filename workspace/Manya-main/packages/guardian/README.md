# @manya/guardian

Holds the standing rules — ethical boundaries, family rules, emergency
protocols, decision precedence — and enforces them, with a tamper-evident
trail of every check.

Composed from `@manya/vault` (stores the rules themselves), `@manya/shield`
(the actual access-control enforcement engine), and `@manya/ledger`
(records every allow/deny decision, independent of any single agent's
memory).

## Usage

```js
import { guardian } from '@manya/guardian';

const house = guardian.createGuardian('household');

guardian.setPrinciple(house, 'quiet-hours', { start: '21:00', end: '07:00' });
guardian.grantRole(house, 'atlas', 'operator', [
  { resource: 'device:*', actions: ['provision'] },
]);

const result = guardian.checkAction(house, 'atlas', 'device:phone-1', 'provision');
// { allowed: true, ... } — and this decision is now in the guardian's ledger.

guardian.verifyAuditTrail(house); // { valid: true, ... }
```

## Why this composition

Guardian doesn't reimplement access control or storage — it owns the
*policy content* (what the rules say) and the *audit record* (what was
decided and when), delegating the actual "is this allowed" evaluation to
`shield`, which already does that correctly and is already tested.
