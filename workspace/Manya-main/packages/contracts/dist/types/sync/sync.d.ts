/**
 * @manya/contracts — schema synchronization.
 *
 * Diffs two `InterfaceSchema`s (`diffSchemas`) and merges two schemas with
 * conflict detection (`mergeSchemas`). Conflicting fields carry a
 * `SchemaConflict` descriptor with a `resolution` hint.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { InterfaceSchema, SchemaConflict, SchemaDiff, SchemaField } from '../types.js';
/**
 * Computes the diff between two schemas. `removed` is a list of field names
 * that existed in `oldSchema` but not `newSchema`; `added` and `changed`
 * carry full field descriptors.
 */
export declare function diffSchemas(oldSchema: InterfaceSchema, newSchema: InterfaceSchema): SchemaDiff;
/**
 * Merges `local` and `remote` schemas into a single schema. Fields present in
 * only one schema are included verbatim. Fields present in both with the same
 * type are kept from `local`; fields present in both with different types
 * produce a `SchemaConflict` and are resolved in favour of `local`.
 *
 * The merged schema inherits `local.name` and the higher of the two versions
 * (per `compareSemver`); if `local` and `remote` have different names, a
 * `SyncError` is thrown — schema sync is name-scoped.
 *
 * @returns `{ schema, conflicts }` — the merged schema and any conflicts.
 */
export declare function mergeSchemas(local: InterfaceSchema, remote: InterfaceSchema): {
    schema: InterfaceSchema;
    conflicts: SchemaConflict[];
};
/** Returns `true` iff two fields are structurally equivalent. */
export declare function fieldsEqual(a: SchemaField, b: SchemaField): boolean;
//# sourceMappingURL=sync.d.ts.map