# @manya-os/anonymize Security Policy

## Scope

`@manya-os/anonymize` is the privacy substrate of the MANYA Intelligence OS. It runs entirely locally, never makes network calls, and never persists data unless the caller explicitly does so.

## Threat model

- **Adversary:** anyone with read access to a published dataset produced by this package.
- **Asset:** the original (pre-anonymization) text and metadata.
- **Goal:** ensure that no PII/PHI can be recovered from the published output.

## Security guarantees

1. **No raw PII in output.** Every finding is replaced by a redacted form.
2. **Residual risk quantified.** The Validator re-scans output and reports `residualRisk ∈ [0,1]`.
3. **Reproducibility.** Manifests bind datasets to pipeline configs.
4. **Local execution.** No telemetry, no remote calls, no logging of plaintext.

## Known limitations

- **Image redaction is metadata-only.** Pixel-level redaction (face blur, etc.) is out of scope; pair with a vision library.
- **OCR detector is heuristic.** Misspelled PII may evade detection. Use `normalizeOcrText` to mitigate.
- **Person-name detector is honorific-triggered.** Names without an honorific (`Mr`/`Dr`/etc.) will not be detected.
- **Token redactor is reversible.** The mapping table is held in memory; do not publish the mapping alongside the dataset.

## Reporting a vulnerability

See the root [SECURITY.md](../../SECURITY.md) for the disclosure process and timeline. Do NOT open a public issue for security vulnerabilities.
