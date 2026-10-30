# Changelog

All notable changes to `@manya-os/anonymize` are documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2024-01-15
### Added
- Initial release.
- 14 pattern detectors (email, phone, IPv4/IPv6, MAC, URL, credit card w/ Luhn, IBAN, JWT, API key, ISO date, postal code, US SSN, SA ID with checksum).
- 5 context detectors (person name via honorifics, street address, health conditions, medications, providers/facilities).
- 6 redaction strategies: `mask`, `hash`, `token`, `redact`, `generalize`, `synthesize`.
- Recursive JSON metadata scrubbing with allowlist support.
- JPEG EXIF stripping (APP1 segment removal) and perceptual dHash.
- PDF Info-dictionary and DOCX core.xml parsing.
- Post-anonymization Validator with weighted residual-risk scoring.
- Reproducible dataset publication with SHA-256 manifests and `verifyManifest`.
- `Anonymizer` orchestrator and convenience `anonymize(input, config?)` function.
- Comprehensive unit test suite.
