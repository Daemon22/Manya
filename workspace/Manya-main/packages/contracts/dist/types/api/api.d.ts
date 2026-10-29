/**
 * @manya/contracts — API contract validation.
 *
 * Validates HTTP requests and responses against a named `ApiContract`. Each
 * endpoint is matched by `method` + `path`; the corresponding request and
 * response bodies are validated against their declared `InterfaceSchema`s
 * using the schema validator from `src/schema`.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { ApiContract, ApiEndpoint, ValidationResult } from '../types.js';
/**
 * Looks up an endpoint in a contract by HTTP method and path. Returns
 * `undefined` if no endpoint matches. Path matching is exact (case-sensitive)
 * — path parameters (`:id`) are treated as literal matches unless the caller
 * normalizes them first.
 */
export declare function findEndpoint(contract: ApiContract, method: string, path: string): ApiEndpoint | undefined;
/**
 * Validates a request body against the contract's endpoint for the given
 * method + path. Returns `{ valid: true }` when:
 *   - the endpoint exists and has no `requestSchema` (any body is allowed), or
 *   - the endpoint exists and `request` satisfies its `requestSchema`.
 *
 * Returns `{ valid: false, errors }` when the endpoint is missing, or when
 * the request body fails schema validation. Never throws.
 */
export declare function validateRequest(contract: ApiContract, method: string, path: string, request: unknown): ValidationResult;
/**
 * Validates a response body against the contract's endpoint for the given
 * method + path. Every endpoint must declare a `responseSchema`; a missing
 * endpoint or a response that fails schema validation produces errors.
 * Never throws.
 */
export declare function validateResponse(contract: ApiContract, method: string, path: string, response: unknown): ValidationResult;
/**
 * Validates a full API contract's structure: ensures name, version, and a
 * non-empty endpoints array, and that every endpoint has method, path, and a
 * responseSchema. Throws `ApiValidationError` on the first structural defect.
 */
export declare function assertValidContract(contract: unknown): asserts contract is ApiContract;
//# sourceMappingURL=api.d.ts.map