# @manya-os/anonymize — API Reference

> Complete TypeScript API reference for `@manya-os/anonymize` v1.0.0.

## Contents

- [Types](#types)
- [Errors](#errors)
- [Anonymizer](#anonymizer)
- [Detectors](#detectors)
- [Redactors](#redactors)
- [Metadata](#metadata)
- [OCR](#ocr)
- [Images](#images)
- [Documents](#documents)
- [Validation](#validation)
- [Publishing](#publishing)

---

## Types

### `PIICategory`

```ts
type PIICategory =
  | 'person_name' | 'email_address' | 'phone_number' | 'physical_address'
  | 'postal_code' | 'national_id' | 'passport_number' | 'drivers_license'
  | 'credit_card' | 'bank_account' | 'date_of_birth' | 'date'
  | 'ip_address' | 'mac_address' | 'url' | 'username' | 'password'
  | 'api_key' | 'jwt_token' | 'device_id' | 'user_id' | 'religion'
  | 'ethnicity' | 'sexual_orientation' | 'political_affiliation'
  | 'health_condition' | 'medication' | 'medical_record_number';
```

### `PHICategory`

```ts
type PHICategory =
  | 'phi_diagnosis' | 'phi_procedure' | 'phi_medication' | 'phi_provider'
  | 'phi_facility' | 'phi_dates' | 'phi_age' | 'phi_device';
```

### `Finding`

```ts
interface Finding {
  start: number;       // 0-based, inclusive
  end: number;         // 0-based, exclusive
  text: string;
  category: PIICategory | PHICategory;
  confidence: number;  // [0,1]
  severity: 'low' | 'medium' | 'high' | 'critical';
  detector: string;
}
```

### `Redaction`

```ts
interface Redaction {
  finding: Finding;
  replacement: string;
  strategy: 'mask' | 'hash' | 'token' | 'redact' | 'generalize' | 'synthesize';
}
```

### `AnonymizationResult`

```ts
interface AnonymizationResult {
  output: string;
  findings: Finding[];
  redactions: Redaction[];
  safe: boolean;
  counts: Record<string, number>;
  elapsedMs: number;
}
```

### `ValidationReport`

```ts
interface ValidationReport {
  passed: boolean;
  entries: ValidationEntry[];
  residualRisk: number;
  residualCounts: Record<string, number>;
  configHash: string;
}
```

### `DatasetManifest`

```ts
interface DatasetManifest {
  schemaVersion: 1;
  name: string;
  createdAt: string;
  recordCount: number;
  recordHashes: string[];
  datasetHash: string;
  configHash: string;
  validation: { passed: boolean; residualRisk: number };
}
```

---

## Errors

All errors extend `AnonymizeError` and carry a stable `code` string.

| Class | Code | When |
| --- | --- | --- |
| `AnonymizeError` | `ANONYMIZE_ERROR` | Base class |
| `DetectorError` | `DETECTOR_ERROR` | Invalid detector configuration |
| `RedactionError` | `REDACTION_ERROR` | Redactor configuration or application failure |
| `ValidationError` | `VALIDATION_ERROR` | Critical residual risk detected |
| `PublishingError` | `PUBLISHING_ERROR` | Manifest build/verify failure |

---

## Anonymizer

### `class Anonymizer`

```ts
new Anonymizer(config?: AnonymizerConfig, registry?: DetectorRegistry)
```

Methods:

- `anonymize(input: string): { result: AnonymizationResult; report: ValidationReport }`
- `anonymizeBatch(records: string[], name: string): { results; report; manifest }`

### `anonymize(input, config?)`

Convenience function. Equivalent to `new Anonymizer(config).anonymize(input)`.

### `AnonymizerConfig`

```ts
interface AnonymizerConfig {
  minConfidence?: number;                              // default 0.5
  defaultStrategy?: RedactionStrategy;                 // default 'mask'
  strategyByCategory?: Partial<Record<string, RedactionStrategy>>;
  disabledDetectors?: string[];
  validateOutput?: boolean;                            // default true
  maxResidualRisk?: number;                            // default 0.05
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  logger?: Logger;
}
```

---

## Detectors

### `class DetectorRegistry`

```ts
new DetectorRegistry()
```

Methods:

- `register(detector: Detector): void`
- `get(name: string): Detector | undefined`
- `list(): Detector[]`
- `runAll(input: string, perDetectorConfig?, minConfidence?): Finding[]`

### Built-in pattern detectors

`emailDetector`, `phoneDetector`, `ipv4Detector`, `ipv6Detector`, `macDetector`, `urlDetector`, `creditCardDetector`, `ibanDetector`, `jwtDetector`, `apiKeyDetector`, `isoDateDetector`, `postalCodeDetector`, `usSsnDetector`, `zaIdDetector`.

### Built-in context detectors

`personNameDetector`, `addressDetector`, `healthConditionDetector`, `medicationDetector`, `providerDetector`.

### Helpers

- `resolveOverlaps(findings): Finding[]` — keep highest-confidence on overlap.
- `severityFor(category): Severity` — map category to severity.
- `luhnValid(digits): boolean` — Luhn checksum.
- `zaIdChecksumValid(id): boolean` — South African ID checksum.
- `makeFinding(...)` — construct a validated `Finding`.

---

## Redactors

### Strategies

| Class | Strategy | Behavior |
| --- | --- | --- |
| `MaskRedactor` | `mask` | Keep first/last chars, mask middle with `*`. |
| `HashRedactor` | `hash` | `[sha256:<12-hex>]`. Deterministic. |
| `TokenRedactor` | `token` | `[CATEGORY_001]` per-category counter. Reversible via mapping. |
| `FullRedactor` | `redact` | Replace with `[REDACTED]`. |
| `GeneralizeRedactor` | `generalize` | Numeric values become bands (e.g. `[age:40-49]`). |
| `SynthesizeRedactor` | `synthesize` | Format-preserving fake (`user1234@example.com`). |

### `applyRedactions(input, findings, redactorFor)`

Patches the input string from end→beginning, returning `{ output, redactions }`.

---

## Metadata

### `isSensitiveKey(key, opts?): boolean`

### `scrubMetadata(meta, opts?): unknown`

Recursively scrubs a JSON-like object. Default denylist: `author`, `creator`, `gps`, `deviceid`, `imei`, `macaddress`, `userid`, `username`, `ip`, `email`, `address`, `birthdate`, `exif`, `xmp`, `iptc`, `signature`, `token`, `apikey`, `secret`, `password`, `sessionid`, etc.

Options:

```ts
interface MetadataScrubOptions {
  additionalKeys?: string[];
  redactInsteadOfDelete?: boolean;
  allowlist?: string[];
}
```

### `diffMetadata(a, b)`

Returns `{ onlyInA, onlyInB, changed }`.

### `assertClean(meta, opts?)`

Throws `AnonymizeError` on first residual sensitive key.

---

## OCR

### `normalizeOcrText(input): string`

Collapses whitespace, fixes common digit/letter substitutions (`5` → `S`, `1` → `l`, etc.).

### `ocrPageToText(page): string`

Reconstructs plain text from an `OcrPage` (words with bounding boxes).

### `findOcrPiiCandidates(text)`

Finds words that look like OCR misreads of PII markers (`emaiI` → `email` hint).

### `stripOcrGeometry(page): { text: string }`

Returns text only — drops bounding boxes and confidence fields.

---

## Images

### `redactImage(input: Buffer): ImageRedactionResult`

Strips JPEG EXIF (APP1 segment), computes perceptual dHash.

### `stripJpegExif(input: Buffer): Buffer`

Lower-level: just the EXIF stripper.

### `dhash(input: Buffer, width?, height?): string`

16-char hex perceptual hash. NOT cryptographically secure.

### `imageIdentifier(input: Buffer): string`

Alias for `dhash`.

---

## Documents

### `parsePdfInfo(raw: string): Record<string, unknown>`

Defensive parser for PDF Info dictionary key/value pairs.

### `parseDocxCoreXml(raw: string): Record<string, unknown>`

Defensive parser for DOCX `core.xml` (DC + CP namespaces).

### `normalizeMetadata(kind, raw): DocumentMetadata`

Wraps raw fields in a typed `DocumentMetadata` object.

### `scrubDocumentMetadata(meta, opts?): DocumentMetadata`

Returns a new `DocumentMetadata` with sensitive fields removed.

### `assertDocumentClean(meta, opts?)`

Throws on residual `author`, `creator`, or `identifier`.

---

## Validation

### `class Validator`

```ts
new Validator(registry: DetectorRegistry)
```

Methods:

- `validate(output, originalFindings, configHash, opts?): ValidationReport`
- `assertValid(report): void` — throws `ValidationError` if not passed.

### `hashConfig(config): string`

SHA-256 of canonical JSON of a config object.

---

## Publishing

### `hashRecord(record: string): string`

SHA-256 of a single record.

### `hashDataset(recordHashes: string[]): string`

SHA-256 of the concatenation of record hashes.

### `buildManifest(name, records, configHash, validation): DatasetManifest`

Produces a v1 manifest with per-record and dataset hashes.

### `verifyManifest(manifest, records): boolean`

Returns `true` if every record hash matches and the dataset hash is consistent.

### `serializeManifest(manifest): string`

Pretty-printed JSON.
