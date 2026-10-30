"use strict";
/**
 * @manya-os/nervous-system — network statistics source.
 *
 * Periodically samples network interface counters. On Linux, parses
 * `/proc/net/dev` for per-interface byte counters; on other platforms,
 * falls back to `os.networkInterfaces()` and reports only the interface
 * list with `rx_bytes`/`tx_bytes` set to 0 (and emits a one-time warning).
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
exports.NetworkSource = exports.DEFAULT_NETWORK_INTERVAL_MS = void 0;
exports.readLinuxNetDev = readLinuxNetDev;
const node_fs_1 = require("node:fs");
const os = __importStar(require("node:os"));
const event_js_1 = require("../event/event.js");
/** Default sampling interval. */
exports.DEFAULT_NETWORK_INTERVAL_MS = 5_000;
/**
 * Periodically emits `net.stats` events with payload shape:
 * ```ts
 * {
 *   interfaces: Array<{ name, rxBytes, txBytes }>,
 *   rx_bytes: number,    // sum across all interfaces
 *   tx_bytes: number,    // sum across all interfaces
 * }
 * ```
 *
 * Defensive: if `/proc/net/dev` is unavailable (non-Linux), emits a single
 * `net.warning` event and falls back to `os.networkInterfaces()` (with byte
 * counters zeroed).
 */
class NetworkSource {
    id;
    intervalMs;
    severity;
    tags;
    timer = null;
    sink = null;
    warned = false;
    constructor(opts) {
        const o = opts ?? {};
        this.id = o.id ?? 'network';
        this.intervalMs = o.intervalMs ?? exports.DEFAULT_NETWORK_INTERVAL_MS;
        this.severity = o.severity ?? 'info';
        this.tags = o.tags;
        if (!Number.isFinite(this.intervalMs) || this.intervalMs <= 0) {
            throw new RangeError('NetworkSource: intervalMs must be a positive number');
        }
    }
    /** Begin emitting network stats on the configured interval. */
    start(sink) {
        if (this.timer)
            return;
        this.sink = sink;
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
    /** Emit a single sample. Public for testing. */
    sample() {
        if (!this.sink)
            return;
        const interfaces = readLinuxNetDev();
        if (interfaces === null) {
            if (!this.warned) {
                this.warned = true;
                const ev = (0, event_js_1.createEvent)('net.warning', this.id, {
                    reason: '/proc/net/dev unavailable on this platform; reporting interface names only',
                }, { severity: 'warn' });
                this.emit(ev);
            }
            // Fallback: enumerate via os.networkInterfaces(), byte counters zeroed.
            const names = Object.keys(os.networkInterfaces() ?? {});
            const fallback = names.map((name) => ({ name, rxBytes: 0, txBytes: 0 }));
            this.emitStats(fallback);
            return;
        }
        this.emitStats(interfaces);
    }
    emitStats(interfaces) {
        let rx = 0, tx = 0;
        for (const i of interfaces) {
            rx += i.rxBytes;
            tx += i.txBytes;
        }
        const ev = (0, event_js_1.createEvent)('net.stats', this.id, {
            interfaces,
            rx_bytes: rx,
            tx_bytes: tx,
        }, { severity: this.severity, tags: this.tags });
        this.emit(ev);
    }
    emit(ev) {
        try {
            this.sink?.(ev);
        }
        catch { /* swallow */ }
    }
}
exports.NetworkSource = NetworkSource;
/**
 * Parse `/proc/net/dev`. Returns `null` if unavailable.
 * Format (Linux):
 *   Inter-|   Receive                                                |  Transmit
 *     face |bytes packets errs drop fifo frame compressed multicast|bytes packets ...
 *       lo: 1234 56 0 0 0 0 0 0  4321 87 0 0 0 0 0 0
 *     eth0: 99 12 0 0 0 0 0 0  77 11 0 0 0 0 0 0
 */
function readLinuxNetDev() {
    let data;
    try {
        data = (0, node_fs_1.readFileSync)('/proc/net/dev', 'utf8');
    }
    catch {
        return null;
    }
    const lines = data.split('\n');
    // Drop the two header lines.
    const out = [];
    for (let i = 2; i < lines.length; i++) {
        const line = lines[i];
        if (!line || !line.trim())
            continue;
        const colonIdx = line.indexOf(':');
        if (colonIdx < 0)
            continue;
        const name = line.slice(0, colonIdx).trim();
        const rest = line.slice(colonIdx + 1).trim().split(/\s+/);
        // [0] = rx bytes, [8] = tx bytes
        const rxBytes = Number(rest[0] ?? 0);
        const txBytes = Number(rest[8] ?? 0);
        if (!Number.isFinite(rxBytes) || !Number.isFinite(txBytes))
            continue;
        out.push({ name, rxBytes, txBytes });
    }
    return out;
}
//# sourceMappingURL=network.js.map