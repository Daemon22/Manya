"use strict";
/**
 * @manya-os/ledger — file-backed ledger store (append-only).
 *
 * Persists events to a single append-only file as JSON-per-line (JSONL).
 * Provides:
 *   - atomic appends via `fs.appendFileSync` (POSIX append is atomic for
 *     writes smaller than `PIPE_BUF`, typically 4 KiB);
 *   - an in-memory index for O(1) `getById` lookups;
 *   - periodic compaction when the file exceeds `compactThresholdBytes`
 *     (rewrites the file with the current in-memory state).
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon), founder
 * of the Manya Hael Foundation.
 *
 * Licensed under the Apache License, Version 2.0.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileLedgerStore = exports.DEFAULT_COMPACT_THRESHOLD_BYTES = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const errors_js_1 = require("../errors.js");
const memory_js_1 = require("./memory.js");
/** Default compaction threshold (1 MiB). */
exports.DEFAULT_COMPACT_THRESHOLD_BYTES = 1024 * 1024;
/**
 * File-backed {@link LedgerStore}.
 *
 * The data file path is `<dir>/<name>.jsonl`. A sidecar index file
 * `<dir>/<name>.idx.json` maps event ids to line numbers for fast `getById`
 * (the index is rebuilt lazily if missing or stale).
 */
