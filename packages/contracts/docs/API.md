# @manya/contracts — API Reference

> Complete TypeScript API reference for `@manya/contracts` v1.0.0.

## Contents
- [Types](#types)
- [Errors](#errors)
- [Logging](#logging)
- [Schema](#schema)
- [Manifest](#manifest)
- [Compatibility](#compatibility)
- [API Contracts](#api-contracts)
- [Sync](#sync)
- [Boundaries](#boundaries)
- [Reporting](#reporting)

---

## Types

### `SchemaType`
```ts
type SchemaType =
  | 'string' | 'number' | 'boolean' | 'null'
  | 'object' | 'array' | 'enum' | 'ref'
  | 'union' | 'intersection';
```

### `SchemaField`
```ts
interface SchemaField {
  name: string;
  type: SchemaType;
  required: boolean;
  description?: string;
  default?: unknown;
  enum?: unknown[];          // for type === 'enum'
  of?: SchemaField;          // for type === 'array'
  ref?: string;              // for type === 'ref'
  oneOf?: SchemaField[];     // for type === 'union'
  allOf?: SchemaField[];     // for type === 'intersection'
  fields?: SchemaField[];    // for type === 'object'
}
```

### `InterfaceSchema`
```ts
interface InterfaceSchema {
  name: string;
  version: string;           // semver
  fields: SchemaField[];
  description?: string;
}
```

### `SemverVersion`
```ts
interface SemverVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}
```

### `Manifest`
```ts
interface Manifest {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  exports?: string[];
  imports?: string[];
  capabilities?: string[];
}
```

### `ValidationError` / `ValidationResult`
```ts
interface ValidationError {
  path: string;
  message: string;
  code: string;
  expected?: string;
  actual?: string;
}
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
```

### `BreakingChange`
```ts
interface BreakingChange {
  type: 'field_removed' | 'type_changed' | 'required_added' | 'enum_value_removed';
  field?: string;
  from?: string;
  to?: string;
}
```

### `ApiEndpoint` / `ApiContract`
```ts
interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  requestSchema?: InterfaceSchema;
  responseSchema: InterfaceSchema;
}
interface ApiContract {
  name: string;
  version: string;
  endpoints: ApiEndpoint[];
}
```

### `SchemaDiff` / `SchemaConflict`
```ts
interface SchemaDiff {
  added: SchemaField[];
  removed: string[];
  changed: Array<{ field: string; from: SchemaField; to: SchemaField }>;
}
interface SchemaConflict {
  field: string;
  localType: string;
  remoteType: string;
  resolution: 'local' | 'remote' | 'manual';
}
```

### `BoundaryRule` / `BoundaryPolicy`
```ts
interface BoundaryRule {
  from: string;              // '*' is a wildcard
  to: string;                // '*' is a wildcard
  allowed: boolean;
  reason?: string;
}
interface BoundaryPolicy {
  name: string;
  rules: BoundaryRule[];
  defaultAllow: boolean;
}
```

### `ValidationReport` / `ValidationReportSection`
```ts
interface ValidationReportSection {
  name: string;
  passed: boolean;
  errors: ValidationError[];
}
interface ValidationReport {
  name: string;
  passed: boolean;           // AND of every section's passed
  sections: ValidationReportSection[];
  generatedAt: string;       // ISO 8601
}
```

---

## Errors

All errors extend `ContractsError` and carry a stable `code` string.

| Class | Code | When |
| --- | --- | --- |
| `ContractsError` | `CONTRACTS_ERROR` | Base class |
| `SchemaError` | `SCHEMA_ERROR` | Schema cannot be compiled or is structurally invalid |
| `ManifestError` | `MANIFEST_ERROR` (or one of `MANIFEST_ERROR_CODES.*`) | Manifest is structurally invalid |
| `CompatibilityError` | `COMPATIBILITY_ERROR` | Semver string cannot be parsed |
| `ApiValidationError` | `API_VALIDATION_ERROR` | API contract is structurally invalid |
| `SyncError` | `SYNC_ERROR` | Schemas cannot be merged (e.g. different names) |
| `BoundaryError` | `BOUNDARY_ERROR` | Boundary policy is structurally invalid or caller/callee is empty |
| `ReportingError` | `REPORTING_ERROR` | A report cannot be built, aggregated, or serialized |

### `MANIFEST_ERROR_CODES`
```ts
const MANIFEST_ERROR_CODES = {
  INVALID_NAME: 'MANIFEST_INVALID_NAME',
  INVALID_VERSION: 'MANIFEST_INVALID_VERSION',
  INVALID_DEPENDENCY: 'MANIFEST_INVALID_DEPENDENCY',
  MISSING_FIELD: 'MANIFEST_MISSING_FIELD',
  INVALID_EXPORTS: 'MANIFEST_INVALID_EXPORTS',
  INVALID_IMPORTS: 'MANIFEST_INVALID_IMPORTS',
  INVALID_CAPABILITIES: 'MANIFEST_INVALID_CAPABILITIES',
  INVALID_DEPENDENCIES: 'MANIFEST_INVALID_DEPENDENCIES',
} as const;
```

---

## Logging

```ts
interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
```

- `SCRUBBED_FIELD_NAMES: readonly string[]`
- `shouldScrubField(name: string): boolean`
- `scrubMetadata(meta: unknown): unknown`
- `class ConsoleLogger implements Logger` — constructor: `(level?: LogLevel)`
- `class SilentLogger implements Logger`

---

## Schema

### `compileSchema(definition: SchemaDefinition): InterfaceSchema`
Compiles a raw definition (an `InterfaceSchema` or a JSON-ish object whose `fields` may be a record mapping name → field definition; `required` defaults to `true`). Throws `SchemaError` on malformed input.

### `validateValue(schema: InterfaceSchema, value: unknown, refs?: Record<string, InterfaceSchema>): ValidationResult`
Validates a value against a compiled schema. Returns `{ valid, errors }`; never throws.

### `describeType(value: unknown): string`
Returns `'null'`, `'array'`, `'date'`, or `typeof value`.

### `SCHEMA_TYPES: ReadonlySet<string>`
The 10 valid `SchemaType` literal names.

### `SchemaDefinition` / `SchemaFieldDefinition`
```ts
type SchemaDefinition =
  | InterfaceSchema
  | {
      name: string;
      version: string;
      description?: string;
      fields?: SchemaField[] | Record<string, SchemaFieldDefinition>;
    };

interface SchemaFieldDefinition {
  type?: SchemaType | string;
  required?: boolean;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  of?: SchemaFieldDefinition | SchemaField;
  ref?: string;
  oneOf?: Array<SchemaFieldDefinition | SchemaField>;
  allOf?: Array<SchemaFieldDefinition | SchemaField>;
  fields?: SchemaField[] | Record<string, SchemaFieldDefinition>;
}
```

---

## Manifest

### `validateManifest(manifest: unknown): ValidationResult`
Structurally validates a manifest. Each error's `code` is one of `MANIFEST_ERROR_CODES.*`.

### `assertManifest(manifest: unknown): asserts manifest is Manifest`
Throws `ManifestError` (with the first error's code) if invalid.

### `isValidManifest(manifest: unknown): manifest is Manifest`
Predicate form of `validateManifest`.

### Field validation rules
- `name` — non-empty; matches `^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$`.
- `version` — non-empty; full semver 2.0.0 with optional prerelease/build.
- `dependencies` — if present, a record of name → non-empty range string.
- `exports` / `imports` / `capabilities` — if present, arrays of non-empty strings.

---

## Compatibility

### `isSemver(v: string): boolean`

### `parseSemver(v: string): SemverVersion`
Throws `CompatibilityError` on invalid input.

### `compareSemver(a: string, b: string): -1 | 0 | 1`
Prerelease handling per semver.org §11.

### `compareParsedSemver(a: SemverVersion, b: SemverVersion): -1 | 0 | 1`

### `satisfies(version: string, range: string): boolean`
Supports `*`, `^`, `~`, exact, `>`, `>=`, `<`, `<=`. Caret with `0.x` is minor-scoped; with `0.0.x` is patch-scoped. Throws `CompatibilityError` on invalid `version` or `range`.

### `checkBackwardCompat(oldSchema, newSchema): { compatible: boolean; breakingChanges: BreakingChange[] }`
Detects:
- `field_removed` — a field in `oldSchema` is missing in `newSchema`.
- `type_changed` — a field's `type` changed between versions.
- `required_added` — a new field is `required: true`.
- `enum_value_removed` — an `enum` field lost a value.

---

## API Contracts

### `findEndpoint(contract, method, path): ApiEndpoint | undefined`
Method is case-insensitive (matched uppercased). Path is matched exactly.

### `validateRequest(contract, method, path, request): ValidationResult`
- Returns `{ valid: true }` when the endpoint exists and has no `requestSchema` (any body is allowed).
- Returns `{ valid: true }` when `request` satisfies `requestSchema`.
- Returns `{ valid: false, errors }` when the endpoint is missing, or the body fails schema validation.

### `validateResponse(contract, method, path, response): ValidationResult`
Every endpoint must declare a `responseSchema`; missing endpoint or schema failure produces errors.

### `assertValidContract(contract: unknown): asserts contract is ApiContract`
Throws `ApiValidationError` on the first structural defect.

---

## Sync

### `diffSchemas(oldSchema, newSchema): SchemaDiff`
`added` — fields present in `newSchema` but not `oldSchema`.
`removed` — field names present in `oldSchema` but not `newSchema`.
`changed` — fields present in both whose definition differs (per `fieldsEqual`).

### `mergeSchemas(local, remote): { schema: InterfaceSchema; conflicts: SchemaConflict[] }`
- Throws `SyncError` if `local.name !== remote.name`.
- Merged version is the higher of the two (per `compareSemver`).
- Fields present in only one schema are included verbatim.
- Fields present in both with the same type are kept from `local`.
- Fields present in both with different types produce a `SchemaConflict` (`resolution: 'local'`) and the `local` definition wins.

### `fieldsEqual(a: SchemaField, b: SchemaField): boolean`
Deep structural equality of two fields (type, required, description, enum, ref, of, oneOf, allOf, fields, default).

---

## Boundaries

### `enforceBoundary(policy, caller, callee): BoundaryResult`
```ts
interface BoundaryResult {
  allowed: boolean;
  reason?: string;
  matchedRule?: BoundaryRule;
}
```
Throws `BoundaryError` if `caller` or `callee` is empty.

### `matchRule(policy, caller, callee): BoundaryRule | undefined`
Specificity order: exact `(from, to)` > `('*', to)` > `(from, '*')` > `('*', '*')`.

### `detectViolations(policy, callGraph): BoundaryViolation[]`
```ts
interface CallEdge { from: string; to: string; }
interface BoundaryViolation { from: string; to: string; reason: string; }
```
Returns every edge whose `enforceBoundary` result has `allowed === false`.

### `isPolicySatisfied(policy, callGraph): boolean`
`true` iff `detectViolations(...).length === 0`.

---

## Reporting

### `buildReport(name: string, sections: ValidationReportSection[], generatedAt?: string): ValidationReport`
`passed` is the AND of every section's `passed`. Throws `ReportingError` on empty name or non-array sections. `generatedAt` defaults to now.

### `aggregateReports(reports: ReadonlyArray<ValidationReport>, name?: string): ValidationReport`
Merged `passed` is the AND of all input reports' `passed` (empty list → `passed: true`). Each input section is prefixed with `${reportName}:` to keep names unique. `generatedAt` is set to now.

### `serializeReport(report: ValidationReport): string`
Returns indented JSON. Throws `ReportingError` on serialization failure.

### `summarizeReport(report: ValidationReport): string`
Returns a single-line summary, e.g.:
- `my-contract: PASS (3/3 sections) at 2024-01-15T12:34:56.000Z`
- `my-contract: FAIL (1/3 sections, 4 errors) at 2024-01-15T12:34:56.000Z`
