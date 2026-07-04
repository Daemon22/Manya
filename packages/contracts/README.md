# @manya/contracts

> Universal contract and schema validation for the MANYA Intelligence OS — interface schemas, manifests, semver compatibility, API contracts, schema sync, boundary enforcement, and validation reports.

`@manya/contracts` is the contract substrate of the **MANYA Intelligence OS** — a sovereign, modular, local-first intelligence operating system conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the **Manya Hael Foundation**.

The package provides a JSON-ish schema definition language with a typed compiler, manifest validation, full semver parsing and range satisfaction, backward-compatibility analysis between two schema versions, HTTP API contract validation, schema diffing and merging with conflict detection, module boundary enforcement via policies, and aggregated validation reports.

---

## Vision

The Manya Hael Foundation stewards the MANYA Intelligence OS as a long-horizon, mission-driven project. `@manya/contracts` extends that sovereignty into the contract domain: **your interfaces, your versioning rules, your boundary policy — yours alone.**

- **Sovereign.** No network calls. Every schema, manifest, and policy is local.
- **Typed.** Every public symbol is typed; every error carries a stable `code` string.
- **Composable.** Validation results are first-class values that aggregate into reports.
- **Reproducible.** Identical inputs produce identical validation results and reports.
- **Honest.** Breaking changes are listed explicitly; conflicts surface a `resolution` hint.

---

## Features

| Area | What you get |
| --- | --- |
| **Schema** | `compileSchema` (record or array field syntax, defaults `required: true`), `validateValue` against 10 type kinds (string/number/boolean/null/object/array/enum/ref/union/intersection). |
| **Manifest** | `validateManifest` for name, version (semver), dependencies, exports, imports, capabilities — with one stable code per failure mode. |
| **Compatibility** | `parseSemver`, `compareSemver` (with prerelease per semver.org §11), `satisfies` (`*`, `^`, `~`, exact, `>`, `>=`, `<`, `<=`), `checkBackwardCompat` detecting field removal, type change, required addition, enum value removal. |
| **API** | `ApiContract` + `ApiEndpoint`, `findEndpoint`, `validateRequest`, `validateResponse`, `assertValidContract`. |
| **Sync** | `diffSchemas` (added/removed/changed), `mergeSchemas` with conflict detection, `fieldsEqual` deep equality. |
| **Boundaries** | `BoundaryPolicy` + `BoundaryRule`, `enforceBoundary` (with `*` wildcards), `detectViolations` over a call graph, `isPolicySatisfied`. |
| **Reporting** | `buildReport`, `aggregateReports`, `serializeReport` (JSON), `summarizeReport` (one-line). |
| **Logging** | `Logger` interface, `ConsoleLogger` with secret-scrubbing, `SilentLogger`. |

---

## Install

```bash
npm install @manya/contracts
```

Requires Node.js 18+.

---

## Quick start

### 1. Define a schema and validate a value

```ts
import { compileSchema, validateValue } from '@manya/contracts';

const User = compileSchema({
  name: 'User', version: '1.0.0',
  fields: {
    id:        { type: 'string',  description: 'User id.' },
    age:       { type: 'number',  required: false },
    active:    { type: 'boolean' },
    role:      { type: 'enum',    enum: ['admin', 'user'] },
    tags:      { type: 'array',   of: { type: 'string' }, required: false },
    profile:   {
      type: 'object', required: false,
      fields: { bio: { type: 'string', required: false } },
    },
  },
});

const result = validateValue(User, {
  id: 'u1', age: 30, active: true, role: 'admin', tags: ['x'],
});
console.log(result.valid);  // true
console.log(result.errors); // []
```

### 2. Validate a manifest and check version compatibility

```ts
import { validateManifest, satisfies, checkBackwardCompat } from '@manya/contracts';

const m = validateManifest({
  name: '@manya/example', version: '1.2.3',
  dependencies: { '@manya/contracts': '^1.0.0' },
  exports: ['./src/index.js'],
  capabilities: ['crypto'],
});
console.log(m.valid, m.errors);

console.log(satisfies('1.4.0', '^1.2.3')); // true
console.log(satisfies('2.0.0', '^1.2.3')); // false

const compat = checkBackwardCompat(v1, v2);
console.log(compat.compatible, compat.breakingChanges);
```

### 3. Validate an HTTP request/response against an API contract

