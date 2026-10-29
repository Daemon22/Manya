/**
 * @manya/contracts — version compatibility.
 *
 * Provides semver parsing (`parseSemver`), ordering (`compareSemver`), range
 * satisfaction (`satisfies`), and structural backward-compatibility checking
 * (`checkBackwardCompat`) between two versions of an `InterfaceSchema`.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import type { BreakingChange, InterfaceSchema, SemverVersion } from '../types.js';
import { CompatibilityError } from '../errors.js';

/** Full semver 2.0.0 regex with optional prerelease and build metadata. */
const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][\w-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][\w-]*))*))?(?:\+([\w.-]+))?$/;

/** Returns `true` iff `v` is a valid semver string. */
export function isSemver(v: string): boolean {
  return typeof v === 'string' && SEMVER_PATTERN.test(v);
}

/**
 * Parses a semver string into a `SemverVersion`. Throws `CompatibilityError`
 * on invalid input.
 */
export function parseSemver(v: string): SemverVersion {
  if (typeof v !== 'string') {
    throw new CompatibilityError(`expected semver string, got ${typeof v}`);
  }
  const m = v.match(SEMVER_PATTERN);
  if (!m) {
    throw new CompatibilityError(`"${v}" is not a valid semver`);
  }
  const [, major, minor, patch, prerelease] = m;
  const out: SemverVersion = {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
  };
  if (prerelease !== undefined && prerelease.length > 0) out.prerelease = prerelease;
  return out;
}

/**
 * Compares two semver strings. Returns -1 if `a < b`, 0 if `a === b`, 1 if
 * `a > b`. Throws `CompatibilityError` if either is invalid.
 *
 * Prerelease handling follows semver.org §11: a version with a prerelease is
 * lower than the same version without one; prerelease identifiers compare
 * numerically when both are numeric, lexically otherwise, and numeric
 * identifiers are lower than alphanumeric ones.
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  return compareParsedSemver(pa, pb);
}

/** Compares two parsed `SemverVersion` values. */
export function compareParsedSemver(a: SemverVersion, b: SemverVersion): -1 | 0 | 1 {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;

  const ap = a.prerelease;
  const bp = b.prerelease;
  // A version WITHOUT prerelease is greater than one WITH prerelease.
  if (ap === undefined && bp === undefined) return 0;
  if (ap === undefined) return 1;
  if (bp === undefined) return -1;
  return comparePrerelease(ap, bp);
}

/** Compares two prerelease strings per semver.org §11. */
function comparePrerelease(a: string, b: string): -1 | 0 | 1 {
  const aa = a.split('.');
  const bb = b.split('.');
  const n = Math.min(aa.length, bb.length);
  for (let i = 0; i < n; i++) {
    const x = aa[i];
    const y = bb[i];
    const xn = /^[0-9]+$/.test(x);
    const yn = /^[0-9]+$/.test(y);
    if (xn && yn) {
      const xi = Number(x);
      const yi = Number(y);
      if (xi !== yi) return xi < yi ? -1 : 1;
    } else if (xn !== yn) {
      // Numeric identifiers are lower than alphanumeric.
      return xn ? -1 : 1;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  if (aa.length === bb.length) return 0;
  return aa.length < bb.length ? -1 : 1;
}

/**
 * Returns `true` iff `version` satisfies `range`. Supported range forms:
 *   - `*`              — any version.
 *   - `^1.2.3`         — compatible-with: `>=1.2.3 <2.0.0` (or `<1.3.0` if major is 0).
 *   - `~1.2.3`         — patch-level: `>=1.2.3 <1.3.0`.
 *   - `1.2.3`          — exact match.
 *   - `>=1.2.3`, `>1.2.3`, `<=1.2.3`, `<1.2.3` — comparison.
 *
 * Throws `CompatibilityError` on malformed input.
 */
export function satisfies(version: string, range: string): boolean {
  const v = parseSemver(version);
  const r = range.trim();
  if (r === '' || r === '*') return true;

  // Comparison operators.
  if (r.startsWith('>=')) return compareSemver(version, r.slice(2).trim()) >= 0;
  if (r.startsWith('<=')) return compareSemver(version, r.slice(2).trim()) <= 0;
  if (r.startsWith('>')) return compareSemver(version, r.slice(1).trim()) > 0;
  if (r.startsWith('<')) return compareSemver(version, r.slice(1).trim()) < 0;

  // Caret — compatible-with.
  if (r.startsWith('^')) {
    const target = parseSemver(r.slice(1).trim());
    // version >= target
    if (compareParsedSemver(v, target) < 0) return false;
    // version < next-incompatible
    if (target.major > 0) {
      return v.major === target.major;
    }
    if (target.minor > 0) {
      return v.major === 0 && v.minor === target.minor;
    }
    // 0.0.x — patch must match
    return v.major === 0 && v.minor === 0 && v.patch === target.patch;
  }

  // Tilde — patch-level.
  if (r.startsWith('~')) {
    const target = parseSemver(r.slice(1).trim());
    if (compareParsedSemver(v, target) < 0) return false;
    if (target.major !== v.major) return false;
    return v.minor === target.minor;
  }

  // Exact match.
  return compareSemver(version, r) === 0;
}

/**
 * Checks whether `newSchema` is backward-compatible with `oldSchema`.
 *
 * A breaking change is any of:
 *   - `field_removed` — a field present in `oldSchema` is missing in `newSchema`.
 *   - `type_changed`  — a field's `type` changed between versions.
 *   - `required_added` — a new field is marked `required: true`.
 *   - `enum_value_removed` — an `enum` field lost one or more allowed values.
 *
 * Returns `{ compatible, breakingChanges }` where `compatible === true` iff
 * `breakingChanges.length === 0`.
 */
export function checkBackwardCompat(
  oldSchema: InterfaceSchema,
  newSchema: InterfaceSchema,
): { compatible: boolean; breakingChanges: BreakingChange[] } {
  const breakingChanges: BreakingChange[] = [];
  const oldByName = new Map<string, typeof oldSchema.fields[number]>();
  for (const f of oldSchema.fields) oldByName.set(f.name, f);
  const newByName = new Map<string, typeof newSchema.fields[number]>();
  for (const f of newSchema.fields) newByName.set(f.name, f);

  // 1. Field removals and type changes.
  for (const [name, oldField] of oldByName) {
    const newField = newByName.get(name);
    if (!newField) {
      breakingChanges.push({
        type: 'field_removed',
        field: name,
        from: oldField.type,
      });
      continue;
    }
    if (oldField.type !== newField.type) {
      breakingChanges.push({
        type: 'type_changed',
        field: name,
        from: oldField.type,
        to: newField.type,
      });
    }
    // 2. Enum value removal.
    if (oldField.type === 'enum' && newField.type === 'enum') {
      const oldSet = new Set(oldField.enum?.map(v => JSON.stringify(v)) ?? []);
      const newSet = new Set(newField.enum?.map(v => JSON.stringify(v)) ?? []);
      for (const v of oldSet) {
        if (!newSet.has(v)) {
          breakingChanges.push({
            type: 'enum_value_removed',
            field: name,
            from: v,
            to: undefined,
          });
        }
      }
    }
  }

  // 3. Required field additions.
  for (const [name, newField] of newByName) {
    if (!oldByName.has(name) && newField.required) {
      breakingChanges.push({
        type: 'required_added',
        field: name,
        to: newField.type,
      });
    }
  }

  return { compatible: breakingChanges.length === 0, breakingChanges };
}
