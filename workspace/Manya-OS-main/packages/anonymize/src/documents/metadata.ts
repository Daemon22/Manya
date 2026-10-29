/**
 * @manya-os/anonymize — document metadata handling.
 *
 * Supports PDF (Info dictionary), DOCX (core.xml), and a generic
 * key-value form. Strips author, dates, IDs, revision history.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { AnonymizeError } from '../errors.js';
import { scrubMetadata, type MetadataScrubOptions } from '../metadata/scrubber.js';

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
export function parsePdfInfo(raw: string): Record<string, unknown> {
  // This is a defensive parser — production code should use a real PDF library.
  const out: Record<string, unknown> = {};
  const re = /\/(Title|Author|Subject|Keywords|Creator|Producer|CreationDate|ModDate|ID)\s*\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    out[m[1]] = m[2];
  }
  return out;
}

/** Parse a DOCX core.xml string (very minimal). */
export function parseDocxCoreXml(raw: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const fields: Array<[string, RegExp]> = [
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
    if (m) out[k] = m[1];
  }
  return out;
}

/** Normalize a raw metadata object into the normalized form. Case-insensitive key lookup. */
export function normalizeMetadata(kind: DocumentKind, raw: Record<string, unknown>): DocumentMetadata {
  // Case-insensitive lookup helper.
  const get = (key: string): unknown => {
    const lk = key.toLowerCase();
    for (const k of Object.keys(raw)) {
      if (k.toLowerCase() === lk) return raw[k];
    }
    return undefined;
  };
  const keywords = get('keywords');
  const revision = get('revision');
  return {
    kind,
    raw,
    normalized: {
      title: get('title') as string | undefined,
      author: get('author') as string | undefined,
      subject: get('subject') as string | undefined,
      keywords: typeof keywords === 'string' ? keywords.split(',').map(s => s.trim()) : undefined,
      creator: get('creator') as string | undefined,
      producer: get('producer') as string | undefined,
      createdAt: get('createdAt') as string | undefined,
      modifiedAt: get('modifiedAt') as string | undefined,
      revision: typeof revision === 'string' ? parseInt(revision, 10) : (typeof revision === 'number' ? revision : undefined),
      identifier: get('identifier') as string | undefined,
    },
  };
}

/** Scrub a DocumentMetadata object. Returns a new object. */
export function scrubDocumentMetadata(meta: DocumentMetadata, opts: MetadataScrubOptions = {}): DocumentMetadata {
  const clean = scrubMetadata(meta.raw, opts) as Record<string, unknown>;
  return normalizeMetadata(meta.kind, clean);
}

/** Assert metadata has no residual sensitive fields. */
export function assertDocumentClean(meta: DocumentMetadata, opts: MetadataScrubOptions = {}): void {
  if (meta.normalized.author) throw new AnonymizeError(`Document author not stripped: '${meta.normalized.author}'`);
  if (meta.normalized.identifier) throw new AnonymizeError(`Document identifier not stripped: '${meta.normalized.identifier}'`);
  for (const k of Object.keys(meta.raw)) {
    if (k.toLowerCase() === 'author' || k.toLowerCase() === 'creator') {
      throw new AnonymizeError(`Residual sensitive field: '${k}'`);
    }
  }
  void opts;
}