class FileLedgerStore {
    events = [];
    byId = new Map();
    dataPath;
    indexPath;
    compactThreshold;
    /**
     * Open (or create) a file-backed store.
     *
     * @param dir - Directory holding the data + index files.
     * @param name - Base name (without extension).
     * @param opts - Optional parameters.
     */
    constructor(dir, name = 'ledger', opts = {}) {
        if (typeof dir !== 'string' || dir.length === 0) {
            throw new errors_js_1.StoreError('FileLedgerStore: dir must be a non-empty string');
        }
        if (typeof name !== 'string' || name.length === 0) {
            throw new errors_js_1.StoreError('FileLedgerStore: name must be a non-empty string');
        }
        this.dataPath = path.join(dir, `${name}.jsonl`);
        this.indexPath = path.join(dir, `${name}.idx.json`);
        this.compactThreshold =
            opts.compactThresholdBytes ?? exports.DEFAULT_COMPACT_THRESHOLD_BYTES;
        try {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
        catch (err) {
            throw new errors_js_1.StoreError('FileLedgerStore: cannot create directory: ' + err.message, err);
        }
        if (opts.load !== false) {
            this.load();
        }
    }
    /** @inheritdoc */
    append(event) {
        if (!event || typeof event !== 'object') {
            throw new errors_js_1.StoreError('append: event must be a LedgerEvent object');
        }
        if (typeof event.seq !== 'number' || typeof event.id !== 'string') {
            throw new errors_js_1.StoreError('append: event is malformed');
        }
        if (event.seq !== this.events.length + 1) {
            throw new errors_js_1.StoreError(`append: expected seq=${this.events.length + 1}, got seq=${event.seq}`);
        }
        if (this.byId.has(event.id)) {
            throw new errors_js_1.StoreError(`append: duplicate event id ${event.id}`);
        }
        const clone = (0, memory_js_1.cloneEvent)(event);
        const line = JSON.stringify(clone) + '\n';
        try {
            fs.appendFileSync(this.dataPath, line, { encoding: 'utf8' });
        }
        catch (err) {
            throw new errors_js_1.StoreError('append: write failed: ' + err.message, err);
        }
        this.events.push(clone);
        this.byId.set(clone.id, clone);
        // Periodic compaction.
        try {
            const stat = fs.statSync(this.dataPath);
            if (stat.size > this.compactThreshold) {
                this.compact();
            }
        }
        catch {
            // Non-fatal — compaction is best-effort.
        }
    }
    /** @inheritdoc */
    get(seq) {
        if (!Number.isInteger(seq) || seq < 1 || seq > this.events.length)
            return undefined;
        return (0, memory_js_1.cloneEvent)(this.events[seq - 1]);
    }
    /** @inheritdoc */
    getById(id) {
        const ev = this.byId.get(id);
        return ev ? (0, memory_js_1.cloneEvent)(ev) : undefined;
    }
    /** @inheritdoc */
    length() {
        return this.events.length;
    }
    /** @inheritdoc */
    all() {
        return this.events.map(memory_js_1.cloneEvent);
    }
    /** @inheritdoc */
    snapshot() {
        return this.events.map(memory_js_1.cloneEvent);
    }
    /** @inheritdoc */
    restore(events) {
        if (!Array.isArray(events)) {
            throw new errors_js_1.StoreError('restore: events must be an array');
        }
        this.events.length = 0;
        this.byId.clear();
        for (let i = 0; i < events.length; i++) {
            const ev = events[i];
            if (!ev || typeof ev !== 'object') {
                throw new errors_js_1.StoreError(`restore: event ${i} is malformed`);
            }
            if (ev.seq !== i + 1) {
                throw new errors_js_1.StoreError(`restore: event ${i} has seq=${ev.seq}, expected ${i + 1}`);
            }
            if (this.byId.has(ev.id)) {
                throw new errors_js_1.StoreError(`restore: duplicate event id ${ev.id}`);
            }
            const clone = (0, memory_js_1.cloneEvent)(ev);
            this.events.push(clone);
            this.byId.set(clone.id, clone);
        }
        this.compact();
    }
    /** Path to the JSONL data file (exposed for tests + tooling). */
    getDataPath() {
        return this.dataPath;
    }
    /** Path to the sidecar index file (exposed for tests + tooling). */
    getIndexPath() {
        return this.indexPath;
    }
    /**
     * Rewrite the data file from the in-memory state. Also rewrites the
     * sidecar index. Use after bulk in-memory mutations.
     */
    compact() {
        try {
            const lines = this.events.map((e) => JSON.stringify(e)).join('\n') + '\n';
            // Atomic-ish write: write to a temp file then rename.
            const tmp = this.dataPath + '.tmp';
            fs.writeFileSync(tmp, lines, { encoding: 'utf8' });
            fs.renameSync(tmp, this.dataPath);
            // Rebuild the sidecar index.
            const idx = {};
            this.events.forEach((e, i) => {
                idx[e.id] = i + 1; // 1-based line numbers
            });
            const idxTmp = this.indexPath + '.tmp';
            fs.writeFileSync(idxTmp, JSON.stringify(idx), { encoding: 'utf8' });
            fs.renameSync(idxTmp, this.indexPath);
        }
        catch (err) {
            throw new errors_js_1.StoreError('compact failed: ' + err.message, err);
        }
    }
    /** Load events from the data file (called by the constructor). */
    load() {
        if (!fs.existsSync(this.dataPath))
            return;
        let content;
        try {
            content = fs.readFileSync(this.dataPath, 'utf8');
        }
        catch (err) {
            throw new errors_js_1.StoreError('load: cannot read data file: ' + err.message, err);
        }
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.length === 0)
                continue;
            let ev;
            try {
                ev = JSON.parse(line);
            }
            catch (err) {
                throw new errors_js_1.StoreError(`load: cannot parse line ${i + 1}: ${err.message}`, err);
            }
            if (!ev || typeof ev !== 'object') {
                throw new errors_js_1.StoreError(`load: line ${i + 1} is not an object`);
            }
            if (ev.seq !== this.events.length + 1) {
                throw new errors_js_1.StoreError(`load: line ${i + 1} has seq=${ev.seq}, expected ${this.events.length + 1}`);
            }
            if (this.byId.has(ev.id)) {
                throw new errors_js_1.StoreError(`load: duplicate event id ${ev.id}`);
            }
            const clone = (0, memory_js_1.cloneEvent)(ev);
            this.events.push(clone);
            this.byId.set(clone.id, clone);
        }
    }
}
exports.FileLedgerStore = FileLedgerStore;
//# sourceMappingURL=file.js.map