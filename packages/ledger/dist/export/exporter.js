"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportAuditLog = exportAuditLog;
exports.importJsonl = importJsonl;
const errors_js_1 = require("../errors.js");
/**
 * Export an array of ledger events.
 *
 * @param events - Events to export (in chain order).
 * @param format - Output format: `'json'`, `'jsonl'`, or `'csv'`.
 * @param opts - Optional parameters.
 * @returns A string containing the exported audit log.
 */
function exportAuditLog(events, format, opts = {}) {
    if (!Array.isArray(events)) {
        throw new errors_js_1.ExportError('exportAuditLog: events must be an array');
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
            throw new errors_js_1.ExportError(`exportAuditLog: unknown format "${format}"`);
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
function importJsonl(jsonl) {
    if (typeof jsonl !== 'string') {
        throw new errors_js_1.ExportError('importJsonl: input must be a string');
    }
    const lines = jsonl.split('\n');
    const out = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.length === 0)
            continue;
        let ev;
        try {
            ev = JSON.parse(line);
        }
        catch (err) {
            throw new errors_js_1.ExportError(`importJsonl: cannot parse line ${i + 1}: ${err.message}`, err);
        }
        out.push(ev);
    }
    return out;
}
function exportJson(events, includeSigs) {
    return JSON.stringify(events.map((e) => projectEvent(e, includeSigs)), null, 2);
}
function exportJsonl(events, includeSigs) {
    return events.map((e) => JSON.stringify(projectEvent(e, includeSigs))).join('\n') + (events.length ? '\n' : '');
}
function exportCsv(events, includeSigs, maxPayloadCols) {
    const baseCols = ['seq', 'type', 'actor', 'timestamp', 'hash', 'prevHash'];
    const sigCols = includeSigs ? ['signature', 'signatureAlgorithm'] : [];
    // Discover payload columns from the first event.
    const payloadKeys = [];
    const seen = new Set();
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
    const rows = [header.map(csvEscape).join(',')];
    for (const ev of events) {
        const row = [];
        row.push(String(ev.seq));
        row.push(csvEscape(ev.type));
        row.push(csvEscape(ev.actor));
        row.push(csvEscape(ev.timestamp));
        row.push(csvEscape(ev.hash));
        row.push(csvEscape(ev.prevHash));
        for (const k of payloadCols) {
            const v = ev.payload?.[k];
            row.push(csvEscape(v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v)));
        }
        if (hasPayloadExtra) {
            const extra = {};
            for (const k of payloadKeys.slice(maxPayloadCols)) {
                extra[k] = ev.payload[k];
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
function projectEvent(ev, includeSigs) {
    const out = {
        id: ev.id,
        seq: ev.seq,
        type: ev.type,
        actor: ev.actor,
        payload: ev.payload,
        timestamp: ev.timestamp,
        prevHash: ev.prevHash,
        hash: ev.hash,
    };
    if (includeSigs && ev.signature !== undefined)
        out.signature = ev.signature;
    if (includeSigs && ev.signatureAlgorithm !== undefined) {
        out.signatureAlgorithm = ev.signatureAlgorithm;
    }
    if (ev.metadata !== undefined)
        out.metadata = ev.metadata;
    return out;
}
/**
 * CSV-quote a value per RFC 4180: wrap in double quotes if the value contains
 * a comma, double-quote, or newline; double any embedded double-quotes.
 */
function csvEscape(value) {
    if (value === null || value === undefined)
        return '';
    const s = typeof value === 'string' ? value : String(value);
    if (/[",\r\n]/.test(s)) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}
//# sourceMappingURL=exporter.js.map