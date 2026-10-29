# Changelog

All notable changes to `@manya/customs-shield` are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Adheres to [SemVer](https://semver.org/).

## [1.0.0] — 2024-01-15
### Added
- Initial release.
- HS code validation against WCO chapter catalog (99 chapters).
- Sanctions screening with country-level + name-level matching against OFAC/EU/UN/UK lists.
- Compliance rules: embargoes, licenses, restricted origins, duty calculation.
- Product restrictions: Wassenaar, UN drug precursors, UNESCO 1970, Montreal Protocol, CITES.
- Risk scoring (0-100) with 5 severity bands and automatic hold-for-review.
- Vulnerability analysis: value concentration, circular trade, high-risk transshipment.
- Regulatory reports: import declaration, sanctions screening record.
- Comprehensive unit test suite.
