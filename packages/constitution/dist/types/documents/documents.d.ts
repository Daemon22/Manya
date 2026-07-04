/**
 * @manya/constitution — versioned governance documents.
 *
 * A `GovernanceDocument` is a versioned collection of `DocumentSection`s with
 * a lifecycle (`draft` → `proposed` → `ratified` → `superseded`). This module
 * supports:
 *
 *   - `diffDocuments(old, new)` — added/removed/changed sections.
 *   - `isRatified(doc)` — true when `status === 'ratified'`.
 *   - `ratify(doc, at?)` — returns a new document with `status: 'ratified'`.
 *   - `supersede(old, new)` — returns a new `new` doc with `old` marked
 *     superseded and `old.supersededBy` set to `new.id`.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { DocumentDiff, DocumentSection, DocumentSectionType, DocumentStatus, GovernanceDocument, SemverVersion } from '../types.js';
/** All valid section types. */
export declare const SECTION_TYPES: ReadonlyArray<DocumentSectionType>;
/** All valid document statuses. */
export declare const DOCUMENT_STATUSES: ReadonlyArray<DocumentStatus>;
/**
 * Compares two semver versions. Returns negative when `a < b`, positive when
 * `a > b`, 0 when equal. Prerelease versions are considered lower than their
 * corresponding release (per semver.org §11).
 */
export declare function compareVersions(a: SemverVersion, b: SemverVersion): number;
/** Formats a `SemverVersion` as a string (e.g. "1.2.3-alpha.1"). */
export declare function formatVersion(v: SemverVersion): string;
/** Parses a semver string into a `SemverVersion`. Throws `DocumentError` on invalid input. */
export declare function parseVersion(s: string): SemverVersion;
/** Validates a `DocumentSection` structurally. */
export declare function validateSection(section: DocumentSection): void;
/** Validates a `GovernanceDocument` structurally. */
export declare function validateDocument(doc: GovernanceDocument): void;
/** Returns true when the document's status is `ratified`. */
export declare function isRatified(doc: GovernanceDocument): boolean;
/**
 * Returns a new document with `status: 'ratified'` and `ratifiedAt` set to
 * `at` (defaults to the current ISO timestamp). The original document is not
 * modified.
 */
export declare function ratify(doc: GovernanceDocument, at?: string): GovernanceDocument;
/**
 * Computes a diff between `oldDoc` and `newDoc`. Sections are matched by id.
 * A section is "changed" when its title, content, or type differs.
 */
export declare function diffDocuments(oldDoc: GovernanceDocument, newDoc: GovernanceDocument): DocumentDiff;
/**
 * Supersedes `oldDoc` with `newDoc`. Returns a tuple `[supersededOld, newNew]`
 * where `supersededOld` has `status: 'superseded'` and `supersededBy:
 * newDoc.id`, and `newNew` is a copy of `newDoc` (validated). Throws
 * `DocumentError` if `oldDoc` is not ratified, or if the new doc is not a
 * higher version than the old doc.
 */
export declare function supersede(oldDoc: GovernanceDocument, newDoc: GovernanceDocument): {
    superseded: GovernanceDocument;
    successor: GovernanceDocument;
};
//# sourceMappingURL=documents.d.ts.map