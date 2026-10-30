"use strict";
/**
 * @manya-os/constitution — versioned governance documents.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOCUMENT_STATUSES = exports.SECTION_TYPES = void 0;
exports.compareVersions = compareVersions;
exports.formatVersion = formatVersion;
exports.parseVersion = parseVersion;
exports.validateSection = validateSection;
exports.validateDocument = validateDocument;
exports.isRatified = isRatified;
exports.ratify = ratify;
exports.diffDocuments = diffDocuments;
exports.supersede = supersede;
const errors_js_1 = require("../errors.js");
/** All valid section types. */
exports.SECTION_TYPES = [
    'preamble', 'article', 'amendment', 'appendix', 'schedule', 'other',
];
/** All valid document statuses. */
exports.DOCUMENT_STATUSES = [
    'draft', 'proposed', 'ratified', 'superseded',
];
/**
 * Compares two semver versions. Returns negative when `a < b`, positive when
 * `a > b`, 0 when equal. Prerelease versions are considered lower than their
 * corresponding release (per semver.org §11).
 */
function compareVersions(a, b) {
    if (a.major !== b.major)
        return a.major - b.major;
    if (a.minor !== b.minor)
        return a.minor - b.minor;
    if (a.patch !== b.patch)
        return a.patch - b.patch;
    // Prerelease handling
    if (a.prerelease && !b.prerelease)
        return -1;
    if (!a.prerelease && b.prerelease)
        return 1;
    if (a.prerelease && b.prerelease) {
        return a.prerelease < b.prerelease ? -1 : a.prerelease > b.prerelease ? 1 : 0;
    }
    return 0;
}
/** Formats a `SemverVersion` as a string (e.g. "1.2.3-alpha.1"). */
function formatVersion(v) {
    let s = `${v.major}.${v.minor}.${v.patch}`;
    if (v.prerelease)
        s += `-${v.prerelease}`;
    if (v.build)
        s += `+${v.build}`;
    return s;
}
/** Parses a semver string into a `SemverVersion`. Throws `DocumentError` on invalid input. */
function parseVersion(s) {
    if (typeof s !== 'string')
        throw new errors_js_1.DocumentError('version must be a string');
    const m = s.match(/^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/);
    if (!m)
        throw new errors_js_1.DocumentError(`invalid semver: ${s}`);
    return {
        major: Number(m[1]),
        minor: Number(m[2]),
        patch: Number(m[3]),
        prerelease: m[4],
        build: m[5],
    };
}
/** Validates a `DocumentSection` structurally. */
function validateSection(section) {
    if (!section || typeof section !== 'object') {
        throw new errors_js_1.DocumentError('section must be an object');
    }
    if (typeof section.id !== 'string' || section.id.length === 0) {
        throw new errors_js_1.DocumentError('section.id must be a non-empty string');
    }
    if (typeof section.title !== 'string' || section.title.length === 0) {
        throw new errors_js_1.DocumentError('section.title must be a non-empty string');
    }
    if (typeof section.content !== 'string') {
        throw new errors_js_1.DocumentError('section.content must be a string');
    }
    if (!exports.SECTION_TYPES.includes(section.type)) {
        throw new errors_js_1.DocumentError(`section.type must be one of: ${exports.SECTION_TYPES.join(', ')}`);
    }
}
/** Validates a `GovernanceDocument` structurally. */
function validateDocument(doc) {
    if (!doc || typeof doc !== 'object') {
        throw new errors_js_1.DocumentError('doc must be an object');
    }
    if (typeof doc.id !== 'string' || doc.id.length === 0) {
        throw new errors_js_1.DocumentError('doc.id must be a non-empty string');
    }
    if (typeof doc.name !== 'string' || doc.name.length === 0) {
        throw new errors_js_1.DocumentError('doc.name must be a non-empty string');
    }
    if (!doc.version || typeof doc.version !== 'object') {
        throw new errors_js_1.DocumentError('doc.version must be a SemverVersion');
    }
    if (!Array.isArray(doc.sections)) {
        throw new errors_js_1.DocumentError('doc.sections must be an array');
    }
    const seen = new Set();
    for (const s of doc.sections) {
        validateSection(s);
        if (seen.has(s.id)) {
            throw new errors_js_1.DocumentError(`duplicate section id: ${s.id}`);
        }
        seen.add(s.id);
    }
    if (!exports.DOCUMENT_STATUSES.includes(doc.status)) {
        throw new errors_js_1.DocumentError(`doc.status must be one of: ${exports.DOCUMENT_STATUSES.join(', ')}`);
    }
    if (doc.status === 'ratified' && typeof doc.ratifiedAt !== 'string') {
        throw new errors_js_1.DocumentError('ratified document must have ratifiedAt');
    }
}
/** Returns true when the document's status is `ratified`. */
function isRatified(doc) {
    return doc.status === 'ratified';
}
/**
 * Returns a new document with `status: 'ratified'` and `ratifiedAt` set to
 * `at` (defaults to the current ISO timestamp). The original document is not
 * modified.
 */
