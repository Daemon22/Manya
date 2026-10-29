"use strict";
/**
 * @manya-os/memory — import/export.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportSnapshot = exportSnapshot;
exports.importSnapshot = importSnapshot;
exports.exportEpisodic = exportEpisodic;
exports.exportSemantic = exportSemantic;
exports.mergeImport = mergeImport;
const errors_js_1 = require("../errors.js");
/** Export a snapshot to a JSON string. */
function exportSnapshot(snapshot) {
    if (!snapshot)
        throw new errors_js_1.MemoryError('snapshot is required');
    return JSON.stringify(snapshot, null, 2);
}
/** Import a snapshot from a JSON string. */
function importSnapshot(json) {
    try {
        const s = JSON.parse(json);
        if (!s.schemaVersion || !Array.isArray(s.episodic)) {
            throw new errors_js_1.MemoryError('invalid snapshot structure');
        }
        return s;
    }
    catch (err) {
        if (err instanceof errors_js_1.MemoryError)
            throw err;
        throw new errors_js_1.MemoryError('failed to parse snapshot', undefined, err);
    }
}
/** Export only episodic events (e.g. for sharing experience logs). */
function exportEpisodic(snapshot) {
    return JSON.stringify({ schemaVersion: 1, type: 'episodic', events: snapshot.episodic }, null, 2);
}
/** Export only semantic facts (e.g. for knowledge transfer). */
function exportSemantic(snapshot) {
    return JSON.stringify({ schemaVersion: 1, type: 'semantic', facts: snapshot.semantic }, null, 2);
}
/** Merge an imported partial snapshot (episodic or semantic) into a base snapshot. */
function mergeImport(base, json) {
    const partial = JSON.parse(json);
    if (partial.type === 'episodic' && Array.isArray(partial.events)) {
        const existingIds = new Set(base.episodic.map(e => e.id));
        for (const e of partial.events) {
            const ev = e;
            if (!existingIds.has(ev.id))
                base.episodic.push(ev);
        }
    }
    else if (partial.type === 'semantic' && Array.isArray(partial.facts)) {
        const existingIds = new Set(base.semantic.map(s => s.id));
        for (const s of partial.facts) {
            const fact = s;
            if (!existingIds.has(fact.id))
                base.semantic.push(fact);
        }
    }
    else {
        throw new errors_js_1.MemoryError('unrecognized import format');
    }
    return base;
}
//# sourceMappingURL=io.js.map