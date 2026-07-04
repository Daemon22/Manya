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
/** Returns `true` iff `v` is a valid semver string. */
export declare function isSemver(v: string): boolean;
/**
 * Parses a semver string into a `SemverVersion`. Throws `CompatibilityError`
 * on invalid input.
 */
export declare function parseSemver(v: string): SemverVersion;
/**
 * Compares two semver strings. Returns -1 if `a < b`, 0 if `a === b`, 1 if
 * `a > b`. Throws `CompatibilityError` if either is invalid.
 *
 * Prerelease handling follows semver.org §11: a version with a prerelease is
 * lower than the same version without one; prerelease identifiers compare
 * numerically when both are numeric, lexically otherwise, and numeric
 * identifiers are lower than alphanumeric ones.
 */
export declare function compareSemver(a: string, b: string): -1 | 0 | 1;
/** Compares two parsed `SemverVersion` values. */
export declare function compareParsedSemver(a: SemverVersion, b: SemverVersion): -1 | 0 | 1;
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
export declare function satisfies(version: string, range: string): boolean;
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
export declare function checkBackwardCompat(oldSchema: InterfaceSchema, newSchema: InterfaceSchema): {
    compatible: boolean;
    breakingChanges: BreakingChange[];
};
//# sourceMappingURL=compatibility.d.ts.map