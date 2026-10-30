"use strict";
/**
 * @manya-os/contracts — schema definition language.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHEMA_TYPES = void 0;
exports.compileSchema = compileSchema;
exports.validateValue = validateValue;
exports.describeType = describeType;
const errors_js_1 = require("../errors.js");
/** Set of all valid `SchemaType` literal names. */
exports.SCHEMA_TYPES = new Set([
    'string', 'number', 'boolean', 'null',
    'object', 'array', 'enum', 'ref',
    'union', 'intersection',
]);
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
function compileSchema(definition) {
    if (!definition || typeof definition !== 'object') {
        throw new errors_js_1.SchemaError('schema definition must be an object');
    }
    const def = definition;
    if (typeof def.name !== 'string' || def.name.length === 0) {
        throw new errors_js_1.SchemaError('schema definition must have a non-empty name');
    }
    if (typeof def.version !== 'string' || def.version.length === 0) {
        throw new errors_js_1.SchemaError(`schema "${def.name}" must have a non-empty version`);
    }
    const fields = compileFields(def.name, def.fields);
    return {
        name: def.name,
        version: def.version,
        fields,
        ...(def.description ? { description: def.description } : {}),
    };
}
/** Normalizes a `fields` value (array or record) into a `SchemaField[]`. */
function compileFields(schemaName, raw) {
    if (raw === undefined || raw === null)
        return [];
    if (Array.isArray(raw)) {
        return raw.map((f, i) => compileField(`${schemaName}.fields[${i}]`, f));
    }
    if (typeof raw === 'object') {
        const out = [];
        for (const [name, def] of Object.entries(raw)) {
            const compiled = compileField(`${schemaName}.fields.${name}`, def);
            // Ensure the name from the record key wins.
            compiled.name = name;
            out.push(compiled);
        }
        return out;
    }
    throw new errors_js_1.SchemaError(`schema "${schemaName}" has invalid fields (expected array or record)`);
}
/** Normalizes a single field definition. */
function compileField(path, def) {
    if (!def || typeof def !== 'object') {
        throw new errors_js_1.SchemaError(`field at ${path} must be an object`);
    }
    const d = def;
    const type = (d.type ?? 'string');
    if (!exports.SCHEMA_TYPES.has(type)) {
        throw new errors_js_1.SchemaError(`field at ${path} has invalid type "${type}"; expected one of ${[...exports.SCHEMA_TYPES].join(', ')}`);
    }
    // Validate enum fields have an `enum` array.
    if (type === 'enum' && (!Array.isArray(d.enum) || d.enum.length === 0)) {
        throw new errors_js_1.SchemaError(`enum field at ${path} must declare a non-empty "enum" array`);
    }
    // Validate ref fields have a `ref` string.
    if (type === 'ref' && (typeof d.ref !== 'string' || d.ref.length === 0)) {
        throw new errors_js_1.SchemaError(`ref field at ${path} must declare a non-empty "ref" string`);
    }
    // Validate array fields have an `of` element.
    if (type === 'array' && (!d.of || typeof d.of !== 'object')) {
        throw new errors_js_1.SchemaError(`array field at ${path} must declare an "of" element type`);
    }
    // Validate union fields have a non-empty `oneOf`.
    if (type === 'union' && (!Array.isArray(d.oneOf) || d.oneOf.length === 0)) {
        throw new errors_js_1.SchemaError(`union field at ${path} must declare a non-empty "oneOf" array`);
    }
    // Validate intersection fields have a non-empty `allOf`.
    if (type === 'intersection' && (!Array.isArray(d.allOf) || d.allOf.length === 0)) {
        throw new errors_js_1.SchemaError(`intersection field at ${path} must declare a non-empty "allOf" array`);
    }
    const field = {
        name: d.name ?? path.split('.').pop() ?? '',
        type,
        required: d.required ?? true,
    };
    if (d.description !== undefined)
        field.description = d.description;
    if (d.default !== undefined)
        field.default = d.default;
    if (Array.isArray(d.enum))
        field.enum = d.enum;
    if (d.ref !== undefined)
        field.ref = d.ref;
    if (d.of !== undefined)
        field.of = compileField(`${path}.of`, d.of);
    if (Array.isArray(d.oneOf)) {
        field.oneOf = d.oneOf.map((m, i) => compileField(`${path}.oneOf[${i}]`, m));
    }
    if (Array.isArray(d.allOf)) {
        field.allOf = d.allOf.map((m, i) => compileField(`${path}.allOf[${i}]`, m));
    }
    if (d.fields !== undefined) {
        field.fields = compileFields(path, d.fields);
    }
    return field;
}
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
function validateValue(schema, value, refs) {
    const errors = [];
    validateObject(schema.fields, value, schema.name, errors, refs ?? {});
    return { valid: errors.length === 0, errors };
}
/** Validates an object value against a list of fields. */
function validateObject(fields, value, path, errors, refs) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        errors.push({
            path,
            message: `expected object, got ${describeType(value)}`,
            code: 'SCHEMA_ERROR',
            expected: 'object',
            actual: describeType(value),
        });
        return;
    }
    const record = value;
    for (const field of fields) {
        const fieldPath = path ? `${path}.${field.name}` : field.name;
        const present = Object.prototype.hasOwnProperty.call(record, field.name);
        if (!present) {
            if (field.required) {
                errors.push({
                    path: fieldPath,
                    message: `required field "${field.name}" is missing`,
                    code: 'SCHEMA_ERROR',
                    expected: 'present',
                    actual: 'missing',
                });
            }
            continue;
        }
        const v = record[field.name];
        validateField(field, v, fieldPath, errors, refs);
    }
}
/** Validates a single field's value against its definition. */
function validateField(field, value, path, errors, refs) {
    switch (field.type) {
        case 'string':
            if (typeof value !== 'string') {
                errors.push(typeError(path, 'string', value));
            }
            break;
        case 'number':
            if (typeof value !== 'number' || Number.isNaN(value)) {
                errors.push(typeError(path, 'number', value));
            }
            break;
        case 'boolean':
            if (typeof value !== 'boolean') {
                errors.push(typeError(path, 'boolean', value));
            }
            break;
        case 'null':
            if (value !== null) {
                errors.push(typeError(path, 'null', value));
            }
            break;
        case 'enum':
            if (!Array.isArray(field.enum) || !field.enum.includes(value)) {
                errors.push({
                    path,
                    message: `value ${JSON.stringify(value)} is not in enum [${(field.enum ?? []).map(v => JSON.stringify(v)).join(', ')}]`,
                    code: 'SCHEMA_ERROR',
                    expected: `enum[${(field.enum ?? []).length}]`,
                    actual: describeType(value),
                });
            }
            break;
        case 'object':
            if (value === null || typeof value !== 'object' || Array.isArray(value)) {
                errors.push(typeError(path, 'object', value));
            }
            else if (field.fields && field.fields.length > 0) {
                validateObject(field.fields, value, path, errors, refs);
            }
            break;
        case 'array':
            if (!Array.isArray(value)) {
                errors.push(typeError(path, 'array', value));
            }
            else if (field.of) {
                for (let i = 0; i < value.length; i++) {
                    validateField(field.of, value[i], `${path}[${i}]`, errors, refs);
                }
            }
            break;
        case 'ref': {
            const refName = field.ref ?? '';
            const refSchema = refs[refName];
            if (!refSchema) {
                // Without a referenced schema, accept any non-null value.
                if (value === undefined || value === null) {
                    errors.push(typeError(path, `ref(${refName})`, value));
                }
                break;
            }
            validateObject(refSchema.fields, value, path, errors, refs);
            break;
        }
        case 'union': {
            const members = field.oneOf ?? [];
            // Try each member; the field validates iff at least one accepts the value.
            const memberErrors = [];
            let matched = false;
            for (const member of members) {
                const sub = [];
                validateField(member, value, path, sub, refs);
                if (sub.length === 0) {
                    matched = true;
                    break;
                }
                memberErrors.push(sub);
            }
            if (!matched) {
                errors.push({
                    path,
                    message: `value did not match any union member at ${path}`,
                    code: 'SCHEMA_ERROR',
                    expected: `union[${members.length}]`,
                    actual: describeType(value),
                });
            }
            break;
        }
        case 'intersection': {
            const members = field.allOf ?? [];
            // The field validates iff every member accepts the value.
            for (const member of members) {
                validateField(member, value, path, errors, refs);
            }
            break;
        }
        default:
            // Unknown type — treat as a validation error rather than throwing,
            // so a single bad field doesn't crash a whole validation pass.
            errors.push({
                path,
                message: `unknown schema type "${field.type}" at ${path}`,
                code: 'SCHEMA_ERROR',
                expected: 'known type',
                actual: field.type,
            });
    }
}
/** Builds a `ValidationError` for a primitive type mismatch. */
function typeError(path, expected, value) {
    return {
        path,
        message: `expected ${expected} at ${path}, got ${describeType(value)}`,
        code: 'SCHEMA_ERROR',
        expected,
        actual: describeType(value),
    };
}
/** Returns a short, human-readable description of a value's type. */
function describeType(value) {
    if (value === null)
        return 'null';
    if (Array.isArray(value))
        return 'array';
    if (value instanceof Date)
        return 'date';
    return typeof value;
}
//# sourceMappingURL=schema.js.map