"use strict";
/**
 * @manya-os/attest — device signal collection.
 *
 * Collects hardware/OS signals for device fingerprinting. This module MUST
 * NOT collect personally-identifying information (PII): no OS username, no
 * home directory, no environment variables. The signals describe the
 * physical/virtual hardware only.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
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
exports.LINUX_MACHINE_ID_PATHS = exports.REDACTED = void 0;
exports.collectDeviceSignals = collectDeviceSignals;
exports.redactSignals = redactSignals;
exports.deriveDeviceId = deriveDeviceId;
exports.stableStringify = stableStringify;
exports.newCorrelationId = newCorrelationId;
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process = __importStar(require("child_process"));
const errors_js_1 = require("../errors.js");
const hashing_js_1 = require("../crypto/hashing.js");
/** Redacted marker used by {@link redactSignals}. */
exports.REDACTED = '[redacted]';
/**
 * Execute a shell command and return its trimmed stdout. Throws on non-zero
 * exit. All errors are caught by callers via try/catch.
 *
 * @internal
 */
function execQuiet(cmd, timeoutMs = 500) {
    try {
        const out = child_process.execSync(cmd, {
            timeout: timeoutMs,
            stdio: ['ignore', 'pipe', 'ignore'],
            encoding: 'utf8',
            maxBuffer: 1024 * 1024,
        });
        return out.trim();
    }
    catch {
        return '';
    }
}
/**
 * Collect non-loopback MAC addresses from `os.networkInterfaces()`.
 * Returns lowercased hex strings WITHOUT separators (e.g. `aabbccddeeff`).
 *
 * @internal
 */
function collectMacs() {
    const interfaces = os.networkInterfaces();
    const out = [];
    for (const name of Object.keys(interfaces)) {
        const list = interfaces[name];
        if (!list)
            continue;
        for (const iface of list) {
            if (!iface)
                continue;
            // Skip loopback, internal, and IPv6 link-local. We keep BOTH IPv4
            // and IPv6 non-loopback interfaces — the MAC is the same on both.
            if (iface.internal)
                continue;
            if (!iface.mac)
                continue;
            if (iface.mac === '00:00:00:00:00:00')
                continue;
            // Lowercase, strip separators.
            const mac = iface.mac.toLowerCase().replace(/[:.-]/g, '');
            if (mac.length === 12 && /^[0-9a-f]{12}$/.test(mac)) {
                out.push(mac);
            }
        }
    }
    // Deduplicate while preserving order.
    return Array.from(new Set(out));
}
/**
 * Probe for a stable machine identifier.
 *
 * - On Linux: reads `/etc/machine-id` (or `/var/lib/dbus/machine-id`).
 * - On macOS: shells out to `ioreg` for `IOPlatformUUID`.
 * - On Windows: reads `HKLM\\SOFTWARE\\Microsoft\\Cryptography\\MachineGuid`.
 *
 * Returns `undefined` if no machine id could be determined. All probes are
 * wrapped in try/catch — this function MUST NOT throw.
 *
 * @internal
 */
