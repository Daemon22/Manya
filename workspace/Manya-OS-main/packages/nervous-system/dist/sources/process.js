"use strict";
/**
 * @manya-os/nervous-system — process list source.
 *
 * Polls the host's process list using `child_process.exec` to run `ps`
 * (POSIX) or `tasklist` (Windows). Emits `process.spawn` events for newly
 * seen PIDs and `process.exit` events for PIDs that have disappeared since
 * the previous poll. Defensive: if the command is unavailable, emits a
 * single warning event and continues as a no-op.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Conceived, directed, and owned by Uviwe Menyiwe (Azura Daemon),
 * founder of the Manya Hael Foundation.
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
exports.ProcessSource = exports.DEFAULT_PROCESS_INTERVAL_MS = void 0;
const node_child_process_1 = require("node:child_process");
const os = __importStar(require("node:os"));
const event_js_1 = require("../event/event.js");
/** Default polling interval. */
exports.DEFAULT_PROCESS_INTERVAL_MS = 5_000;
/**
 * Polls the process list and emits `process.spawn` / `process.exit` events.
 * Designed to be defensive: never throws from `start()` if `ps`/`tasklist`
 * is unavailable — instead emits a single `process.warning` event.
 */
class ProcessSource {
    id;
    intervalMs;
    severity;
    tags;
    timer = null;
    sink = null;
    seen = new Map();
    warnedUnavailable = false;
    polling = false;
    constructor(opts) {
        const o = opts ?? {};
        this.id = o.id ?? 'process';
        this.intervalMs = o.intervalMs ?? exports.DEFAULT_PROCESS_INTERVAL_MS;
        this.severity = o.severity ?? 'info';
        this.tags = o.tags;
        if (!Number.isFinite(this.intervalMs) || this.intervalMs <= 0) {
            throw new RangeError('ProcessSource: intervalMs must be a positive number');
        }
    }
    /** Begin polling. */
    start(sink) {
        if (this.timer)
            return;
        this.sink = sink;
        this.timer = setInterval(() => { void this.poll(); }, this.intervalMs);
        if (typeof this.timer.unref === 'function')
            this.timer.unref();
        // Fire one poll immediately (asynchronously).
        void this.poll();
    }
    /** Stop polling. */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.sink = null;
        this.seen.clear();
    }
    /** Whether `ps`/`tasklist` is available. Probed on the first poll. */
    isAvailable() { return !this.warnedUnavailable; }
    /** Run a single poll. Public for testing. */
    async poll() {
        if (!this.sink || this.polling)
            return;
        this.polling = true;
        try {
            const entries = await this.snapshot();
            if (entries === null) {
                // Snapshot failed — emit a one-time warning.
                if (!this.warnedUnavailable) {
                    this.warnedUnavailable = true;
                    const ev = (0, event_js_1.createEvent)('process.warning', this.id, {
                        reason: 'process list command unavailable',
                    }, { severity: 'warn' });
                    this.emit(ev);
                }
                return;
            }
            this.warnedUnavailable = false;
            const currentPids = new Set();
            for (const entry of entries) {
                currentPids.add(entry.pid);
                if (!this.seen.has(entry.pid)) {
                    this.seen.set(entry.pid, entry);
                    const ev = (0, event_js_1.createEvent)('process.spawn', this.id, {
                        pid: entry.pid, name: entry.name,
                    }, { severity: this.severity, tags: this.tags });
                    this.emit(ev);
                }
            }
            // Detect exits.
            for (const [pid, entry] of this.seen) {
                if (!currentPids.has(pid)) {
                    this.seen.delete(pid);
                    const ev = (0, event_js_1.createEvent)('process.exit', this.id, {
                        pid, name: entry.name,
                    }, { severity: this.severity, tags: this.tags });
                    this.emit(ev);
                }
            }
        }
        finally {
            this.polling = false;
        }
    }
    emit(ev) {
        try {
            this.sink?.(ev);
        }
        catch { /* swallow */ }
    }
    snapshot() {
        const platform = os.platform();
        const cmd = platform === 'win32'
            ? 'tasklist /FO CSV /NH'
            : 'ps -A -o pid=,comm=';
        return new Promise((resolve) => {
            (0, node_child_process_1.exec)(cmd, { timeout: 5_000 }, (err, stdout) => {
                if (err || !stdout) {
                    resolve(null);
                    return;
                }
                const out = [];
                const lines = stdout.split(/\r?\n/);
                for (const raw of lines) {
                    const line = raw.trim();
                    if (!line)
                        continue;
                    const entry = platform === 'win32' ? parseTasklistLine(line) : parsePsLine(line);
                    if (entry)
                        out.push(entry);
                }
                resolve(out);
            });
        });
    }
}
exports.ProcessSource = ProcessSource;
function parsePsLine(line) {
    // Output format from `ps -A -o pid=,comm=` is whitespace-stripped, e.g.
    //   1 /sbin/init
    //   123 /usr/bin/node
    const match = line.match(/^\s*(\d+)\s+(.+)$/);
    if (!match)
        return null;
    const pid = Number(match[1]);
    if (!Number.isInteger(pid) || pid <= 0)
        return null;
    return { pid, name: match[2].trim() };
}
function parseTasklistLine(line) {
    // `tasklist /FO CSV /NH` produces lines like:
    //   "System Idle Process","0","Services","0","8 K"
    // Strip surrounding quotes and pull the first two fields.
    const cells = line.split('","').map((s) => s.replace(/^"|"$/g, ''));
    if (cells.length < 2)
        return null;
    const name = cells[0];
    const pid = Number(cells[1]);
    if (!name || !Number.isInteger(pid) || pid < 0)
        return null;
    return { pid, name };
}
//# sourceMappingURL=process.js.map