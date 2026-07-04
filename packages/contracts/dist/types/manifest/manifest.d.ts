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
import type { Manifest, ValidationResult } from '../types.js';
/**
 * Validates a manifest structurally. Returns `{ valid, errors }` where each
 * error's `code` is one of `MANIFEST_ERROR_CODES.*`.
 */
export declare function validateManifest(manifest: unknown): ValidationResult;
/**
 * Throws a `ManifestError` (with the first error's code) if the manifest is
 * invalid. Convenience for callers that prefer exception-based control flow.
 */
export declare function assertManifest(manifest: unknown): asserts manifest is Manifest;
/** Returns `true` iff `v` is a structurally valid manifest. */
export declare function isValidManifest(manifest: unknown): manifest is Manifest;
//# sourceMappingURL=manifest.d.ts.map