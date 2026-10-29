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
import type { DeviceSignals, RedactedDeviceSignals } from '../types.js';
/** Redacted marker used by {@link redactSignals}. */
export declare const REDACTED = "[redacted]";
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
export declare function collectDeviceSignals(): DeviceSignals;
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
export declare function redactSignals(signals: DeviceSignals): RedactedDeviceSignals;
/**
 * Produce a deterministic, opaque device id from signals (NOT the fingerprint
 * itself, but a stable identifier suitable for correlation across calls).
 *
 * Used internally by collectors that need an id but must not leak the full
 * signal vector. Computed as `sha256(stableJSON(signals)).slice(0, 16)`.
 *
 * @internal
 */
export declare function deriveDeviceId(signals: DeviceSignals): string;
/**
 * Stable JSON stringify with sorted keys. Used to ensure the fingerprint hash
 * is reproducible across call sites and Node versions (where object key order
 * is generally insertion order but we don't want to depend on that).
 *
 * @internal
 */
export declare function stableStringify(value: unknown): string;
/**
 * Generate a fresh, random device correlation id (UUID v4). Used when no
 * machine id is available and the caller still wants a stable per-process
 * identifier — NOT a substitute for a real fingerprint.
 */
export declare function newCorrelationId(): string;
export declare const LINUX_MACHINE_ID_PATHS: readonly ["/etc/machine-id", "/var/lib/dbus/machine-id"];
//# sourceMappingURL=collector.d.ts.map