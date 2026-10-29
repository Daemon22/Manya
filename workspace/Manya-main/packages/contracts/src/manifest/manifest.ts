/**
 * @manya/contracts — manifest validation.
 *
 * Validates a `Manifest` describing a package's name, version, dependencies,
 * exports, imports, and capabilities. Each failure mode carries a stable code
 * (see `MANIFEST_ERROR_CODES`) so callers can react programmatically.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { Manifest, ValidationError, ValidationResult } from '../types.js';
import { MANIFEST_ERROR_CODES, ManifestError } from '../errors.js';

/** Regex for a valid (possibly scoped, lowercase) npm-style package name. */
const NAME_PATTERN = /^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/;

/** Regex for a full semver 2.0.0 version (with optional prerelease/build). */
const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][\w-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][\w-]*))*))?(?:\+([\w.-]+))?$/;

/**
 * Validates a manifest structurally. Returns `{ valid, errors }` where each
 * error's `code` is one of `MANIFEST_ERROR_CODES.*`.
 */
export function validateManifest(manifest: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    errors.push({
      path: '',
      message: 'manifest must be a non-array object',
      code: MANIFEST_ERROR_CODES.MISSING_FIELD,
      expected: 'object',
      actual: manifest === null ? 'null' : typeof manifest,
    });
    return { valid: false, errors };
  }

  const m = manifest as Partial<Manifest>;

  // name
  if (typeof m.name !== 'string' || m.name.length === 0) {
    errors.push({
      path: 'name',
      message: 'manifest.name must be a non-empty string',
      code: MANIFEST_ERROR_CODES.MISSING_FIELD,
      expected: 'string',
      actual: typeof m.name,
    });
  } else if (!NAME_PATTERN.test(m.name)) {
    errors.push({
      path: 'name',
      message: `manifest.name "${m.name}" is not a valid package name`,
      code: MANIFEST_ERROR_CODES.INVALID_NAME,
      expected: 'lowercase scoped or unscoped package name',
      actual: m.name,
    });
  }

  // version
  if (typeof m.version !== 'string' || m.version.length === 0) {
    errors.push({
      path: 'version',
      message: 'manifest.version must be a non-empty semver string',
      code: MANIFEST_ERROR_CODES.MISSING_FIELD,
      expected: 'semver string',
      actual: typeof m.version,
    });
  } else if (!SEMVER_PATTERN.test(m.version)) {
    errors.push({
      path: 'version',
      message: `manifest.version "${m.version}" is not a valid semver`,
      code: MANIFEST_ERROR_CODES.INVALID_VERSION,
      expected: 'MAJOR.MINOR.PATCH[-prerelease][+build]',
      actual: m.version,
    });
  }

  // dependencies
  if (m.dependencies !== undefined) {
    if (!m.dependencies || typeof m.dependencies !== 'object' || Array.isArray(m.dependencies)) {
      errors.push({
        path: 'dependencies',
        message: 'manifest.dependencies must be a record of name → range',
        code: MANIFEST_ERROR_CODES.INVALID_DEPENDENCIES,
        expected: 'Record<string, string>',
        actual: describeType(m.dependencies),
      });
    } else {
      for (const [dep, range] of Object.entries(m.dependencies)) {
        if (typeof range !== 'string' || range.length === 0) {
          errors.push({
            path: `dependencies.${dep}`,
            message: `dependency "${dep}" must map to a non-empty version range string`,
            code: MANIFEST_ERROR_CODES.INVALID_DEPENDENCY,
            expected: 'string',
            actual: typeof range,
          });
        }
      }
    }
  }

  // exports / imports / capabilities — optional arrays of strings.
  if (m.exports !== undefined) validateStringArray(m.exports, 'exports', errors);
  if (m.imports !== undefined) validateStringArray(m.imports, 'imports', errors);
  if (m.capabilities !== undefined) validateStringArray(m.capabilities, 'capabilities', errors);

  return { valid: errors.length === 0, errors };
}

/** Helper: validates an optional array-of-strings field. */
function validateStringArray(value: unknown, field: 'exports' | 'imports' | 'capabilities', errors: ValidationError[]): void {
  const code =
    field === 'exports' ? MANIFEST_ERROR_CODES.INVALID_EXPORTS :
    field === 'imports' ? MANIFEST_ERROR_CODES.INVALID_IMPORTS :
    MANIFEST_ERROR_CODES.INVALID_CAPABILITIES;
  if (!Array.isArray(value)) {
    errors.push({
      path: field,
      message: `manifest.${field} must be an array of strings`,
      code,
      expected: 'string[]',
      actual: describeType(value),
    });
    return;
  }
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== 'string' || (value[i] as string).length === 0) {
      errors.push({
        path: `${field}[${i}]`,
        message: `manifest.${field}[${i}] must be a non-empty string`,
        code,
        expected: 'string',
        actual: describeType(value[i]),
      });
    }
  }
}

/**
 * Throws a `ManifestError` (with the first error's code) if the manifest is
 * invalid. Convenience for callers that prefer exception-based control flow.
 */
export function assertManifest(manifest: unknown): asserts manifest is Manifest {
  const result = validateManifest(manifest);
  if (!result.valid) {
    const first = result.errors[0];
    throw new ManifestError(
      first ? `${first.path ? first.path + ': ' : ''}${first.message}` : 'invalid manifest',
      first?.code,
    );
  }
}

/** Returns `true` iff `v` is a structurally valid manifest. */
export function isValidManifest(manifest: unknown): manifest is Manifest {
  return validateManifest(manifest).valid;
}

/** Short human-readable description of a value's type (mirrors schema.describeType). */
function describeType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}
