/**
 * @manya-os/attest — hardware validator (TPM / Secure Enclave / TEE probes).
 *
 * Probes the local host for the presence of hardware attestation roots.
 * All probes are wrapped in try/catch — `probe()` MUST NOT throw.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import type { HardwareProbe } from '../types.js';
import { HardwareValidationError } from '../errors.js';

/**
 * Execute a shell command and return its trimmed stdout. Returns '' on any
 * error (non-zero exit, timeout, missing binary). Never throws.
 *
 * @internal
 */
function execQuiet(cmd: string, timeoutMs = 800): string {
  try {
    const out = child_process.execSync(cmd, {
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    });
    return out.trim();
  } catch {
    return '';
  }
}

/**
 * Execute a Windows executable without starting an intermediate shell.
 * Shell-based invocation can leave command wrappers alive on Windows even
 * after the requested timeout expires.
 */
function execFileQuiet(file: string, args: string[], timeoutMs = 800): string {
  try {
    const out = child_process.execFileSync(file, args, {
      timeout: timeoutMs,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    });
    return out.trim();
  } catch {
    return '';
  }
}

/**
 * Check whether a path exists (file, directory, or device node).
 * @internal
 */
function pathExists(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

/**
 * Glob a directory for entries matching a pattern (synchronously, no
 * dependencies). Returns matching full paths.
 *
 * @internal
 */
function globDir(dir: string, pattern: RegExp): string[] {
  try {
    if (!fs.existsSync(dir)) return [];
    const stat = fs.statSync(dir);
    if (!stat.isDirectory()) return [];
    const entries = fs.readdirSync(dir);
    return entries
      .filter((e) => pattern.test(e))
      .map((e) => path.join(dir, e));
  } catch {
    return [];
  }
}

/**
 * Probe for a TPM on Linux.
 *
 * Heuristics:
 *   - `/dev/tpm0` or `/dev/tpm1` or `/dev/tpmrm0` device nodes exist, OR
 *   - `/sys/class/tpm/tpm0/` directory exists, OR
 *   - `/sys/class/misc/tpm0/device/` exists (older kernels).
 *
 * @internal
 */
function probeLinuxTpm(): { present: boolean; details: string } {
  const devPaths = ['/dev/tpm0', '/dev/tpm1', '/dev/tpmrm0'];
  for (const p of devPaths) {
    if (pathExists(p)) {
      return { present: true, details: `found ${p}` };
    }
  }
  const sysPaths = ['/sys/class/tpm/tpm0', '/sys/class/misc/tpm0/device'];
  for (const p of sysPaths) {
    if (pathExists(p)) {
      return { present: true, details: `found ${p}` };
    }
  }
  // Try to read the TPM version from sysfs.
  const pcrPath = '/sys/class/tpm/tpm0/tpm_version_major';
  if (pathExists(pcrPath)) {
    try {
      const version = fs.readFileSync(pcrPath, 'utf8').trim();
      return { present: true, details: `TPM ${version} via ${pcrPath}` };
    } catch {
      // Fall through.
    }
  }
  return { present: false, details: 'no Linux TPM device node or sysfs entry found' };
}

/**
 * Probe for a TEE on Linux (Intel SGX, AMD SEV, ARM TrustZone).
 *
 * Heuristics:
 *   - Intel SGX: `/dev/sgx_enclave`, `/dev/sgx`, `/dev/isgx`
 *   - AMD SEV: `/sys/module/kvm_amd/parameters/sev_es` (or grep for `sev`)
 *   - ARM TrustZone: `/dev/tee0` or `/sys/class/tee/`
 *
 * @internal
 */
function probeLinuxTee(): { present: boolean; details: string } {
  const sgxPaths = ['/dev/sgx_enclave', '/dev/sgx', '/dev/isgx'];
  for (const p of sgxPaths) {
    if (pathExists(p)) {
      return { present: true, details: `found Intel SGX at ${p}` };
    }
  }
  const teePaths = ['/dev/tee0', '/dev/tee1', '/sys/class/tee'];
  for (const p of teePaths) {
    if (pathExists(p)) {
      return { present: true, details: `found TEE at ${p}` };
    }
  }
  // AMD SEV via kernel module parameters.
  const sevParam = '/sys/module/kvm_amd/parameters/sev_es';
  if (pathExists(sevParam)) {
    try {
      const val = fs.readFileSync(sevParam, 'utf8').trim();
      if (val === '1' || val === 'Y' || val === 'y') {
        return { present: true, details: `AMD SEV-ES enabled (${sevParam}=${val})` };
      }
    } catch {
      // Fall through.
    }
  }
  const cpuInfo = readLinuxCpuInfo();
  if (cpuInfo.includes('sgx') || cpuInfo.includes('sev')) {
    return { present: true, details: 'CPU advertises sgx/sev flag' };
  }
  return { present: false, details: 'no Linux TEE (SGX/SEV/TrustZone) found' };
}

/**
 * Read `/proc/cpuinfo` (Linux). Returns '' on any error.
 * @internal
 */
function readLinuxCpuInfo(): string {
  try {
    return fs.readFileSync('/proc/cpuinfo', 'utf8').toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Probe for a Secure Enclave on macOS.
 *
 * Heuristic: shell out to `ioreg` and look for the Apple Secure Enclave
 * Coprocessor. This works on Apple Silicon (M1+) and on Intel Macs with the
 * T2 chip.
 *
 * @internal
 */
function probeMacSecureEnclave(): { present: boolean; details: string } {
  // ioreg is the canonical way to enumerate IOService tree nodes.
  const out = execQuiet(
    'ioreg -l -w 0 | grep -i "AppleSecureEnclave\\|secure_enclave\\|SEP"',
    2000
  );
  if (out.length > 0) {
    return { present: true, details: 'Apple Secure Enclave detected via ioreg' };
  }
  // sysctl `machdep.cpu.brand_string` won't reveal SE; try pmset / system_profiler.
  const sp = execQuiet('system_profiler SPiBridgeDataType 2>/dev/null', 2000);
  if (sp.length > 0 && /T2|Apple Silicon/i.test(sp)) {
    return { present: true, details: 'Apple T2 / Apple Silicon bridge detected' };
  }
  return { present: false, details: 'no Apple Secure Enclave detected' };
}

/**
 * Probe for a TPM on Windows.
 *
 * Heuristic: query the TPM service registry key. The registry query is
 * bounded and avoids PowerShell/WMI subprocesses, which can outlive a
 * synchronous timeout on Windows.
 *
 * @internal
 */
function probeWindowsTpm(): { present: boolean; details: string } {
  // Try reg query for TPM 2.0 spec version.
  const regOut = execFileQuiet(
    'reg.exe',
    ['query', 'HKLM\\SYSTEM\\CurrentControlSet\\Services\\TPM\\WMI\\Admin', '/v', 'SpecVersion'],
    1000
  );
  if (regOut.length > 0 && /SpecVersion/i.test(regOut)) {
    return { present: true, details: `TPM detected via registry: ${regOut.split('\n')[0]}` };
  }
  return { present: false, details: 'no Windows TPM detected' };
}

/**
 * Probe for a TEE on Windows (VBS, Credential Guard, SGX).
 *
 * Uses registry-backed VBS and Credential Guard signals so probing remains
 * bounded and side-effect-free in environments without WMI availability.
 *
 * @internal
 */
function probeWindowsTee(): { present: boolean; details: string } {
  const vbsOut = execFileQuiet(
    'reg.exe',
    [
      'query',
      'HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard\\Scenarios\\HypervisorEnforcedCodeIntegrity',
      '/v',
      'Enabled',
    ],
    1000
  );
  if (/Enabled\s+REG_DWORD\s+0x1/i.test(vbsOut)) {
    return { present: true, details: 'Windows VBS detected via registry' };
  }

  const credentialGuardOut = execFileQuiet(
    'reg.exe',
    ['query', 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Lsa', '/v', 'LsaCfgFlags'],
    1000
  );
  if (/LsaCfgFlags\s+REG_DWORD\s+0x[1-3]/i.test(credentialGuardOut)) {
    return { present: true, details: 'Windows Credential Guard configured via registry' };
  }
  return { present: false, details: 'no Windows VBS / Device Guard detected' };
}

/**
 * Pluggable hardware validator. Probes the local host for the presence of
 * hardware attestation roots (TPM, Secure Enclave, TEE).
 *
 * All probes are wrapped in try/catch — `probe()` MUST NOT throw. If the
 * underlying probe throws unexpectedly, `probe()` returns a probe with
 * everything set to `false` and `details` describing the error.
 */
let cachedHardwareProbe: HardwareProbe | null = null;

export class HardwareValidator {
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
  probe(): HardwareProbe {
    if (cachedHardwareProbe) return { ...cachedHardwareProbe };

    try {
      const platform = process.platform;
      if (platform === 'linux') {
        const tpm = probeLinuxTpm();
        const tee = probeLinuxTee();
        cachedHardwareProbe = {
          tpm: tpm.present,
          secureEnclave: false, // Not applicable on Linux.
          tee: tee.present,
          details: `linux: ${tpm.details}; ${tee.details}`,
        };
        return { ...cachedHardwareProbe };
      }
      if (platform === 'darwin') {
        const se = probeMacSecureEnclave();
        cachedHardwareProbe = {
          tpm: false, // Not applicable on macOS (no TPM).
          secureEnclave: se.present,
          tee: se.present, // The Secure Enclave serves as the TEE on Apple platforms.
          details: `darwin: ${se.details}`,
        };
        return { ...cachedHardwareProbe };
      }
      if (platform === 'win32') {
        const tpm = probeWindowsTpm();
        const tee = probeWindowsTee();
        cachedHardwareProbe = {
          tpm: tpm.present,
          secureEnclave: false, // Not applicable on Windows.
          tee: tee.present,
          details: `win32: ${tpm.details}; ${tee.details}`,
        };
        return { ...cachedHardwareProbe };
      }
      cachedHardwareProbe = {
        tpm: false,
        secureEnclave: false,
        tee: false,
        details: `unsupported platform: ${platform}`,
      };
      return { ...cachedHardwareProbe };
    } catch (err) {
      // Defense-in-depth: probe() MUST NOT throw.
      cachedHardwareProbe = {
        tpm: false,
        secureEnclave: false,
        tee: false,
        details: `probe failed: ${(err as Error).message}`,
      };
      return { ...cachedHardwareProbe };
    }
  }

  /**
   * Convenience: probe and return `true` if ANY hardware attestation root
   * is present.
   */
  isAnyHardwarePresent(): boolean {
    const p = this.probe();
    return p.tpm || p.secureEnclave || p.tee;
  }
}

/**
 * Throw a {@link HardwareValidationError} if no hardware attestation root is
 * present. Convenience for callers that want fail-fast behavior.
 */
export function requireHardwareOrThrow(validator: HardwareValidator): HardwareProbe {
  const probe = validator.probe();
  if (!probe.tpm && !probe.secureEnclave && !probe.tee) {
    throw new HardwareValidationError(
      `no hardware attestation root present: ${probe.details}`
    );
  }
  return probe;
}

// Re-export globDir for tests.
export { globDir as _globDir };
