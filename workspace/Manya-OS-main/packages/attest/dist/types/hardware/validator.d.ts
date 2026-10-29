/**
 * @manya-os/attest — hardware validator (TPM / Secure Enclave / TEE probes).
 *
 * Probes the local host for the presence of hardware attestation roots.
 * All probes are wrapped in try/catch — `probe()` MUST NOT throw.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
import type { HardwareProbe } from '../types.js';
/**
 * Glob a directory for entries matching a pattern (synchronously, no
 * dependencies). Returns matching full paths.
 *
 * @internal
 */
declare function globDir(dir: string, pattern: RegExp): string[];
export declare class HardwareValidator {
    /**
     * Probe the local host.
     *
     * Platform behavior:
     *   - `linux`: probes `/dev/tpm*`, `/sys/class/tpm/`, `/dev/sgx*`, `/dev/tee*`,
     *     `/sys/module/kvm_amd/parameters/sev_es`, and `/proc/cpuinfo` for
     *     `sgx`/`sev` flags.
     *   - `darwin`: shells out to `ioreg` for the Apple Secure Enclave, and to
     *     `system_profiler` for the Apple T2 / Apple Silicon bridge.
      *   - `win32`: queries the TPM, VBS, and Credential Guard registry keys.
     *   - other platforms: returns `{ tpm: false, secureEnclave: false, tee: false,
     *     details: 'unsupported platform' }`.
     */
    probe(): HardwareProbe;
    /**
     * Convenience: probe and return `true` if ANY hardware attestation root
     * is present.
     */
    isAnyHardwarePresent(): boolean;
}
/**
 * Throw a {@link HardwareValidationError} if no hardware attestation root is
 * present. Convenience for callers that want fail-fast behavior.
 */
export declare function requireHardwareOrThrow(validator: HardwareValidator): HardwareProbe;
export { globDir as _globDir };
//# sourceMappingURL=validator.d.ts.map