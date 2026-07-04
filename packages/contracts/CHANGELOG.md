# Changelog

All notable changes to `@manya/contracts` are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Adheres to [SemVer](https://semver.org/).

## [1.0.0] — 2024-01-15
### Added
- Initial release.
- Schema definition language: `compileSchema` (record or array field syntax) and `validateValue` for all 10 type kinds (string, number, boolean, null, object, array, enum, ref, union, intersection).
- Manifest validation (`validateManifest`, `assertManifest`, `isValidManifest`) with one stable code per failure mode.
- Semver parsing (`parseSemver`, `isSemver`), comparison (`compareSemver`, `compareParsedSemver`) with full prerelease handling per semver.org §11, range satisfaction (`satisfies`) supporting `*`, `^`, `~`, exact, and comparison operators.
- Backward-compatibility analysis (`checkBackwardCompat`) detecting field removal, type change, required addition, and enum value removal.
- API contract validation: `findEndpoint`, `validateRequest`, `validateResponse`, `assertValidContract`.
- Schema synchronization: `diffSchemas` (added/removed/changed), `mergeSchemas` with conflict detection and `fieldsEqual` deep equality.
- Boundary enforcement: `enforceBoundary` (with `*` wildcards), `detectViolations` over a call graph, `matchRule`, `isPolicySatisfied`.
- Validation reports: `buildReport`, `aggregateReports`, `serializeReport` (JSON), `summarizeReport` (one-line).
- Typed error hierarchy: `ContractsError`, `SchemaError`, `ManifestError` (with `MANIFEST_ERROR_CODES`), `CompatibilityError`, `ApiValidationError`, `SyncError`, `BoundaryError`, `ReportingError`.
- Structured logging: `Logger`, `ConsoleLogger` with secret scrubbing, `SilentLogger`, `scrubMetadata`, `shouldScrubField`, `SCRUBBED_FIELD_NAMES`.
- Comprehensive unit test suite (99 tests).
