"use strict";
/**
 * @manya-os/anonymize — document metadata handling.
 *
 * Supports PDF (Info dictionary), DOCX (core.xml), and a generic
 * key-value form. Strips author, dates, IDs, revision history.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePdfInfo = parsePdfInfo;
exports.parseDocxCoreXml = parseDocxCoreXml;
exports.normalizeMetadata = normalizeMetadata;
exports.scrubDocumentMetadata = scrubDocumentMetadata;
exports.assertDocumentClean = assertDocumentClean;
const errors_js_1 = require("../errors.js");
const scrubber_js_1 = require("../metadata/scrubber.js");
/** Parse a PDF Info dictionary from a raw string (very minimal — key/value pairs). */
function parsePdfInfo(raw) {
    // This is a defensive parser — production code should use a real PDF library.
    const out = {};
    const re = /\/(Title|Author|Subject|Keywords|Creator|Producer|CreationDate|ModDate|ID)\s*\(([^)]*)\)/g;
    let m;
    while ((m = re.exec(raw)) !== null) {
        out[m[1]] = m[2];
    }
    return out;
}
/** Parse a DOCX core.xml string (very minimal). */
function parseDocxCoreXml(raw) {
    const out = {};
    const fields = [
        ['title', /<dc:title>([^<]*)<\/dc:title>/],
        ['author', /<dc:creator>([^<]*)<\/dc:creator>/],
        ['subject', /<dc:subject>([^<]*)<\/dc:subject>/],
        ['keywords', /<cp:keywords>([^<]*)<\/cp:keywords>/],
        ['createdAt', /<dcterms:created[^>]*>([^<]*)<\/dcterms:created>/],
        ['modifiedAt', /<dcterms:modified[^>]*>([^<]*)<\/dcterms:modified>/],
        ['revision', /<cp:revision>([^<]*)<\/cp:revision>/],
        ['identifier', /<dc:identifier>([^<]*)<\/dc:identifier>/],
    ];
    for (const [k, re] of fields) {
        const m = re.exec(raw);
        if (m)
            out[k] = m[1];
    }
    return out;
}
/** Normalize a raw metadata object into the normalized form. Case-insensitive key lookup. */
function normalizeMetadata(kind, raw) {
    // Case-insensitive lookup helper.
    const get = (key) => {
        const lk = key.toLowerCase();
        for (const k of Object.keys(raw)) {
            if (k.toLowerCase() === lk)
                return raw[k];
        }
        return undefined;
    };
    const keywords = get('keywords');
    const revision = get('revision');
    return {
        kind,
        raw,
        normalized: {
            title: get('title'),
            author: get('author'),
            subject: get('subject'),
            keywords: typeof keywords === 'string' ? keywords.split(',').map(s => s.trim()) : undefined,
            creator: get('creator'),
            producer: get('producer'),
            createdAt: get('createdAt'),
            modifiedAt: get('modifiedAt'),
            revision: typeof revision === 'string' ? parseInt(revision, 10) : (typeof revision === 'number' ? revision : undefined),
            identifier: get('identifier'),
        },
    };
}
/** Scrub a DocumentMetadata object. Returns a new object. */
function scrubDocumentMetadata(meta, opts = {}) {
    const clean = (0, scrubber_js_1.scrubMetadata)(meta.raw, opts);
    return normalizeMetadata(meta.kind, clean);
}
/** Assert metadata has no residual sensitive fields. */
function assertDocumentClean(meta, opts = {}) {
    if (meta.normalized.author)
        throw new errors_js_1.AnonymizeError(`Document author not stripped: '${meta.normalized.author}'`);
    if (meta.normalized.identifier)
        throw new errors_js_1.AnonymizeError(`Document identifier not stripped: '${meta.normalized.identifier}'`);
    for (const k of Object.keys(meta.raw)) {
        if (k.toLowerCase() === 'author' || k.toLowerCase() === 'creator') {
            throw new errors_js_1.AnonymizeError(`Residual sensitive field: '${k}'`);
        }
    }
    void opts;
}
//# sourceMappingURL=metadata.js.map