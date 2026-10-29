# @manya-os/anonymize

> Research-grade anonymization for PII, PHI, sensitive metadata, OCR text, image identifiers, and document metadata — with validation reports and reproducible dataset publication for the MANYA Intelligence OS.

`@manya-os/anonymize` is the privacy substrate of the **MANYA Intelligence OS** — a sovereign, modular, local-first intelligence operating system conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the **Manya Hael Foundation**.

The package provides detector-driven PII/PHI discovery, pluggable redaction strategies, EXIF/metadata stripping for documents and images, OCR-text normalization, post-anonymization validation reports with residual-risk scoring, and reproducible dataset publication with verifiable manifests.

---

## Vision

The Manya Hael Foundation stewards the MANYA Intelligence OS as a long-horizon, mission-driven project to return sovereignty to individuals and communities over their own intelligence infrastructure. `@manya-os/anonymize` is the keystone of privacy: **your data, your rules, your disclosure threshold — yours alone.**

- **Sovereign.** No network calls. No cloud dependency. All detection and redaction runs locally.
- **Reproducible.** Pipeline configurations are hashed; manifests bind datasets to configs.
- **Validated.** Every output is re-scanned; residual risk is quantified in [0,1].
- **Composable.** Detectors and redactors are pure, pluggable, and side-effect-free.
- **Honest.** Confidence scores are explicit; nothing is silently dropped.

---

## Features

| Area | What you get |
| --- | --- |
| **Detectors** | 14 pattern detectors (email, phone, IPv4/IPv6, MAC, URL, credit card w/ Luhn, IBAN, JWT, API key, ISO date, postal code, US SSN, SA ID) + 5 context detectors (person name via honorifics, street address, health conditions, medications, providers). |
| **Redactors** | 6 strategies: `mask`, `hash`, `token` (reversible pseudonym), `redact`, `generalize` (age bands), `synthesize` (format-preserving fake). |
| **Metadata** | Recursive JSON scrubbing of `author`, `gps`, `deviceid`, `imei`, `token`, etc., with allowlist support. |
| **OCR** | Text normalization (whitespace + digit/letter substitution), page-to-text reconstruction, OCR-PII candidate detection. |
| **Images** | JPEG EXIF stripping (APP1 segment removal), fast perceptual hashing (dHash). |
| **Documents** | PDF Info-dictionary parsing, DOCX core.xml parsing, normalized metadata scrubbing. |
| **Validation** | Re-scan output for residual PII; weighted residual-risk score in [0,1]; per-category counts. |
| **Publishing** | Dataset manifests with per-record SHA-256, dataset hash, config hash, and validation summary; `verifyManifest` for downstream verification. |
| **Logging** | `Logger` interface, `ConsoleLogger` with secret-scrubbing, `SilentLogger`. |

---

## Install

```bash
npm install @manya-os/anonymize
```

Requires Node.js 18+.

---

## Quick start

### 1. Anonymize a string

```ts
import { anonymize } from '@manya-os/anonymize';

const input = 'Patient Mr John Smith (ID 8801235111088) contacted alice@example.com from 192.168.1.1.';
const { result, report } = anonymize(input);

console.log(result.output);
// Patient [PERSON_NAME_001] (ID [REDACTED]) contacted a***@example.com from 192.168.1.1.
console.log(result.findings.length); // 4
console.log(report.passed);           // true
console.log(report.residualRisk);     // 0
```

### 2. Use a custom redaction strategy per category

```ts
import { Anonymizer } from '@manya-os/anonymize';

const anon = new Anonymizer({
  defaultStrategy: 'mask',
  strategyByCategory: {
    credit_card: 'redact',
    national_id: 'redact',
    person_name: 'token',
  },
  maxResidualRisk: 0.05,
});
const { result } = anon.anonymize('Card 4111 1111 1111 1111 belongs to Dr Alice Smith');
```

### 3. Publish a reproducible dataset

