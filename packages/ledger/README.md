# @manya/ledger

A federated, tamper-evident audit trail. `unify`'s event bus already routes
events across the mesh; `stamp` already produces tamper-evident hash chains.
Ledger wires the two together so every event that gets recorded is both
delivered live *and* becomes part of a permanent, independently verifiable
history.

## Quick Start

```js
import { ledger } from '@manya/ledger'

const led = ledger.create({ name: 'deploys' })

ledger.onTopic(led, 'deploy.completed', (event) => {
  console.log('shipped:', event.payload)
})

ledger.record(led, 'deploy.completed', {
  sourceToolId: 'ci',
  payload: { version: '1.4.0', commit: 'abc123' },
})

ledger.verify(led)
// { valid: true, brokenAt: null, errors: [] }
```

If anyone tampers with a past entry, `ledger.verify` will report exactly
where the chain breaks.

## Why not just log to a file?

A log file can be edited after the fact with no trace. Each entry in a
ledger chain incorporates the hash of the entry before it, so altering
anything upstream breaks every hash downstream of it — the tampering is
structurally detectable, not just policy-forbidden.

## License

MIT
