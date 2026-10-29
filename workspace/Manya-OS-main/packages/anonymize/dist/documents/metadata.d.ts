/**
 * @manya-os/anonymize — document metadata handling.
 *
 * Supports PDF (Info dictionary), DOCX (core.xml), and a generic
 * key-value form. Strips author, dates, IDs, revision history.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import { type MetadataScrubOptions } from '../metadata/scrubber.js';
/** Document kinds with first-class metadata support. */
export type DocumentKind = 'pdf' | 'docx' | 'odt' | 'html' | 'generic';
/** A typed document metadata block. */
export interface DocumentMetadata {
    kind: DocumentKind;
    /** Raw metadata fields as parsed from the document. */
    raw: Record<string, unknown>;
    /** Parsed into a normalized form. */
    normalized: {
        title?: string;
        author?: string;
        subject?: string;
        keywords?: string[];
        creator?: string;
        producer?: string;
        createdAt?: string;
        modifiedAt?: string;
        revision?: number;
        identifier?: string;
    };
}
/** Parse a PDF Info dictionary from a raw string (very minimal — key/value pairs). */
export declare function parsePdfInfo(raw: string): Record<string, unknown>;
/** Parse a DOCX core.xml string (very minimal). */
export declare function parseDocxCoreXml(raw: string): Record<string, unknown>;
/** Normalize a raw metadata object into the normalized form. Case-insensitive key lookup. */
export declare function normalizeMetadata(kind: DocumentKind, raw: Record<string, unknown>): DocumentMetadata;
/** Scrub a DocumentMetadata object. Returns a new object. */
export declare function scrubDocumentMetadata(meta: DocumentMetadata, opts?: MetadataScrubOptions): DocumentMetadata;
/** Assert metadata has no residual sensitive fields. */
export declare function assertDocumentClean(meta: DocumentMetadata, opts?: MetadataScrubOptions): void;
//# sourceMappingURL=metadata.d.ts.map