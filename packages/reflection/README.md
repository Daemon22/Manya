# @manya/reflection

Evaluates outputs, critiques plans, and turns failures into lessons that
force a revised plan — not just a logged note nobody reads.

Composed from `@manya/memory` (where lessons live as semantic facts) and
`@manya/cortex` (asked to re-plan once a lesson has been learned).

## Usage

```js
import { memory } from '@manya/memory';
import { createCortex } from '@manya/cortex';
import { reflection } from '@manya/reflection';

const store = memory.createMemoryStore('ara');
const cortex = createCortex(store);
const refl = reflection.createReflection(store, cortex);

reflection.evaluateAgainstIntent(refl, 'schedule a dentist appointment', 'Booked for Tuesday.');
// { passes: true, ... }

const { lesson, revisedPlan } = reflection.learnFromFailure(
  refl,
  'derive a key',
  'no passphrase was provided'
);
// lesson is now in semantic memory, and revisedPlan is a fresh cortex.plan()
// call made with that lesson already recorded.
```

## Why this composition

The point of "learning from failure" is that the next plan is actually
different. Reflection doesn't just write the lesson down — it immediately
calls back into Cortex to produce a new plan, so the lesson has a chance to
change the confidence score and steps of what happens next.
