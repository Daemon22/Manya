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

import type { ApiContract, ApiEndpoint, ValidationError, ValidationResult } from '../types.js';
import { validateValue } from '../schema/schema.js';
import { ApiValidationError } from '../errors.js';

/**
 * Looks up an endpoint in a contract by HTTP method and path. Returns
 * `undefined` if no endpoint matches. Path matching is exact (case-sensitive)
 * — path parameters (`:id`) are treated as literal matches unless the caller
 * normalizes them first.
 */
export function findEndpoint(
  contract: ApiContract,
  method: string,
  path: string,
): ApiEndpoint | undefined {
  const m = method.toUpperCase();
  return contract.endpoints.find(e => e.method === m && e.path === path);
}

/**
 * Validates a request body against the contract's endpoint for the given
 * method + path. Returns `{ valid: true }` when:
 *   - the endpoint exists and has no `requestSchema` (any body is allowed), or
 *   - the endpoint exists and `request` satisfies its `requestSchema`.
 *
 * Returns `{ valid: false, errors }` when the endpoint is missing, or when
 * the request body fails schema validation. Never throws.
 */
export function validateRequest(
  contract: ApiContract,
  method: string,
  path: string,
  request: unknown,
): ValidationResult {
  const errors: ValidationError[] = [];
  const endpoint = findEndpoint(contract, method, path);
  if (!endpoint) {
    errors.push({
      path,
      message: `no endpoint matches ${method.toUpperCase()} ${path} in contract "${contract.name}"`,
      code: 'API_VALIDATION_ERROR',
      expected: 'known endpoint',
      actual: `${method.toUpperCase()} ${path}`,
    });
    return { valid: false, errors };
  }
  if (!endpoint.requestSchema) {
    // No request schema declared — any body (including undefined) is valid.
    return { valid: true, errors: [] };
  }
  return validateValue(endpoint.requestSchema, request);
}

/**
 * Validates a response body against the contract's endpoint for the given
 * method + path. Every endpoint must declare a `responseSchema`; a missing
 * endpoint or a response that fails schema validation produces errors.
 * Never throws.
 */
export function validateResponse(
  contract: ApiContract,
  method: string,
  path: string,
  response: unknown,
): ValidationResult {
  const errors: ValidationError[] = [];
  const endpoint = findEndpoint(contract, method, path);
  if (!endpoint) {
    errors.push({
      path,
      message: `no endpoint matches ${method.toUpperCase()} ${path} in contract "${contract.name}"`,
      code: 'API_VALIDATION_ERROR',
      expected: 'known endpoint',
      actual: `${method.toUpperCase()} ${path}`,
    });
    return { valid: false, errors };
  }
  return validateValue(endpoint.responseSchema, response);
}

/**
 * Validates a full API contract's structure: ensures name, version, and a
 * non-empty endpoints array, and that every endpoint has method, path, and a
 * responseSchema. Throws `ApiValidationError` on the first structural defect.
 */
export function assertValidContract(contract: unknown): asserts contract is ApiContract {
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
    throw new ApiValidationError('API contract must be a non-array object');
  }
  const c = contract as Partial<ApiContract>;
  if (typeof c.name !== 'string' || c.name.length === 0) {
    throw new ApiValidationError('API contract.name must be a non-empty string');
  }
  if (typeof c.version !== 'string' || c.version.length === 0) {
    throw new ApiValidationError(`contract "${c.name}".version must be a non-empty string`);
  }
  if (!Array.isArray(c.endpoints) || c.endpoints.length === 0) {
    throw new ApiValidationError(`contract "${c.name}" must declare a non-empty endpoints array`);
  }
  for (let i = 0; i < c.endpoints.length; i++) {
    const e = c.endpoints[i];
    if (!e || typeof e !== 'object') {
      throw new ApiValidationError(`endpoint[${i}] in contract "${c.name}" must be an object`);
    }
    if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(e.method ?? '')) {
      throw new ApiValidationError(`endpoint[${i}].method must be one of GET|POST|PUT|DELETE|PATCH`);
    }
    if (typeof e.path !== 'string' || e.path.length === 0) {
      throw new ApiValidationError(`endpoint[${i}].path must be a non-empty string`);
    }
    if (!e.responseSchema || typeof e.responseSchema !== 'object') {
      throw new ApiValidationError(`endpoint[${i}] (${e.method} ${e.path}) must declare a responseSchema`);
    }
  }
}
