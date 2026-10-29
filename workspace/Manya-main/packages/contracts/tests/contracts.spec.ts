/**
 * @manya/contracts — comprehensive unit tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import {
  // schema
  compileSchema, validateValue, describeType, SCHEMA_TYPES,
  // manifest
  validateManifest, assertManifest, isValidManifest, MANIFEST_ERROR_CODES,
  // compatibility
  isSemver, parseSemver, compareSemver, satisfies, checkBackwardCompat,
  // api
  findEndpoint, validateRequest, validateResponse, assertValidContract,
  // sync
  diffSchemas, mergeSchemas, fieldsEqual,
  // boundaries
  enforceBoundary, detectViolations, matchRule, isPolicySatisfied,
  // reporting
  buildReport, aggregateReports, serializeReport, summarizeReport,
  // errors
  ContractsError, SchemaError, ManifestError, CompatibilityError,
  ApiValidationError, SyncError, BoundaryError, ReportingError,
  // logging
  shouldScrubField, scrubMetadata,
} from '../src';
import type {
  ApiContract, BoundaryPolicy, InterfaceSchema, Manifest,
} from '../src';

// ---------- schema: compileSchema ----------
describe('schema: compileSchema', () => {
  test('compiles a record-style definition with defaulted required', () => {
    const s = compileSchema({
      name: 'User',
      version: '1.0.0',
      fields: {
        id: { type: 'string' },
        age: { type: 'number', required: false },
      },
    });
    expect(s.name).toBe('User');
    expect(s.fields).toHaveLength(2);
    expect(s.fields[0].name).toBe('id');
    expect(s.fields[0].required).toBe(true);
    expect(s.fields[1].required).toBe(false);
  });

  test('compiles an array-style definition', () => {
    const s = compileSchema({
      name: 'P', version: '1.0.0',
      fields: [{ name: 'a', type: 'string', required: true }],
    });
    expect(s.fields[0].name).toBe('a');
  });

  test('passes through an already-compiled InterfaceSchema (defensive copy)', () => {
    const src: InterfaceSchema = {
      name: 'X', version: '1.0.0',
      fields: [{ name: 'a', type: 'string', required: true }],
    };
    const compiled = compileSchema(src);
    expect(compiled.name).toBe('X');
    // Mutating the source should not affect the compiled result.
    src.name = 'Y';
    expect(compiled.name).toBe('X');
  });

  test('rejects empty name', () => {
    expect(() => compileSchema({ name: '', version: '1.0.0', fields: {} } as never))
      .toThrow(SchemaError);
  });

  test('rejects unknown field type', () => {
    expect(() => compileSchema({
      name: 'X', version: '1.0.0',
      fields: { a: { type: 'wibble' as never } },
    })).toThrow(SchemaError);
  });

  test('rejects enum field without enum array', () => {
    expect(() => compileSchema({
      name: 'X', version: '1.0.0',
      fields: { a: { type: 'enum' } },
    })).toThrow(SchemaError);
  });

  test('rejects ref field without ref string', () => {
    expect(() => compileSchema({
      name: 'X', version: '1.0.0',
      fields: { a: { type: 'ref' } },
    })).toThrow(SchemaError);
  });

  test('rejects array field without of element', () => {
    expect(() => compileSchema({
      name: 'X', version: '1.0.0',
      fields: { a: { type: 'array' } },
    })).toThrow(SchemaError);
  });

  test('rejects union field without oneOf', () => {
    expect(() => compileSchema({
      name: 'X', version: '1.0.0',
      fields: { a: { type: 'union' } },
    })).toThrow(SchemaError);
  });

  test('compiles nested object field', () => {
    const s = compileSchema({
      name: 'X', version: '1.0.0',
      fields: {
        addr: {
          type: 'object', required: true,
          fields: { city: { type: 'string' } },
        },
      },
    });
    expect(s.fields[0].fields?.[0].name).toBe('city');
  });
});

// ---------- schema: validateValue ----------
describe('schema: validateValue', () => {
  const User = compileSchema({
    name: 'User', version: '1.0.0',
    fields: {
      id: { type: 'string' },
      age: { type: 'number', required: false },
      active: { type: 'boolean' },
      role: { type: 'enum', enum: ['admin', 'user'] },
    },
  });

  test('accepts a valid value', () => {
    const r = validateValue(User, { id: 'u1', age: 30, active: true, role: 'admin' });
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  test('rejects missing required field', () => {
    const r = validateValue(User, { active: true, role: 'admin' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'User.id')).toBe(true);
  });

  test('rejects wrong primitive type (string vs number)', () => {
    const r = validateValue(User, { id: 42, active: true, role: 'admin' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'User.id')).toBe(true);
  });

  test('rejects invalid enum value', () => {
    const r = validateValue(User, { id: 'u1', active: true, role: 'superuser' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'User.role')).toBe(true);
  });

  test('accepts null type', () => {
    const S = compileSchema({
      name: 'N', version: '1.0.0',
      fields: { x: { type: 'null' } },
    });
    expect(validateValue(S, { x: null }).valid).toBe(true);
    expect(validateValue(S, { x: 0 }).valid).toBe(false);
  });

  test('validates array of strings', () => {
    const S = compileSchema({
      name: 'L', version: '1.0.0',
      fields: { tags: { type: 'array', of: { type: 'string' } } },
    });
    expect(validateValue(S, { tags: ['a', 'b'] }).valid).toBe(true);
    expect(validateValue(S, { tags: ['a', 1] }).valid).toBe(false);
  });

  test('validates union (string | number)', () => {
    const S = compileSchema({
      name: 'U', version: '1.0.0',
      fields: { x: { type: 'union', oneOf: [{ type: 'string' }, { type: 'number' }] } },
    });
    expect(validateValue(S, { x: 'hi' }).valid).toBe(true);
    expect(validateValue(S, { x: 7 }).valid).toBe(true);
    expect(validateValue(S, { x: true }).valid).toBe(false);
  });

  test('validates intersection (object with two field sets)', () => {
    const S = compileSchema({
      name: 'I', version: '1.0.0',
      fields: {
        x: {
          type: 'intersection', required: true,
          allOf: [
            { name: 'a', type: 'object', required: true, fields: { id: { type: 'string' } } },
            { name: 'b', type: 'object', required: true, fields: { name: { type: 'string' } } },
          ],
        },
      },
    });
    expect(validateValue(S, { x: { id: '1', name: 'foo' } }).valid).toBe(true);
    expect(validateValue(S, { x: { id: '1' } }).valid).toBe(false);
  });

  test('validates ref against a referenced schema', () => {
    const Address = compileSchema({
      name: 'Address', version: '1.0.0',
      fields: { street: { type: 'string' }, city: { type: 'string' } },
    });
    const Person = compileSchema({
      name: 'Person', version: '1.0.0',
      fields: { home: { type: 'ref', ref: 'Address' } },
    });
    expect(validateValue(Person, { home: { street: '1 Main', city: 'CT' } }, { Address }).valid).toBe(true);
    expect(validateValue(Person, { home: { street: '1 Main' } }, { Address }).valid).toBe(false);
  });

  test('describeType returns short names', () => {
    expect(describeType(null)).toBe('null');
    expect(describeType([1])).toBe('array');
    expect(describeType('x')).toBe('string');
    expect(describeType(1)).toBe('number');
  });

  test('SCHEMA_TYPES contains all 10 names', () => {
    expect(SCHEMA_TYPES.size).toBe(10);
    expect(SCHEMA_TYPES.has('union')).toBe(true);
    expect(SCHEMA_TYPES.has('intersection')).toBe(true);
  });
});

// ---------- manifest ----------
describe('manifest: validateManifest', () => {
  test('accepts a valid manifest', () => {
    const m: Manifest = {
      name: '@manya/contracts', version: '1.0.0',
      dependencies: { '@manya/keyring': '^1.0.0' },
      exports: ['./src/index.js'],
      imports: ['@manya/keyring'],
      capabilities: ['crypto'],
    };
    const r = validateManifest(m);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  test('rejects non-object manifest', () => {
    const r = validateManifest('not a manifest');
    expect(r.valid).toBe(false);
    expect(r.errors[0].code).toBe(MANIFEST_ERROR_CODES.MISSING_FIELD);
  });

  test('rejects empty name', () => {
    const r = validateManifest({ name: '', version: '1.0.0' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === MANIFEST_ERROR_CODES.MISSING_FIELD)).toBe(true);
  });

  test('rejects invalid name (uppercase)', () => {
    const r = validateManifest({ name: 'BadName', version: '1.0.0' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === MANIFEST_ERROR_CODES.INVALID_NAME)).toBe(true);
  });

  test('rejects invalid version', () => {
    const r = validateManifest({ name: 'good', version: '1.0' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === MANIFEST_ERROR_CODES.INVALID_VERSION)).toBe(true);
  });

  test('rejects non-string dependency range', () => {
    const r = validateManifest({
      name: 'good', version: '1.0.0',
      dependencies: { x: 123 as never },
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === MANIFEST_ERROR_CODES.INVALID_DEPENDENCY)).toBe(true);
  });

  test('rejects non-array exports', () => {
    const r = validateManifest({
      name: 'good', version: '1.0.0',
      exports: './index.js' as never,
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === MANIFEST_ERROR_CODES.INVALID_EXPORTS)).toBe(true);
  });

  test('rejects non-array imports', () => {
    const r = validateManifest({
      name: 'good', version: '1.0.0',
      imports: { x: 1 } as never,
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === MANIFEST_ERROR_CODES.INVALID_IMPORTS)).toBe(true);
  });

  test('rejects non-array capabilities', () => {
    const r = validateManifest({
      name: 'good', version: '1.0.0',
      capabilities: 'crypto' as never,
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === MANIFEST_ERROR_CODES.INVALID_CAPABILITIES)).toBe(true);
  });

  test('assertManifest throws on invalid', () => {
    expect(() => assertManifest({ name: 'Bad', version: '1.0.0' }))
      .toThrow(ManifestError);
  });

  test('assertManifest does not throw on valid', () => {
    expect(() => assertManifest({ name: 'good', version: '1.0.0' })).not.toThrow();
  });

  test('isValidManifest is a predicate', () => {
    expect(isValidManifest({ name: 'good', version: '1.0.0' })).toBe(true);
    expect(isValidManifest({ name: '', version: '' })).toBe(false);
  });

  test('accepts prerelease version', () => {
    expect(validateManifest({ name: 'good', version: '1.0.0-beta.1' }).valid).toBe(true);
  });
});

// ---------- compatibility: semver ----------
describe('compatibility: semver', () => {
  test('isSemver recognizes valid and invalid', () => {
    expect(isSemver('1.0.0')).toBe(true);
    expect(isSemver('1.0.0-beta.1')).toBe(true);
    expect(isSemver('1.0')).toBe(false);
    expect(isSemver('v1.0.0')).toBe(false);
  });

  test('parseSemver parses major/minor/patch/prerelease', () => {
    const v = parseSemver('1.2.3-beta.0+build.7');
    expect(v.major).toBe(1);
    expect(v.minor).toBe(2);
    expect(v.patch).toBe(3);
    expect(v.prerelease).toBe('beta.0');
  });

  test('parseSemver throws on invalid', () => {
    expect(() => parseSemver('not-a-version')).toThrow(CompatibilityError);
  });

  test('compareSemver orders versions correctly', () => {
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
    expect(compareSemver('1.0.0', '2.0.0')).toBe(-1);
    expect(compareSemver('2.0.0', '1.0.0')).toBe(1);
    expect(compareSemver('1.0.0', '1.0.1')).toBe(-1);
    expect(compareSemver('1.0.1', '1.0.0')).toBe(1);
    expect(compareSemver('1.0.0', '1.1.0')).toBe(-1);
  });

  test('prerelease version is lower than release', () => {
    expect(compareSemver('1.0.0-beta', '1.0.0')).toBe(-1);
    expect(compareSemver('1.0.0', '1.0.0-beta')).toBe(1);
  });

  test('prerelease identifiers compare numerically then lexically', () => {
    expect(compareSemver('1.0.0-alpha.1', '1.0.0-alpha.2')).toBe(-1);
    expect(compareSemver('1.0.0-alpha.10', '1.0.0-alpha.2')).toBe(1);
    expect(compareSemver('1.0.0-alpha', '1.0.0-beta')).toBe(-1);
  });

  test('satisfies: exact match', () => {
    expect(satisfies('1.2.3', '1.2.3')).toBe(true);
    expect(satisfies('1.2.4', '1.2.3')).toBe(false);
  });

  test('satisfies: star matches anything', () => {
    expect(satisfies('1.2.3', '*')).toBe(true);
    expect(satisfies('0.0.1', '*')).toBe(true);
  });

  test('satisfies: caret allows compatible changes', () => {
    expect(satisfies('1.2.3', '^1.2.3')).toBe(true);
    expect(satisfies('1.3.0', '^1.2.3')).toBe(true);
    expect(satisfies('2.0.0', '^1.2.3')).toBe(false);
    expect(satisfies('1.2.2', '^1.2.3')).toBe(false);
  });

  test('satisfies: caret with 0.x is minor-scoped', () => {
    expect(satisfies('0.2.5', '^0.2.3')).toBe(true);
    expect(satisfies('0.3.0', '^0.2.3')).toBe(false);
  });

  test('satisfies: caret with 0.0.x is patch-scoped', () => {
    expect(satisfies('0.0.3', '^0.0.3')).toBe(true);
    expect(satisfies('0.0.4', '^0.0.3')).toBe(false);
  });

  test('satisfies: tilde allows patch-level changes', () => {
    expect(satisfies('1.2.3', '~1.2.3')).toBe(true);
    expect(satisfies('1.2.9', '~1.2.3')).toBe(true);
    expect(satisfies('1.3.0', '~1.2.3')).toBe(false);
  });

  test('satisfies: comparison operators', () => {
    expect(satisfies('1.2.3', '>=1.2.0')).toBe(true);
    expect(satisfies('1.1.0', '>=1.2.0')).toBe(false);
    expect(satisfies('1.2.0', '>1.1.0')).toBe(true);
    expect(satisfies('1.1.0', '>1.1.0')).toBe(false);
    expect(satisfies('1.0.0', '<2.0.0')).toBe(true);
    expect(satisfies('2.0.0', '<2.0.0')).toBe(false);
    expect(satisfies('2.0.0', '<=2.0.0')).toBe(true);
  });
});

// ---------- compatibility: backward compat ----------
describe('compatibility: checkBackwardCompat', () => {
  const base: InterfaceSchema = {
    name: 'X', version: '1.0.0',
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'role', type: 'enum', required: true, enum: ['admin', 'user', 'guest'] },
    ],
  };

  test('compatible when nothing breaks', () => {
    const next: InterfaceSchema = {
      ...base, version: '1.0.1',
      fields: [
        { name: 'id', type: 'string', required: true },
        { name: 'role', type: 'enum', required: true, enum: ['admin', 'user', 'guest'] },
        { name: 'nickname', type: 'string', required: false },
      ],
    };
    const r = checkBackwardCompat(base, next);
    expect(r.compatible).toBe(true);
    expect(r.breakingChanges).toHaveLength(0);
  });

  test('detects field_removed', () => {
    const next: InterfaceSchema = {
      ...base, version: '2.0.0',
      fields: [{ name: 'role', type: 'enum', required: true, enum: ['admin', 'user', 'guest'] }],
    };
    const r = checkBackwardCompat(base, next);
    expect(r.compatible).toBe(false);
    expect(r.breakingChanges.some(c => c.type === 'field_removed' && c.field === 'id')).toBe(true);
  });

  test('detects type_changed', () => {
    const next: InterfaceSchema = {
      ...base, version: '2.0.0',
      fields: [
        { name: 'id', type: 'number', required: true },
        { name: 'role', type: 'enum', required: true, enum: ['admin', 'user', 'guest'] },
      ],
    };
    const r = checkBackwardCompat(base, next);
    expect(r.compatible).toBe(false);
    expect(r.breakingChanges.some(c => c.type === 'type_changed' && c.field === 'id')).toBe(true);
  });

  test('detects required_added', () => {
    const next: InterfaceSchema = {
      ...base, version: '2.0.0',
      fields: [
        { name: 'id', type: 'string', required: true },
        { name: 'role', type: 'enum', required: true, enum: ['admin', 'user', 'guest'] },
        { name: 'email', type: 'string', required: true },
      ],
    };
    const r = checkBackwardCompat(base, next);
    expect(r.compatible).toBe(false);
    expect(r.breakingChanges.some(c => c.type === 'required_added' && c.field === 'email')).toBe(true);
  });

  test('detects enum_value_removed', () => {
    const next: InterfaceSchema = {
      ...base, version: '2.0.0',
      fields: [
        { name: 'id', type: 'string', required: true },
        { name: 'role', type: 'enum', required: true, enum: ['admin', 'user'] },
      ],
    };
    const r = checkBackwardCompat(base, next);
    expect(r.compatible).toBe(false);
    expect(r.breakingChanges.some(c => c.type === 'enum_value_removed' && c.field === 'role')).toBe(true);
  });

  test('optional field addition is NOT a breaking change', () => {
    const next: InterfaceSchema = {
      ...base, version: '1.0.1',
      fields: [
        ...base.fields,
        { name: 'nickname', type: 'string', required: false },
      ],
    };
    expect(checkBackwardCompat(base, next).compatible).toBe(true);
  });
});

// ---------- api ----------
describe('api: validateRequest / validateResponse', () => {
  const contract: ApiContract = {
    name: 'users-api', version: '1.0.0',
    endpoints: [
      {
        method: 'POST', path: '/users',
        requestSchema: compileSchema({
          name: 'CreateUserReq', version: '1.0.0',
          fields: { name: { type: 'string' }, email: { type: 'string' } },
        }),
        responseSchema: compileSchema({
          name: 'CreateUserRes', version: '1.0.0',
          fields: { id: { type: 'string' } },
        }),
      },
      {
        method: 'GET', path: '/users/:id',
        responseSchema: compileSchema({
          name: 'GetUserRes', version: '1.0.0',
          fields: { id: { type: 'string' }, name: { type: 'string' } },
        }),
      },
    ],
  };

  test('findEndpoint returns the matching endpoint', () => {
    expect(findEndpoint(contract, 'post', '/users')?.method).toBe('POST');
    expect(findEndpoint(contract, 'GET', '/missing')).toBeUndefined();
  });

  test('validateRequest accepts a valid body', () => {
    const r = validateRequest(contract, 'POST', '/users', { name: 'A', email: 'a@b.c' });
    expect(r.valid).toBe(true);
  });

  test('validateRequest rejects a missing required field', () => {
    const r = validateRequest(contract, 'POST', '/users', { name: 'A' });
    expect(r.valid).toBe(false);
  });

  test('validateRequest returns valid when endpoint has no requestSchema', () => {
    const r = validateRequest(contract, 'GET', '/users/:id', undefined);
    expect(r.valid).toBe(true);
  });

  test('validateRequest returns invalid when endpoint not found', () => {
    const r = validateRequest(contract, 'DELETE', '/nope', {});
    expect(r.valid).toBe(false);
    expect(r.errors[0].code).toBe('API_VALIDATION_ERROR');
  });

  test('validateResponse accepts a valid body', () => {
    const r = validateResponse(contract, 'POST', '/users', { id: 'u1' });
    expect(r.valid).toBe(true);
  });

  test('validateResponse rejects an invalid body', () => {
    const r = validateResponse(contract, 'GET', '/users/:id', { id: 'u1' });
    expect(r.valid).toBe(false);
  });

  test('assertValidContract throws on malformed contract', () => {
    expect(() => assertValidContract({ name: 'x', version: '1.0.0', endpoints: [] }))
      .toThrow(ApiValidationError);
  });

  test('assertValidContract passes on a well-formed contract', () => {
    expect(() => assertValidContract(contract)).not.toThrow();
  });
});

// ---------- sync ----------
describe('sync: diffSchemas', () => {
  const old: InterfaceSchema = {
    name: 'S', version: '1.0.0',
    fields: [
      { name: 'a', type: 'string', required: true },
      { name: 'b', type: 'number', required: false },
    ],
  };
  const next: InterfaceSchema = {
    name: 'S', version: '1.1.0',
    fields: [
      { name: 'a', type: 'string', required: true },
      { name: 'b', type: 'string', required: false },
      { name: 'c', type: 'boolean', required: false },
    ],
  };

  test('detects added fields', () => {
    const d = diffSchemas(old, next);
    expect(d.added.some(f => f.name === 'c')).toBe(true);
  });

  test('detects removed fields', () => {
    const d = diffSchemas(old, { ...next, fields: next.fields.filter(f => f.name !== 'a') });
    expect(d.removed).toContain('a');
  });

  test('detects changed fields', () => {
    const d = diffSchemas(old, next);
    expect(d.changed.some(c => c.field === 'b' && c.from.type === 'number' && c.to.type === 'string')).toBe(true);
  });

  test('empty diff for identical schemas', () => {
    const d = diffSchemas(old, old);
    expect(d.added).toHaveLength(0);
    expect(d.removed).toHaveLength(0);
    expect(d.changed).toHaveLength(0);
  });
});

describe('sync: mergeSchemas', () => {
  const local: InterfaceSchema = {
    name: 'M', version: '1.0.0',
    fields: [
      { name: 'a', type: 'string', required: true },
      { name: 'b', type: 'number', required: false },
    ],
  };
  const remote: InterfaceSchema = {
    name: 'M', version: '1.1.0',
    fields: [
      { name: 'a', type: 'string', required: true },
      { name: 'b', type: 'string', required: false },
      { name: 'c', type: 'boolean', required: false },
    ],
  };

  test('merges non-conflicting fields', () => {
    const { schema, conflicts } = mergeSchemas(local, {
      ...remote,
      fields: remote.fields.filter(f => f.name !== 'b'),
    });
    expect(schema.fields.some(f => f.name === 'a')).toBe(true);
    expect(schema.fields.some(f => f.name === 'b')).toBe(true);
    expect(schema.fields.some(f => f.name === 'c')).toBe(true);
    expect(conflicts).toHaveLength(0);
  });

  test('detects conflict when same field has different types', () => {
    const { schema, conflicts } = mergeSchemas(local, remote);
    expect(conflicts.some(c => c.field === 'b' && c.localType === 'number' && c.remoteType === 'string')).toBe(true);
    // Local wins by default.
    expect(schema.fields.find(f => f.name === 'b')?.type).toBe('number');
  });

  test('merges with the higher version', () => {
    const { schema } = mergeSchemas(local, remote);
    expect(schema.version).toBe('1.1.0');
  });

  test('throws SyncError when names differ', () => {
    expect(() => mergeSchemas(local, { ...remote, name: 'Other' })).toThrow(SyncError);
  });
});

describe('sync: fieldsEqual', () => {
  test('equal fields return true', () => {
    expect(fieldsEqual(
      { name: 'a', type: 'string', required: true },
      { name: 'a', type: 'string', required: true },
    )).toBe(true);
  });
  test('different type returns false', () => {
    expect(fieldsEqual(
      { name: 'a', type: 'string', required: true },
      { name: 'a', type: 'number', required: true },
    )).toBe(false);
  });
  test('different required returns false', () => {
    expect(fieldsEqual(
      { name: 'a', type: 'string', required: true },
      { name: 'a', type: 'string', required: false },
    )).toBe(false);
  });
});

// ---------- boundaries ----------
describe('boundaries: enforceBoundary', () => {
  const policy: BoundaryPolicy = {
    name: 'p', defaultAllow: false,
    rules: [
      { from: 'api', to: 'db', allowed: true, reason: 'api may use db' },
      { from: 'ui', to: 'api', allowed: true, reason: 'ui may use api' },
      { from: 'ui', to: 'db', allowed: false, reason: 'ui may not touch db directly' },
      { from: '*', to: 'logger', allowed: true, reason: 'logger is universal' },
    ],
  };

  test('exact rule: allow', () => {
    expect(enforceBoundary(policy, 'api', 'db').allowed).toBe(true);
  });

  test('exact rule: deny', () => {
    expect(enforceBoundary(policy, 'ui', 'db').allowed).toBe(false);
  });

  test('wildcard rule matches', () => {
    expect(enforceBoundary(policy, 'api', 'logger').allowed).toBe(true);
    expect(enforceBoundary(policy, 'ui', 'logger').allowed).toBe(true);
  });

  test('default deny when no rule matches', () => {
    const r = enforceBoundary(policy, 'db', 'ui');
    expect(r.allowed).toBe(false);
  });

  test('default allow when policy.defaultAllow=true', () => {
    const openPolicy: BoundaryPolicy = { name: 'open', defaultAllow: true, rules: [] };
    expect(enforceBoundary(openPolicy, 'x', 'y').allowed).toBe(true);
  });

  test('matchRule returns the exact-match rule first', () => {
    expect(matchRule(policy, 'api', 'db')?.to).toBe('db');
  });

  test('enforceBoundary throws on empty caller', () => {
    expect(() => enforceBoundary(policy, '', 'db')).toThrow(BoundaryError);
  });
});

describe('boundaries: detectViolations', () => {
  const policy: BoundaryPolicy = {
    name: 'p', defaultAllow: false,
    rules: [
      { from: 'api', to: 'db', allowed: true },
      { from: 'ui', to: 'api', allowed: true },
    ],
  };
  const graph = [
    { from: 'api', to: 'db' },
    { from: 'ui', to: 'api' },
    { from: 'ui', to: 'db' }, // violation
    { from: 'db', to: 'ui' }, // violation
  ];

  test('detects all violations', () => {
    const v = detectViolations(policy, graph);
    expect(v).toHaveLength(2);
    expect(v.some(x => x.from === 'ui' && x.to === 'db')).toBe(true);
    expect(v.some(x => x.from === 'db' && x.to === 'ui')).toBe(true);
  });

  test('isPolicySatisfied is true when no violations', () => {
    expect(isPolicySatisfied(policy, [{ from: 'api', to: 'db' }])).toBe(true);
  });

  test('isPolicySatisfied is false when there are violations', () => {
    expect(isPolicySatisfied(policy, graph)).toBe(false);
  });

  test('detectViolations throws on non-array input', () => {
    expect(() => detectViolations(policy, 'not a graph' as never)).toThrow(BoundaryError);
  });
});

// ---------- reporting ----------
describe('reporting', () => {
  test('buildReport computes passed as AND of sections', () => {
    const r = buildReport('r', [
      { name: 'a', passed: true, errors: [] },
      { name: 'b', passed: true, errors: [] },
    ]);
    expect(r.passed).toBe(true);
    const r2 = buildReport('r', [
      { name: 'a', passed: true, errors: [] },
      { name: 'b', passed: false, errors: [{ path: 'x', message: 'bad', code: 'X' }] },
    ]);
    expect(r2.passed).toBe(false);
  });

  test('buildReport throws on empty name', () => {
    expect(() => buildReport('', [])).toThrow(ReportingError);
  });

  test('aggregateReports ANDs passed flags', () => {
    const a = buildReport('a', [{ name: 's', passed: true, errors: [] }]);
    const b = buildReport('b', [{ name: 's', passed: false, errors: [{ path: '', message: 'm', code: 'X' }] }]);
    const agg = aggregateReports([a, b]);
    expect(agg.passed).toBe(false);
    expect(agg.sections).toHaveLength(2);
    expect(agg.sections[0].name).toBe('a:s');
    expect(agg.sections[1].name).toBe('b:s');
  });

  test('aggregateReports of empty list passes', () => {
    expect(aggregateReports([]).passed).toBe(true);
  });

  test('serializeReport returns indented JSON', () => {
    const r = buildReport('r', [{ name: 's', passed: true, errors: [] }]);
    const json = serializeReport(r);
    expect(json).toContain('"name": "r"');
    expect(JSON.parse(json).name).toBe('r');
  });

  test('summarizeReport produces a single line', () => {
    const r = buildReport('r', [
      { name: 's1', passed: true, errors: [] },
      { name: 's2', passed: false, errors: [{ path: 'p', message: 'm', code: 'X' }] },
    ]);
    const line = summarizeReport(r);
    expect(line).toContain('r: FAIL');
    expect(line).toContain('1/2 sections');
    expect(line).toContain('1 error');
    expect(line.split('\n').length).toBe(1);
  });

  test('summarizeReport PASS line has no error count', () => {
    const r = buildReport('r', [{ name: 's', passed: true, errors: [] }]);
    expect(summarizeReport(r)).toContain('PASS');
    expect(summarizeReport(r)).not.toContain('error');
  });
});

// ---------- errors ----------
describe('errors: hierarchy', () => {
  test('ContractsError is the base', () => {
    expect(new SchemaError('x')).toBeInstanceOf(ContractsError);
    expect(new ManifestError('x')).toBeInstanceOf(ContractsError);
    expect(new CompatibilityError('x')).toBeInstanceOf(ContractsError);
    expect(new ApiValidationError('x')).toBeInstanceOf(ContractsError);
    expect(new SyncError('x')).toBeInstanceOf(ContractsError);
    expect(new BoundaryError('x')).toBeInstanceOf(ContractsError);
    expect(new ReportingError('x')).toBeInstanceOf(ContractsError);
  });

  test('each subclass has its own stable code', () => {
    expect(new SchemaError('x').code).toBe('SCHEMA_ERROR');
    expect(new ManifestError('x').code).toBe('MANIFEST_ERROR');
    expect(new CompatibilityError('x').code).toBe('COMPATIBILITY_ERROR');
    expect(new ApiValidationError('x').code).toBe('API_VALIDATION_ERROR');
    expect(new SyncError('x').code).toBe('SYNC_ERROR');
    expect(new BoundaryError('x').code).toBe('BOUNDARY_ERROR');
    expect(new ReportingError('x').code).toBe('REPORTING_ERROR');
  });

  test('ContractsError default code', () => {
    expect(new ContractsError('x').code).toBe('CONTRACTS_ERROR');
  });

  test('ManifestError accepts a custom code', () => {
    const e = new ManifestError('bad', MANIFEST_ERROR_CODES.INVALID_VERSION);
    expect(e).toBeInstanceOf(ManifestError);
    expect(e.code).toBe('MANIFEST_INVALID_VERSION');
  });

  test('errors carry cause', () => {
    const cause = new Error('root');
    const e = new SchemaError('bad', cause);
    expect(e.cause).toBe(cause);
  });
});

// ---------- logging ----------
describe('logging', () => {
  test('shouldScrubField identifies sensitive names', () => {
    expect(shouldScrubField('password')).toBe(true);
    expect(shouldScrubField('apiKey')).toBe(true);
    expect(shouldScrubField('user_apiKey')).toBe(true);
    expect(shouldScrubField('name')).toBe(false);
  });

  test('scrubMetadata redacts sensitive fields recursively', () => {
    const out = scrubMetadata({ user: 'a', password: 's3cret', nested: { token: 't' } }) as Record<string, unknown>;
    expect(out.password).toBe('[redacted]');
    expect((out.nested as Record<string, unknown>).token).toBe('[redacted]');
    expect(out.user).toBe('a');
  });
});

// ---------- end-to-end ----------
describe('end-to-end: define, validate, evolve, check compat', () => {
  test('full lifecycle', () => {
    // 1. Define an interface.
    const v1 = compileSchema({
      name: 'Account', version: '1.0.0',
      description: 'A user account.',
      fields: {
        id: { type: 'string', description: 'Account id.' },
        email: { type: 'string' },
        role: { type: 'enum', enum: ['member', 'admin'] },
        tags: { type: 'array', of: { type: 'string' }, required: false },
      },
    });

    // 2. Validate a value.
    const ok = validateValue(v1, {
      id: 'a1', email: 'a@b.c', role: 'admin', tags: ['x', 'y'],
    });
    expect(ok.valid).toBe(true);

    // 3. Evolve the interface (non-breaking): add an optional field.
    const v2 = compileSchema({
      ...v1, version: '1.1.0',
      fields: {
        id: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'enum', enum: ['member', 'admin'] },
        tags: { type: 'array', of: { type: 'string' }, required: false },
        nickname: { type: 'string', required: false },
      },
    });
    const compat2 = checkBackwardCompat(v1, v2);
    expect(compat2.compatible).toBe(true);

    // 4. Evolve again (breaking): change id to number, drop email.
    const v3 = compileSchema({
      ...v1, version: '2.0.0',
      fields: {
        id: { type: 'number' },
        role: { type: 'enum', enum: ['member', 'admin'] },
      },
    });
    const compat3 = checkBackwardCompat(v1, v3);
    expect(compat3.compatible).toBe(false);
    expect(compat3.breakingChanges.some(c => c.type === 'type_changed' && c.field === 'id')).toBe(true);
    expect(compat3.breakingChanges.some(c => c.type === 'field_removed' && c.field === 'email')).toBe(true);

    // 5. Diff and merge.
    const diff = diffSchemas(v1, v2);
    expect(diff.added.some(f => f.name === 'nickname')).toBe(true);
    const merge = mergeSchemas(v1, v2);
    expect(merge.conflicts).toHaveLength(0);
    expect(merge.schema.fields.some(f => f.name === 'nickname')).toBe(true);

    // 6. Build a report.
    const report = buildReport('account-evolution', [
      {
        name: 'v1-valid',
        passed: ok.valid,
        errors: ok.errors,
      },
      {
        name: 'v1->v2-compat',
        passed: compat2.compatible,
        errors: compat2.breakingChanges.map(c => ({
          path: c.field ?? '', message: c.type, code: c.type,
        })),
      },
      {
        name: 'v1->v3-compat',
        passed: compat3.compatible,
        errors: compat3.breakingChanges.map(c => ({
          path: c.field ?? '', message: c.type, code: c.type,
        })),
      },
    ]);
    expect(report.passed).toBe(false); // because v1->v3 is breaking
    const summary = summarizeReport(report);
    expect(summary).toContain('account-evolution: FAIL');
  });
});
