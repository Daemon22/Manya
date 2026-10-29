# @manya/anonymize

Redact a dataset, then certify it's actually fit to publish. Composes:

- **lens** — detects, redacts, and classifies sensitive data (PII/PHI)
- **research-academic** — builds a reproducibility manifest and assesses FAIR compliance

## Quick Start

```js
import { anonymize } from '@manya/anonymize'

const records = [
  { name: 'Jane Doe', email: 'jane@example.com', note: 'Follow up next week' },
  { name: 'John Roe', email: 'john@example.com', note: 'SSN 123-45-6789 on file' },
]

const result = anonymize.prepareForPublication(
  records,
  { experimentId: 'study-42', software: { name: 'analysis-pipeline', version: '1.0.0' } },
  {
    doi: '10.1234/study-42',
    repository: 'https://data.example.org/study-42',
    format: 'CSV',
    metadataStandard: 'DataCite',
    license: 'CC-BY-4.0',
    provenance: 'internal-review-2026-06',
  }
)

result.records          // redacted records, safe to publish
result.redaction         // { totalRedactions, findings }
result.fair               // FAIR assessment — findable/accessible/interoperable/reusable
result.readyToPublish   // true only if all four FAIR principles are satisfied
```

Use `redactDataset` and `classifyDataset` directly if you just need redaction
or sensitivity scoring without the full FAIR pipeline.

## License

MIT
