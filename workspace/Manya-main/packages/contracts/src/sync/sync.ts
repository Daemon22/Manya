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
import { SyncError } from '../errors.js';
import { compareSemver } from '../compatibility/compatibility.js';

/**
 * Computes the diff between two schemas. `removed` is a list of field names
 * that existed in `oldSchema` but not `newSchema`; `added` and `changed`
 * carry full field descriptors.
 */
export function diffSchemas(
  oldSchema: InterfaceSchema,
  newSchema: InterfaceSchema,
): SchemaDiff {
  const oldByName = new Map<string, SchemaField>();
  for (const f of oldSchema.fields) oldByName.set(f.name, f);
  const newByName = new Map<string, SchemaField>();
  for (const f of newSchema.fields) newByName.set(f.name, f);

  const added: SchemaField[] = [];
  const removed: string[] = [];
  const changed: Array<{ field: string; from: SchemaField; to: SchemaField }> = [];

  for (const [name, newField] of newByName) {
    const oldField = oldByName.get(name);
    if (!oldField) {
      added.push(newField);
    } else if (!fieldsEqual(oldField, newField)) {
      changed.push({ field: name, from: oldField, to: newField });
    }
  }
  for (const [name] of oldByName) {
    if (!newByName.has(name)) removed.push(name);
  }

  return { added, removed, changed };
}

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
export function mergeSchemas(
  local: InterfaceSchema,
  remote: InterfaceSchema,
): { schema: InterfaceSchema; conflicts: SchemaConflict[] } {
  if (local.name !== remote.name) {
    throw new SyncError(
      `cannot merge schemas with different names: "${local.name}" vs "${remote.name}"`,
    );
  }
  // Compare versions: the merged schema takes the higher of the two.
  const mergedVersion = compareSemver(local.version, remote.version) >= 0
    ? local.version
    : remote.version;

  const localByName = new Map<string, SchemaField>();
  for (const f of local.fields) localByName.set(f.name, f);
  const remoteByName = new Map<string, SchemaField>();
  for (const f of remote.fields) remoteByName.set(f.name, f);

  const conflicts: SchemaConflict[] = [];
  const mergedFields: SchemaField[] = [];

  // Local-first iteration so the merged field order follows `local`.
  for (const [name, localField] of localByName) {
    const remoteField = remoteByName.get(name);
    if (!remoteField) {
      mergedFields.push(localField);
      continue;
    }
    if (localField.type === remoteField.type) {
      // Same type — keep local (it may have stricter constraints).
      mergedFields.push(localField);
    } else {
      // Conflict — prefer local, but record the conflict.
      conflicts.push({
        field: name,
        localType: localField.type,
        remoteType: remoteField.type,
        resolution: 'local',
      });
      mergedFields.push(localField);
    }
  }
  // Add fields only present in remote.
  for (const [name, remoteField] of remoteByName) {
    if (!localByName.has(name)) {
      mergedFields.push(remoteField);
    }
  }

  const schema: InterfaceSchema = {
    name: local.name,
    version: mergedVersion,
    fields: mergedFields,
    ...(local.description ?? remote.description ? { description: local.description ?? remote.description } : {}),
  };
  return { schema, conflicts };
}

/** Returns `true` iff two fields are structurally equivalent. */
export function fieldsEqual(a: SchemaField, b: SchemaField): boolean {
  if (a === b) return true;
  if (a.type !== b.type) return false;
  if (a.required !== b.required) return false;
  if ((a.description ?? '') !== (b.description ?? '')) return false;
  if (!enumEquals(a.enum, b.enum)) return false;
  if ((a.ref ?? '') !== (b.ref ?? '')) return false;
  if ((a.of ?? undefined) !== undefined || (b.of ?? undefined) !== undefined) {
    if (!a.of || !b.of || !fieldsEqual(a.of, b.of)) return false;
  }
  if (!arrayEqual(a.oneOf, b.oneOf, fieldsEqual)) return false;
  if (!arrayEqual(a.allOf, b.allOf, fieldsEqual)) return false;
  if (!arrayEqual(a.fields, b.fields, fieldsEqual)) return false;
  // Defaults are compared by JSON serialization for stability.
  if (JSON.stringify(a.default) !== JSON.stringify(b.default)) return false;
  return true;
}

/** Returns `true` iff two enum arrays are deeply equal (order-insensitive). */
function enumEquals(a: unknown[] | undefined, b: unknown[] | undefined): boolean {
  if (a === undefined && b === undefined) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  const aa = a.map(v => JSON.stringify(v)).sort();
  const bb = b.map(v => JSON.stringify(v)).sort();
  return aa.every((v, i) => v === bb[i]);
}

/** Returns `true` iff two optional arrays are element-wise equal via `eq`. */
function arrayEqual<T>(
  a: T[] | undefined,
  b: T[] | undefined,
  eq: (x: T, y: T) => boolean,
): boolean {
  if (a === undefined && b === undefined) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  return a.every((v, i) => eq(v, b[i]));
}
