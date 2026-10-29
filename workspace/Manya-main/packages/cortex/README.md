# @manya/cortex

A reasoning fabric, not another agent.

Cortex doesn't answer questions itself. It decides who should — by asking
`@manya/unify`'s mesh which already-registered tool owns the capability a
task needs, gating dispatch through `@manya/shield`, remembering every
decision through `@manya/memory`, and chaining every decision into its own
tamper-evident trail with `@manya/stamp`.

## Usage

```js
import { memory } from '@manya/memory';
import { unify } from '@manya/unify';
import { cortex } from '@manya/cortex';

// Tools register themselves with the mesh as they come online.
unify.registerTool({
  manifest: { id: 'forge', owns: ['keyDerivation'] },
  api: { deriveKey: (passphrase) => derive(passphrase) },
});

const store = memory.createMemoryStore('ara');
const brain = cortex.createCortex(store);

// Let atlas provision devices.
cortex.authorize(brain, 'atlas', 'operator', [
  { resource: 'device:*', actions: ['provision'] },
]);

const result = cortex.plan(brain, 'derive a key for the new device', {
  capability: 'keyDerivation',
  requesterId: 'atlas',
  resource: 'device:phone-1',
  action: 'provision',
});
// { intent: 'execution', owner: 'forge', authorized: true, confidence: 0.8, ... }

if (result.authorized) {
  cortex.dispatchPlan(brain, result, 'keyDerivation', 'deriveKey', ['a passphrase']);
}
```

## Why this composition

- **"Who should solve this?"** is answered by `unify.route`/`unify.dispatch`
  against the mesh's existing capability registry — Cortex doesn't keep a
  second list of who-does-what.
- **"What confidence do we have?"** blends whether a capability is actually
  registered right now, whether the requester is authorized, and whether
  memory already has relevant episodes — not a guess.
- **Every decision is remembered twice, for different reasons**: once in the
  bound memory store's episodic log (so other reasoning can recall *why* a
  plan was made), and once in Cortex's own `stamp`-chained decision trail
  (so the planning process itself can be audited independent of memory).
- **Dispatch never bypasses authorization**, even if a caller forgets to
  check `plan.authorized` — `dispatchPlan` refuses on its own.
