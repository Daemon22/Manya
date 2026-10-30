"use strict";
/**
 * @manya-os/nervous-system — operating-system metrics source.
 *
 * Periodically samples `os.cpus()`, `os.loadavg()`, `os.totalmem()`,
 * `os.freemem()`, and `os.uptime()` and emits `os.metrics` events.
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
exports.OSSource = exports.DEFAULT_OS_INTERVAL_MS = void 0;
const os = __importStar(require("node:os"));
const event_js_1 = require("../event/event.js");
/** Default sampling interval (5s). */
exports.DEFAULT_OS_INTERVAL_MS = 5_000;
/**
 * Periodically emits `os.metrics` events with payload shape:
 * ```ts
 * {
 *   cpus: os.CpuInfo[],
 *   loadavg: [number, number, number],
 *   memory: { total: number, free: number, used: number, usedPct: number },
 *   uptime: number,
 * }
 * ```
 */
class OSSource {
    id;
    intervalMs;
    severity;
    tags;
    timer = null;
    sink = null;
    constructor(opts) {
        const o = opts ?? {};
        this.id = o.id ?? 'os';
        this.intervalMs = o.intervalMs ?? exports.DEFAULT_OS_INTERVAL_MS;
        this.severity = o.severity ?? 'info';
        this.tags = o.tags;
        if (!Number.isFinite(this.intervalMs) || this.intervalMs <= 0) {
            throw new RangeError('OSSource: intervalMs must be a positive number');
        }
    }
    /** Begin emitting metrics on the configured interval. */
    start(sink) {
        if (this.timer)
            return;
        this.sink = sink;
        // Emit one immediately so consumers don't wait a full interval.
        this.sample();
        this.timer = setInterval(() => this.sample(), this.intervalMs);
        if (typeof this.timer.unref === 'function')
            this.timer.unref();
    }
    /** Stop emitting. */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.sink = null;
    }
    /** Emit a single sample. */
    sample() {
        if (!this.sink)
            return;
        const cpus = os.cpus();
        const loadavg = os.loadavg();
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        const usedPct = total > 0 ? used / total : 0;
        const payload = {
            cpus,
            loadavg: [loadavg[0] ?? 0, loadavg[1] ?? 0, loadavg[2] ?? 0],
            memory: { total, free, used, usedPct },
            uptime: os.uptime(),
        };
        const ev = (0, event_js_1.createEvent)('os.metrics', this.id, payload, {
            severity: this.severity,
            tags: this.tags,
        });
        try {
            this.sink(ev);
        }
        catch { /* swallow */ }
    }
}
exports.OSSource = OSSource;
//# sourceMappingURL=os.js.map