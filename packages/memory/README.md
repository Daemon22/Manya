# @manya/memory

A true memory engine — not just a vector database.

`@manya/memory` composes three existing Manya tools into five distinct memory
types, so different intelligences in the ecosystem can share memory without
sharing everything.

| Memory type | Backed by | Lifetime |
|---|---|---|
| **working** | in-process `Map` with TTL | seconds to minutes |
| **episodic** | `@manya/stamp` hash chain | append-only, tamper-evident |
| **semantic** | in-process `Map` | until overwritten |
| **procedural** | in-process `Map` of functions | process lifetime |
| **archival** | `@manya/vault` | encrypted, long-term |

Sharing across intelligences happens over `@manya/unify`'s event bus, and
only on channels you explicitly publish to with `shareOn`. Nothing leaves a
memory store implicitly.

## Usage

```js
import { memory } from '@manya/memory';

const store = memory.createMemoryStore('ara');

// Episodic — what happened
memory.remember(store, 'ara', 'noticed the front door unlocked');
memory.verifyEpisodicIntegrity(store); // { valid: true, ... }

// Working — short-lived context
memory.rememberWorking(store, 'current-task', { step: 'confirm with owner' }, 60_000);

// Semantic — learned facts
memory.learnFact(store, 'owner', 'prefers texts over calls after 9pm', 0.95);

// Procedural — callable skills
memory.learnSkill(store, 'summarize', (text) => text.slice(0, 140));

// Archival — encrypted long-term storage
memory.archive(store, 'family-rules', { quietHours: '21:00-07:00' });

// Selective sharing — only subscribers of this exact channel see it
memory.subscribeOn(store, 'household-updates', (evt) => console.log(evt.payload));
memory.shareOn(store, 'household-updates', { note: 'door was unlocked, now locked' });
```

## Why this composition

- **episodic → stamp** — every event is chained to the previous one, so the
  history can't be silently rewritten. `verifyEpisodicIntegrity` catches it
  if it is.
- **archival → vault** — anything meant to outlive a session goes through
  vault's encrypted store, the same one identity and secrets already use.
- **sharing → unify** — reuses the same event bus the rest of the mesh runs
  on, instead of inventing a second pub/sub mechanism.
