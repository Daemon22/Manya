/**
 * @manya/contracts — schema definition language.
 *
 * Provides a JSON-ish schema definition language centered on the
 * `InterfaceSchema` type. `compileSchema` normalizes a definition (either an
 * already-compiled `InterfaceSchema` or a raw definition object) into a
 * canonical `InterfaceSchema`; `validateValue` validates any JavaScript value
 * against a compiled schema, returning a `ValidationResult`.
 *
 * Supported field types:
 *   - `string` / `number` / `boolean` / `null` — JSON primitives.
 *   - `object` — nested record (use `fields`).
 *   - `array` — homogeneous list (use `of`).
 *   - `enum` — one of a fixed set (use `enum`).
 *   - `ref` — reference to another schema by name (use `ref`).
 *   - `union` — one of several (use `oneOf`).
 *   - `intersection` — all of several (use `allOf`).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { InterfaceSchema, SchemaField, SchemaType, ValidationResult } from '../types.js';
/** Set of all valid `SchemaType` literal names. */
export declare const SCHEMA_TYPES: ReadonlySet<string>;
/**
 * A raw schema definition accepted by `compileSchema`. Either an
 * already-compiled `InterfaceSchema` or a JSON-ish object whose `fields` may
 * be a record mapping field name → field definition (with `required` defaulted
 * to `true` when absent).
 */
export type SchemaDefinition = InterfaceSchema | {
    name: string;
    version: string;
    description?: string;
    fields?: SchemaField[] | Record<string, SchemaFieldDefinition>;
};
/** A raw field definition (a partial `SchemaField` minus the name). */
export interface SchemaFieldDefinition {
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
/**
 * Compiles a raw schema definition into a normalized `InterfaceSchema`.
 *
 * Accepted inputs:
 *   - an already-compiled `InterfaceSchema` (returned as a defensive copy).
 *   - a definition object whose `fields` may be a record (in which case
 *     `required` defaults to `true`).
 *
 * Throws `SchemaError` on malformed input.
 */
export declare function compileSchema(definition: SchemaDefinition): InterfaceSchema;
/**
 * Validates a JavaScript value against a compiled `InterfaceSchema`.
 *
 * Returns a `ValidationResult` with `valid: true` iff the value satisfies
 * every field's type, `required`, and `enum` constraints. Composite types
 * (`object`, `array`, `union`, `intersection`, `ref`) are recursively
 * validated; `ref` fields are matched purely by name and treated as opaque
 * (a referenced schema is considered satisfied when present in `refs`).
 *
 * @param schema Compiled interface schema.
 * @param value Value to validate.
 * @param refs Optional map of referenced interface schemas (for `ref` fields).
 */
export declare function validateValue(schema: InterfaceSchema, value: unknown, refs?: Record<string, InterfaceSchema>): ValidationResult;
/** Returns a short, human-readable description of a value's type. */
export declare function describeType(value: unknown): string;
//# sourceMappingURL=schema.d.ts.map