# @manya/perception

Ingests signals from the outside world into working memory — without
leaking sensitive content into that memory unfiltered.

Composed from `@manya/lens` (redaction + sensitivity classification),
`@manya/hawk` (device/environment detection), and `@manya/memory` (where
everything lands).

## Usage

```js
import { memory } from '@manya/memory';
import { perception } from '@manya/perception';

const store = memory.createMemoryStore('ara');
const eyes = perception.createPerception(store);

const { stored, sensitivity } = perception.ingestText(eyes, 'sms', 'call me at 555-123-4567');
// stored: "call me at [REDACTED]"
// sensitivity.level: "public" (or higher, depending on content)

perception.ingestStructured(eyes, 'sensor', { temp: 21.5 });
perception.perceiveEnvironment(eyes);
```

## Why this composition

Perception is the boundary between the outside world and everything else in
the ecosystem. Redaction happens here, once, before anything reaches working
memory — not as an afterthought bolted onto every downstream package that
might read from memory later.
