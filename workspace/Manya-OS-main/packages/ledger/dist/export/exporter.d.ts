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
export declare function exportAuditLog(events: LedgerEvent[], format: ExportFormat, opts?: ExportOptions): string;
/**
 * Re-import a JSONL export produced by {@link exportAuditLog}.
 *
 * Each line MUST be a JSON-encoded {@link LedgerEvent}. Blank lines are
 * skipped; a parse failure on any non-blank line throws {@link ExportError}.
 *
 * @param jsonl - The JSONL string to parse.
 * @returns Parsed events.
 */
export declare function importJsonl(jsonl: string): LedgerEvent[];
//# sourceMappingURL=exporter.d.ts.map