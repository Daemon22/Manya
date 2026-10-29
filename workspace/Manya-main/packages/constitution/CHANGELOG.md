# Changelog

All notable changes to `@manya/constitution` are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Adheres to [SemVer](https://semver.org/).

## [1.0.0] — 2024-01-15
### Added
- Initial release.
- Ethical rules: `EthicalRule` (prohibition/requirement), `RuleSet`, `evaluateRule`, `evaluateRuleSet`, 6 categories (harm, deception, privacy, fairness, autonomy, transparency), 5 severity levels.
- Operational policies: `Policy`, `PolicySet`, hand-written recursive-descent condition parser supporting `==`, `!=`, `in [...]`, `AND`, `OR`, `NOT`, and parentheses; `evaluatePolicy` and `evaluatePolicySet` with priority + restrictiveness tiebreak.
- Permission model: `PermissionModel`, `Role` with inheritance and wildcards (`module:*` and `*`); `can`, `whoCan`, `grantRole`, `revokeRole`, `expandRoles`, `permissionsForRole`, `permissionMatches`, `validatePermissionModel` with cycle and self-inheritance detection.
- Decision hierarchy: `DecisionHierarchy`, `escalationPath`, `findCommonAuthority` (lowest common ancestor), `canOverride`, `ancestors`, `roots`, `children`, `validateHierarchy` with cycle detection.
- Emergency procedures: `EmergencyController` with 4 states (normal / heightened / emergency / critical), one-level-at-a-time escalation, any-level de-escalation, action allowlists with `*` and `module:*` wildcards, timeouts, state-change listeners; `validateProcedure`.
- Safety: `SafetyChecker`, `SafetyRule` with `enforcementPoint: 'pre' | 'post' | 'both'`; `runPre`, `runPost`, `assertSafe` (throws on medium+ violations), `verifyInvariants`.
- Conflict resolution: `ConflictResolver` with 5 strategies (consensus, majority, authority, arbitration, escalation); returns `ConflictResolution` with reason and dissenters; `validateConflict`.
- Runtime enforcement: `EnforcementEngine` binding rules + policies + permissions + safety; `evaluate(action, subject, context)` returns `EnforcementResult` with `allowed`, `reasons[]`, `violations[]`, `auditId`; immutable audit log; configurable `requireApprovalDenies` behavior.
- Versioned governance documents: `GovernanceDocument` with semver versioning, 4 lifecycle statuses (draft / proposed / ratified / superseded); `diffDocuments`, `isRatified`, `ratify`, `supersede`, `compareVersions`, `formatVersion`, `parseVersion`, `validateDocument`, `validateSection`.
- Typed error hierarchy: `ConstitutionError` + 9 subclasses (`RuleError`, `PolicyError`, `PermissionError`, `HierarchyError`, `EmergencyError`, `SafetyError`, `ConflictError`, `EnforcementError`, `DocumentError`).
- Structured logging: `Logger`, `LogLevel`, `ConsoleLogger` (with secret scrubbing), `SilentLogger`, `scrubMetadata`, `shouldScrubField`, `SCRUBBED_FIELD_NAMES`.
- Comprehensive unit test suite: 151 tests covering all modules, error hierarchy, logging, and an end-to-end scenario.