function ratify(doc, at) {
    validateDocument(doc);
    if (doc.status === 'ratified') {
        throw new errors_js_1.DocumentError('document is already ratified');
    }
    if (doc.status === 'superseded') {
        throw new errors_js_1.DocumentError('cannot ratify a superseded document');
    }
    return {
        ...doc,
        status: 'ratified',
        ratifiedAt: at ?? new Date().toISOString(),
    };
}
/**
 * Computes a diff between `oldDoc` and `newDoc`. Sections are matched by id.
 * A section is "changed" when its title, content, or type differs.
 */
function diffDocuments(oldDoc, newDoc) {
    validateDocument(oldDoc);
    validateDocument(newDoc);
    const oldMap = new Map();
    for (const s of oldDoc.sections)
        oldMap.set(s.id, s);
    const newMap = new Map();
    for (const s of newDoc.sections)
        newMap.set(s.id, s);
    const added = [];
    const removed = [];
    const changed = [];
    for (const s of newDoc.sections) {
        if (!oldMap.has(s.id)) {
            added.push(s);
        }
    }
    for (const s of oldDoc.sections) {
        if (!newMap.has(s.id)) {
            removed.push(s);
        }
    }
    for (const s of newDoc.sections) {
        const o = oldMap.get(s.id);
        if (!o)
            continue;
        if (o.title !== s.title || o.content !== s.content || o.type !== s.type) {
            changed.push({ id: s.id, oldSection: o, newSection: s });
        }
    }
    return { added, removed, changed };
}
/**
 * Supersedes `oldDoc` with `newDoc`. Returns a tuple `[supersededOld, newNew]`
 * where `supersededOld` has `status: 'superseded'` and `supersededBy:
 * newDoc.id`, and `newNew` is a copy of `newDoc` (validated). Throws
 * `DocumentError` if `oldDoc` is not ratified, or if the new doc is not a
 * higher version than the old doc.
 */
function supersede(oldDoc, newDoc) {
    validateDocument(oldDoc);
    validateDocument(newDoc);
    if (!isRatified(oldDoc)) {
        throw new errors_js_1.DocumentError('only ratified documents can be superseded');
    }
    if (compareVersions(newDoc.version, oldDoc.version) <= 0) {
        throw new errors_js_1.DocumentError(`successor version ${formatVersion(newDoc.version)} must be greater than ${formatVersion(oldDoc.version)}`);
    }
    if (newDoc.status !== 'proposed' && newDoc.status !== 'ratified') {
        throw new errors_js_1.DocumentError('successor must be proposed or ratified');
    }
    const superseded = {
        ...oldDoc,
        status: 'superseded',
        supersededBy: newDoc.id,
    };
    return { superseded, successor: { ...newDoc } };
}
//# sourceMappingURL=documents.js.map