let cachedMachineId = null;
function detectMachineId() {
    const platform = process.platform;
    try {
        if (platform === 'linux') {
            for (const candidate of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
                try {
                    const content = fs.readFileSync(candidate, 'utf8').trim();
                    if (content && /^[0-9a-f]{32}$/i.test(content)) {
                        return content.toLowerCase();
                    }
                }
                catch {
                    // Try next.
                }
            }
            return undefined;
        }
        if (platform === 'darwin') {
            const out = execQuiet('ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID', 800);
            // Output looks like: "    \"IOPlatformUUID\" = \"DEAD-BEEF-...\""
            const match = out.match(/IOPlatformUUID"\s*=\s*"([0-9A-Fa-f-]{36})"/);
            if (match && match[1])
                return match[1].toLowerCase();
            return undefined;
        }
        if (platform === 'win32') {
            const out = execQuiet('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', 800);
            const match = out.match(/MachineGuid\s+REG_SZ\s+([0-9A-Fa-f-]{36})/);
            if (match && match[1])
                return match[1].toLowerCase();
            return undefined;
        }
    }
    catch {
        // Fall through.
    }
    return undefined;
}
function collectMachineId() {
    if (cachedMachineId !== null)
        return cachedMachineId;
    cachedMachineId = detectMachineId();
    return cachedMachineId;
}
/**
 * Collect device signals for fingerprinting.
 *
 * This function NEVER collects PII (no username, home dir, env vars). It
 * captures:
 * - CPU count, architecture, platform, OS release
 * - hostname
 * - non-loopback MAC addresses (lowercased, no separators)
 * - total system memory
 * - Node.js version
 * - optional stable machine id (Linux `/etc/machine-id`, macOS
 *   `IOPlatformUUID`, Windows `MachineGuid`)
 *
 * Every collection step is wrapped in try/catch — the function returns a
 * partial `DeviceSignals` rather than throwing. The fields `cpus`, `arch`,
 * `platform`, `totalmem`, `nodeVersion` are guaranteed to be present.
 *
 * @returns Device signals (PII-free).
 */
function collectDeviceSignals() {
    try {
        const cpus = safeCpus();
        const arch = safeArch();
        const platform = safePlatform();
        const hostname = safeHostname();
        const macs = collectMacs();
        const totalmem = safeTotalmem();
        const nodeVersion = process.version;
        const release = safeRelease();
        const machineId = collectMachineId();
        return {
            cpus,
            arch,
            platform,
            hostname,
            macs,
            totalmem,
            nodeVersion,
            release,
            ...(machineId !== undefined ? { machineId } : {}),
        };
    }
    catch (err) {
        throw new errors_js_1.FingerprintError('collectDeviceSignals failed: ' + err.message, err);
    }
}
/** @internal */
function safeCpus() {
    try {
        const n = os.cpus().length;
        return typeof n === 'number' && n > 0 ? n : 0;
    }
    catch {
        return 0;
    }
}
/** @internal */
function safeArch() {
    try {
        return process.arch || 'unknown';
    }
    catch {
        return 'unknown';
    }
}
/** @internal */
function safePlatform() {
    try {
        return process.platform || 'unknown';
    }
    catch {
        return 'unknown';
    }
}
/** @internal */
function safeHostname() {
    try {
        return os.hostname() || 'unknown';
    }
    catch {
        return 'unknown';
    }
}
/** @internal */
function safeTotalmem() {
    try {
        const n = os.totalmem();
        return typeof n === 'number' && n > 0 ? n : 0;
    }
    catch {
        return 0;
    }
}
/** @internal */
function safeRelease() {
    try {
        return os.release() || '';
    }
    catch {
        return '';
    }
}
/**
 * Produce a redacted view of {@link DeviceSignals} for logging.
 *
 * Replaces `macs` (with a count marker) and `machineId` (with `[redacted]`).
 * All other fields are preserved because they describe the hardware, not the
 * user.
 *
 * @param signals - The raw device signals.
 * @returns A redacted copy safe for log output.
 */
function redactSignals(signals) {
    return {
        cpus: signals.cpus,
        arch: signals.arch,
        platform: signals.platform,
        hostname: signals.hostname,
        macs: `[${signals.macs.length} mac(s) redacted]`,
        totalmem: signals.totalmem,
        nodeVersion: signals.nodeVersion,
        release: signals.release,
        machineId: signals.machineId ? exports.REDACTED : '',
    };
}
/**
 * Produce a deterministic, opaque device id from signals (NOT the fingerprint
 * itself, but a stable identifier suitable for correlation across calls).
 *
 * Used internally by collectors that need an id but must not leak the full
 * signal vector. Computed as `sha256(stableJSON(signals)).slice(0, 16)`.
 *
 * @internal
 */
function deriveDeviceId(signals) {
    const stable = stableStringify(signals);
    return (0, hashing_js_1.sha256)(stable).toString('hex').slice(0, 16);
}
/**
 * Stable JSON stringify with sorted keys. Used to ensure the fingerprint hash
 * is reproducible across call sites and Node versions (where object key order
 * is generally insertion order but we don't want to depend on that).
 *
 * @internal
 */
function stableStringify(value) {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return '[' + value.map(stableStringify).join(',') + ']';
    }
    const keys = Object.keys(value).sort();
    return '{' + keys
        .map((k) => JSON.stringify(k) + ':' + stableStringify(value[k]))
        .join(',') + '}';
}
/**
 * Generate a fresh, random device correlation id (UUID v4). Used when no
 * machine id is available and the caller still wants a stable per-process
 * identifier — NOT a substitute for a real fingerprint.
 */
function newCorrelationId() {
    return (0, hashing_js_1.uuid)();
}
// Re-export path for callers that want to inspect candidate machine-id paths.
exports.LINUX_MACHINE_ID_PATHS = ['/etc/machine-id', '/var/lib/dbus/machine-id'];
void path; // path import retained for parity / future expansion
//# sourceMappingURL=collector.js.map