```ts
import { Anonymizer, verifyManifest } from '@manya-os/anonymize';

const anon = new Anonymizer();
const records = [
  'Email: alice@example.com',
  'Phone: +1-555-123-4567',
  'IP: 10.0.0.1',
];
const { manifest, results } = anon.anonymizeBatch(records, 'study-2024-q1');

console.log(manifest.datasetHash);   // sha256 of record hashes
console.log(manifest.recordCount);   // 3
console.log(verifyManifest(manifest, results.map(r => r.output))); // true
```

### 4. Scrub document metadata

```ts
import { normalizeMetadata, scrubDocumentMetadata } from '@manya-os/anonymize';

const meta = normalizeMetadata('pdf', {
  Title: 'Report', Author: 'Alice', CreationDate: '2024-01-01',
});
const clean = scrubDocumentMetadata(meta);
console.log(clean.normalized.author); // undefined
```

---

## Configuration

```ts
export interface AnonymizerConfig {
  minConfidence?: number;                          // default 0.5
  defaultStrategy?: RedactionStrategy;             // default 'mask'
  strategyByCategory?: Partial<Record<string, RedactionStrategy>>;
  disabledDetectors?: string[];                    // default []
  validateOutput?: boolean;                        // default true
  maxResidualRisk?: number;                        // default 0.05
  logLevel?: LogLevel;                             // default 'info'
  logger?: Logger;                                 // overrides logLevel
}
```

### Detector categories

| Category | Severity | Detector |
| --- | --- | --- |
| `email_address` | high | `email` |
| `phone_number` | high | `phone` |
| `ip_address` | medium | `ipv4`, `ipv6` |
| `mac_address` | medium | `mac` |
| `url` | medium | `url` |
| `credit_card` | critical | `credit_card` (Luhn-validated) |
| `bank_account` | critical | `iban` |
| `jwt_token` | critical | `jwt` |
| `api_key` | critical | `api_key` |
| `national_id` | critical | `us_ssn`, `za_id` (with checksum) |
| `date` | low | `iso_date` |
| `postal_code` | low | `postal_code` |
| `person_name` | high | `person_name` (honorific-triggered) |
| `physical_address` | high | `physical_address` |
| `health_condition` | high | `health_condition` |
| `medication` | high | `medication` |
| `phi_provider` / `phi_facility` | high | `phi_provider` |

---

## Extending

### Add a custom detector

```ts
import { DetectorRegistry, type Detector } from '@manya-os/anonymize';

const myDetector: Detector = {
  name: 'custom',
  categories: ['user_id'],
  defaultConfig: { minConfidence: 0.7, enabled: true },
  detect(input) {
    const out = [];
    const re = /\bUSER-\d{6}\b/g;
    let m;
    while ((m = re.exec(input))) {
      out.push({ start: m.index, end: m.index + m[0].length, text: m[0],
        category: 'user_id', confidence: 0.85, severity: 'medium', detector: 'custom' });
    }
    return out;
  },
};

const reg = new DetectorRegistry();
reg.register(myDetector);
const anon = new Anonymizer({}, reg);
```

### Add a custom redactor

```ts
import { applyRedactions, type Redactor } from '@manya-os/anonymize';

class ReverseRedactor implements Redactor {
  strategy = 'redact' as const;
  redact(f) { return f.text.split('').reverse().join(''); }
}
```

---

## Security notes

- **Local-first.** No data ever leaves the host process.
- **No side effects.** Detectors are pure functions; the original input is never mutated.
- **Defense in depth.** Even with redaction, the validator re-scans output and quantifies residual risk.
- **Reproducibility.** Manifests bind a published dataset to the exact pipeline config that produced it.

For threat models, see [SECURITY.md](./SECURITY.md) and the root [SECURITY.md](../../SECURITY.md).

---

## Documentation

- [docs/API.md](./docs/API.md) — full TypeScript API reference.
- [CHANGELOG.md](./CHANGELOG.md) — release history.
- [CONTRIBUTING.md](./CONTRIBUTING.md) — package-specific contributor notes.
- [SECURITY.md](./SECURITY.md) — package-specific security surface.
- [LICENSE](./LICENSE) — Apache-2.0.

---

## License

Apache-2.0. Copyright 2024 Manya Hael Foundation. All rights reserved.

Conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the Manya Hael Foundation.
