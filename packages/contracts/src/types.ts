/**
 * @manya/contracts — shared type definitions.
 *
 * Defines every public type used across the contracts package: schema
 * primitives, manifests, semver versions, API contracts, schema diffs,
 * boundary policies, and validation reports.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

/**
 * The set of schema type names supported by the contracts schema language.
 *
 * - `string` / `number` / `boolean` — JSON primitives.
 * - `null` — the explicit null value.
 * - `object` — a nested record (use `fields` on the `SchemaField`).
 * - `array` — a homogeneous list (use `of` on the `SchemaField`).
 * - `enum` — one of a fixed set of values (use `enum` on the `SchemaField`).
 * - `ref` — a reference to another `InterfaceSchema` by name (use `ref`).
 * - `union` — one of several types (use `oneOf`).
 * - `intersection` — all of several types (use `allOf`).
 */
export type SchemaType =
  | 'string' | 'number' | 'boolean' | 'null'
  | 'object' | 'array' | 'enum' | 'ref'
  | 'union' | 'intersection';

/**
 * A single field on an `InterfaceSchema`. The base shape matches the public
 * spec; the extension fields (`of`, `ref`, `oneOf`, `allOf`, `fields`) are
 * used to express composite types and are ignored when not applicable.
 */
export interface SchemaField {
  /** Field name. */
  name: string;
  /** Field type discriminator. */
  type: SchemaType;
  /** Whether the field must be present (and non-`undefined`). */
  required: boolean;
  /** Human-readable description. */
  description?: string;
  /** Default value applied when the field is missing and not required. */
  default?: unknown;
  /** Allowed values for `enum` fields. */
  enum?: unknown[];
  /** Element type for `array` fields. */
  of?: SchemaField;
  /** Referenced schema name for `ref` fields. */
  ref?: string;
  /** Member types for `union` fields. */
  oneOf?: SchemaField[];
  /** Member types for `intersection` fields. */
  allOf?: SchemaField[];
  /** Nested fields for `object` fields. */
  fields?: SchemaField[];
}

/** A named, versioned interface schema. */
export interface InterfaceSchema {
  /** Schema name (PascalCase by convention). */
  name: string;
  /** Schema version (semver). */
  version: string;
  /** Field list. */
  fields: SchemaField[];
  /** Human-readable description. */
  description?: string;
}

/**
 * A parsed semantic version. Follows semver.org: `MAJOR.MINOR.PATCH` with an
 * optional `-prerelease` suffix.
 */
export interface SemverVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

/** A package manifest describing name, version, dependencies, and surface. */
export interface Manifest {
  /** Package name (lowercase, scoped or unscoped). */
  name: string;
  /** Semver version string. */
  version: string;
  /** Map of dependency name → version range. */
  dependencies?: Record<string, string>;
  /** Exported symbols or paths. */
  exports?: string[];
  /** Imported symbols or paths. */
  imports?: string[];
  /** Declared capabilities (e.g. `crypto`, `network`, `filesystem`). */
  capabilities?: string[];
}

/** A single validation error with a stable `code` for programmatic handling. */
export interface ValidationError {
  /** Dotted path to the offending field (e.g. `user.address.zip`). */
  path: string;
  /** Human-readable error message. */
  message: string;
  /** Stable machine code (often an `*Error` code from `errors.ts`). */
  code: string;
  /** Expected type or shape. */
  expected?: string;
  /** Actual type or value observed. */
  actual?: string;
}

/** The result of any validation routine. */
export interface ValidationResult {
  /** Whether validation succeeded. */
  valid: boolean;
  /** Errors produced during validation (empty iff `valid === true`). */
  errors: ValidationError[];
}

/**
 * A breaking change detected by `checkBackwardCompat`.
 *
 * - `field_removed` — a field that existed in the old schema is gone.
 * - `type_changed` — a field's type changed incompatibly.
 * - `required_added` — a new required field was added (callers can't satisfy it).
 * - `enum_value_removed` — an `enum` field lost a value.
 */
export interface BreakingChange {
  type: 'field_removed' | 'type_changed' | 'required_added' | 'enum_value_removed';
  /** Field path the change applies to. */
  field?: string;
  /** Previous value/type description. */
  from?: string;
  /** New value/type description. */
  to?: string;
}

/**
 * An API endpoint contract.
 */
export interface ApiEndpoint {
  /** HTTP method. */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** Route path (e.g. `/users/:id`). */
  path: string;
  /** Optional request body schema. */
  requestSchema?: InterfaceSchema;
  /** Response body schema (required). */
  responseSchema: InterfaceSchema;
}

/** A named, versioned collection of API endpoints. */
export interface ApiContract {
  /** Contract name. */
  name: string;
  /** Contract version (semver). */
  version: string;
  /** Endpoint list. */
  endpoints: ApiEndpoint[];
}

/**
 * A diff between two schemas. `removed` is a list of field names; `added` and
 * `changed` carry full field descriptors.
 */
export interface SchemaDiff {
  /** Fields present in `newSchema` but not `oldSchema`. */
  added: SchemaField[];
  /** Field names present in `oldSchema` but not `newSchema`. */
  removed: string[];
  /** Fields present in both whose definition changed. */
  changed: Array<{ field: string; from: SchemaField; to: SchemaField }>;
}

/** A conflict between two schema versions of the same field. */
export interface SchemaConflict {
  /** Field path that conflicts. */
  field: string;
  /** Local field type name. */
  localType: string;
  /** Remote field type name. */
  remoteType: string;
  /** How the conflict was (or should be) resolved. */
  resolution: 'local' | 'remote' | 'manual';
}

/** A single boundary rule: `from` may call `to` iff `allowed === true`. */
export interface BoundaryRule {
  /** Caller module name. */
  from: string;
  /** Callee module name. */
  to: string;
  /** Whether the call is allowed. */
  allowed: boolean;
  /** Optional human-readable reason. */
  reason?: string;
}

/** A named boundary policy: a list of rules plus a default-allow flag. */
export interface BoundaryPolicy {
  /** Policy name. */
  name: string;
  /** Rule list. */
  rules: BoundaryRule[];
  /** Default action when no rule matches. */
  defaultAllow: boolean;
}

/** A single section in a `ValidationReport`. */
export interface ValidationReportSection {
  /** Section name (e.g. `manifest`, `schema`, `compatibility`). */
  name: string;
  /** Whether this section passed. */
  passed: boolean;
  /** Errors produced by this section. */
  errors: ValidationError[];
}

/** A complete validation report. */
export interface ValidationReport {
  /** Report name (typically the artifact under validation). */
  name: string;
  /** Overall pass/fail (true iff every section passed). */
  passed: boolean;
  /** Per-section results. */
  sections: ValidationReportSection[];
  /** ISO 8601 timestamp. */
  generatedAt: string;
}