```ts
import { compileSchema, validateRequest, validateResponse } from '@manya/contracts';

const contract = {
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
  ],
};

const req = validateRequest(contract, 'POST', '/users', { name: 'A', email: 'a@b.c' });
const res = validateResponse(contract, 'POST', '/users', { id: 'u1' });
console.log(req.valid, res.valid);
```

### 4. Enforce module boundaries and aggregate a report

```ts
import {
  enforceBoundary, detectViolations, buildReport, aggregateReports, summarizeReport,
} from '@manya/contracts';

const policy = {
  name: 'p', defaultAllow: false,
  rules: [
    { from: 'api', to: 'db', allowed: true,  reason: 'api owns db access' },
    { from: 'ui',  to: 'db', allowed: false, reason: 'ui must not bypass api' },
  ],
};
console.log(enforceBoundary(policy, 'ui', 'db'));
console.log(detectViolations(policy, [
  { from: 'api', to: 'db' },
  { from: 'ui',  to: 'db' }, // violation
]));

const report = buildReport('deploy-gate', [
  { name: 'manifest', passed: true,  errors: [] },
  { name: 'compat',   passed: false, errors: [{ path: 'id', message: 'type_changed', code: 'type_changed' }] },
]);
console.log(summarizeReport(aggregateReports([report])));
// → aggregate: FAIL (1/2 sections, 1 error) at 2024-...
```

---

## Configuration

`@manya/contracts` has no runtime configuration object — every function is pure and explicit. The only configurable surface is the optional `Logger` you can pass to higher-level orchestration code; the package ships `ConsoleLogger` (with secret scrubbing) and `SilentLogger`.

### Supported schema type kinds

| `type` | Required extra fields | Description |
| --- | --- | --- |
| `string` / `number` / `boolean` / `null` | none | JSON primitives. |
| `object` | `fields?` | Nested record; if `fields` is given, each is validated. |
| `array` | `of` | Homogeneous list; `of` is the element field definition. |
| `enum` | `enum` | One of the literal values in `enum`. |
| `ref` | `ref` | Reference to another `InterfaceSchema` by name (passed via `refs`). |
| `union` | `oneOf` | One of several member field definitions. |
| `intersection` | `allOf` | All of several member field definitions. |

### Semver range forms supported by `satisfies`

| Form | Meaning |
| --- | --- |
| `*` | Any version. |
| `1.2.3` | Exact match. |
| `^1.2.3` | Compatible-with (same major; for `0.x` and `0.0.x` tighter). |
| `~1.2.3` | Patch-level (same major and minor). |
| `>=1.2.3`, `>1.2.3`, `<=1.2.3`, `<1.2.3` | Comparison. |

---

## Extending

### Add a custom schema type

1. Add the type name to the `SchemaType` union in `src/types.ts`.
2. Extend `SCHEMA_TYPES` and the `compileField` validation in `src/schema/schema.ts`.
3. Add a `case` to the `validateField` switch.
4. Add unit tests covering at least one positive and one negative case.
5. Update `docs/API.md` and `README.md`.

### Add a new compatibility rule

`checkBackwardCompat` already detects field removal, type change, required addition, and enum value removal. To add a new rule (e.g. "field became required"), push a new `BreakingChange` to the `breakingChanges` array in `src/compatibility/compatibility.ts`, document the new `type` literal in `src/types.ts`, and add a test.

---

## Security notes

- **Local-only.** No schema, manifest, or policy data leaves the host process.
- **No PII in logs.** `secret`, `token`, `apiKey`, `password`, `authorization`, `privateKey`, `accessToken`, `refreshToken` are scrubbed.
- **Defense in depth.** Validation never throws on a bad value — it returns `{ valid, errors }`; structural problems (e.g. unparseable schema) raise typed errors.
- **Reproducibility.** Identical inputs → identical validation results and reports.

For threat models, see [SECURITY.md](./SECURITY.md) and the root [SECURITY.md](../../SECURITY.md).

---

## Documentation

- [docs/API.md](./docs/API.md) — full TypeScript API reference.
- [CHANGELOG.md](./CHANGELOG.md) — release history.
- [CONTRIBUTING.md](./CONTRIBUTING.md) — package-specific contributor notes.
- [SECURITY.md](./SECURITY.md) — package-specific security surface.
- [LICENSE](./LICENSE) — Apache-2.0.

---

## License

Apache-2.0. Copyright 2024 Manya Hael Foundation. All rights reserved.

Conceived, directed, and owned by **Uviwe Menyiwe (Azura Daemon)**, founder of the Manya Hael Foundation.
