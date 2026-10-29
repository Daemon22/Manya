/**
 * @manya-os/ledger — audit-log exporter (JSON, JSONL, CSV).
 *
 * Exports a sequence of ledger events in one of three formats:
 *   - `json`  — a single JSON array of events.
 *   - `jsonl` — one JSON object per line (recommended for streaming).
 *   - `csv`   — comma-separated values; columns are `seq,type,actor,timestamp,
 *               hash,prevHash` plus top-level payload keys (discovered from
 *               the first event).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */

import { ExportError } from '../errors.js';
import type { LedgerEvent } from '../types.js';

/** Supported export formats. */
export type ExportFormat = 'json' | 'jsonl' | 'csv';

/** Options for {@link exportAuditLog}. */
export interface ExportOptions {
  /**
   * Optional filter predicate. Only events for which the predicate returns
   * `true` are exported.
   */
  filter?: (event: LedgerEvent) => boolean;
  /** Whether to include the optional `signature` / `signatureAlgorithm` / `metadata` fields. Defaults to `true`. */
  includeSignatureFields?: boolean;
  /**
   * For CSV export: the maximum number of payload keys to expand as columns.
   * Defaults to 64. Payloads with more top-level keys have all keys beyond
   * the limit folded into a single `payload_extra` JSON column.
   */
  maxCsvPayloadColumns?: number;
}

/**
 * Export an array of ledger events.
 *
 * @param events - Events to export (in chain order).
 * @param format - Output format: `'json'`, `'jsonl'`, or `'csv'`.
 * @param opts - Optional parameters.
 * @returns A string containing the exported audit log.
 */
export function exportAuditLog(
  events: LedgerEvent[],
  format: ExportFormat,
  opts: ExportOptions = {}
): string {
  if (!Array.isArray(events)) {
    throw new ExportError('exportAuditLog: events must be an array');
  }
  const filtered = opts.filter ? events.filter(opts.filter) : events;
  const includeSigs = opts.includeSignatureFields !== false;
  switch (format) {
    case 'json':
      return exportJson(filtered, includeSigs);
    case 'jsonl':
      return exportJsonl(filtered, includeSigs);
    case 'csv':
      return exportCsv(filtered, includeSigs, opts.maxCsvPayloadColumns ?? 64);
    default:
      throw new ExportError(`exportAuditLog: unknown format "${format as string}"`);
  }
}

/**
 * Re-import a JSONL export produced by {@link exportAuditLog}.
 *
 * Each line MUST be a JSON-encoded {@link LedgerEvent}. Blank lines are
 * skipped; a parse failure on any non-blank line throws {@link ExportError}.
 *
 * @param jsonl - The JSONL string to parse.
 * @returns Parsed events.
 */
export function importJsonl(jsonl: string): LedgerEvent[] {
  if (typeof jsonl !== 'string') {
    throw new ExportError('importJsonl: input must be a string');
  }
  const lines = jsonl.split('\n');
  const out: LedgerEvent[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    let ev: unknown;
    try {
      ev = JSON.parse(line);
    } catch (err) {
      throw new ExportError(
        `importJsonl: cannot parse line ${i + 1}: ${(err as Error).message}`,
        err
      );
    }
    out.push(ev as LedgerEvent);
  }
  return out;
}

function exportJson(events: LedgerEvent[], includeSigs: boolean): string {
  return JSON.stringify(events.map((e) => projectEvent(e, includeSigs)), null, 2);
}

function exportJsonl(events: LedgerEvent[], includeSigs: boolean): string {
  return events.map((e) => JSON.stringify(projectEvent(e, includeSigs))).join('\n') + (events.length ? '\n' : '');
}

function exportCsv(
  events: LedgerEvent[],
  includeSigs: boolean,
  maxPayloadCols: number
): string {
  const baseCols = ['seq', 'type', 'actor', 'timestamp', 'hash', 'prevHash'];
  const sigCols = includeSigs ? ['signature', 'signatureAlgorithm'] : [];
  // Discover payload columns from the first event.
  const payloadKeys: string[] = [];
  const seen = new Set<string>();
  for (const ev of events) {
    if (ev.payload && typeof ev.payload === 'object') {
      for (const k of Object.keys(ev.payload)) {
        if (!seen.has(k)) {
          seen.add(k);
          payloadKeys.push(k);
        }
      }
    }
  }
  const payloadCols = payloadKeys.slice(0, maxPayloadCols);
  const hasPayloadExtra = payloadKeys.length > payloadCols.length;
  const header = [
    ...baseCols,
    ...payloadCols,
    ...(hasPayloadExtra ? ['payload_extra'] : []),
    ...sigCols,
    'id',
  ];
  const rows: string[] = [header.map(csvEscape).join(',')];
  for (const ev of events) {
    const row: string[] = [];
    row.push(String(ev.seq));
    row.push(csvEscape(ev.type));
    row.push(csvEscape(ev.actor));
    row.push(csvEscape(ev.timestamp));
    row.push(csvEscape(ev.hash));
    row.push(csvEscape(ev.prevHash));
    for (const k of payloadCols) {
      const v = (ev.payload as Record<string, unknown>)?.[k];
      row.push(csvEscape(v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v)));
    }
    if (hasPayloadExtra) {
      const extra: Record<string, unknown> = {};
      for (const k of payloadKeys.slice(maxPayloadCols)) {
        extra[k] = (ev.payload as Record<string, unknown>)[k];
      }
      row.push(csvEscape(JSON.stringify(extra)));
    }
    if (includeSigs) {
      row.push(csvEscape(ev.signature ?? ''));
      row.push(csvEscape(ev.signatureAlgorithm ?? ''));
    }
    row.push(csvEscape(ev.id));
    rows.push(row.join(','));
  }
  return rows.join('\n') + (rows.length ? '\n' : '');
}

function projectEvent(ev: LedgerEvent, includeSigs: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: ev.id,
    seq: ev.seq,
    type: ev.type,
    actor: ev.actor,
    payload: ev.payload,
    timestamp: ev.timestamp,
    prevHash: ev.prevHash,
    hash: ev.hash,
  };
  if (includeSigs && ev.signature !== undefined) out.signature = ev.signature;
  if (includeSigs && ev.signatureAlgorithm !== undefined) {
    out.signatureAlgorithm = ev.signatureAlgorithm;
  }
  if (ev.metadata !== undefined) out.metadata = ev.metadata;
  return out;
}

/**
 * CSV-quote a value per RFC 4180: wrap in double quotes if the value contains
 * a comma, double-quote, or newline; double any embedded double-quotes.
 */
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : String(value);
  if (/[",\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
