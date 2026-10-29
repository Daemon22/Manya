import {
  collectDeviceSignals,
  redactSignals,
  deriveDeviceId,
  stableStringify,
  newCorrelationId,
  DeviceFingerprint,
  REDACTED,
  FingerprintError,
  sha256,
} from '@manya-os/attest';

describe('fingerprint/collector', () => {
  it('collectDeviceSignals returns the required fields', () => {
    const s = collectDeviceSignals();
    expect(typeof s.cpus).toBe('number');
    expect(s.cpus).toBeGreaterThan(0);
    expect(typeof s.arch).toBe('string');
    expect(s.arch.length).toBeGreaterThan(0);
    expect(typeof s.platform).toBe('string');
    expect(typeof s.hostname).toBe('string');
    expect(Array.isArray(s.macs)).toBe(true);
    expect(typeof s.totalmem).toBe('number');
    expect(typeof s.nodeVersion).toBe('string');
    expect(s.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
    expect(typeof s.release).toBe('string');
  });

  it('collectDeviceSignals does NOT collect PII', () => {
    const s = collectDeviceSignals();
    const json = JSON.stringify(s);
    // No username / home dir / env fields.
    expect(json).not.toContain('username');
    expect(json).not.toContain('homedir');
    expect(json).not.toContain('env');
    expect(json).not.toContain('USER');
    expect(json).not.toContain('HOME');
  });

  it('macs are lowercased 12-char hex (no separators)', () => {
    const s = collectDeviceSignals();
    for (const mac of s.macs) {
      expect(mac).toMatch(/^[0-9a-f]{12}$/);
    }
  });

  it('collectDeviceSignals is stable across calls (within a session)', () => {
    const a = collectDeviceSignals();
    const b = collectDeviceSignals();
    // Most fields are stable; machineId may be present on both.
    expect(a.cpus).toBe(b.cpus);
    expect(a.arch).toBe(b.arch);
    expect(a.platform).toBe(b.platform);
    expect(a.hostname).toBe(b.hostname);
    expect(a.totalmem).toBe(b.totalmem);
    expect(a.nodeVersion).toBe(b.nodeVersion);
    expect(a.release).toBe(b.release);
    expect(a.macs).toEqual(b.macs);
    expect(a.machineId ?? null).toBe(b.machineId ?? null);
  });

  it('redactSignals replaces macs and machineId', () => {
    const s = collectDeviceSignals();
    const r = redactSignals(s);
    expect(r.cpus).toBe(s.cpus);
    expect(r.arch).toBe(s.arch);
    expect(r.platform).toBe(s.platform);
    expect(r.hostname).toBe(s.hostname);
    expect(r.totalmem).toBe(s.totalmem);
    expect(r.nodeVersion).toBe(s.nodeVersion);
    expect(r.release).toBe(s.release);
    // macs replaced with a count marker.
    expect(r.macs).toContain('redacted');
    expect(r.macs).not.toMatch(/^[0-9a-f]{12}$/);
    // machineId is either REDACTED or '' (never the actual value).
    if (s.machineId) {
      expect(r.machineId).toBe(REDACTED);
    } else {
      expect(r.machineId).toBe('');
    }
  });

  it('redactSignals never leaks the raw machineId', () => {
    const s = collectDeviceSignals();
    const r = redactSignals(s);
    if (s.machineId) {
      const json = JSON.stringify(r);
      expect(json).not.toContain(s.machineId);
    }
  });

  it('deriveDeviceId is 16 hex chars and stable', () => {
    const s = collectDeviceSignals();
    const id = deriveDeviceId(s);
    expect(id).toMatch(/^[0-9a-f]{16}$/);
    expect(deriveDeviceId(s)).toBe(id);
  });

  it('stableStringify sorts keys', () => {
    const a = stableStringify({ b: 1, a: 2, c: 3 });
    const b = stableStringify({ a: 2, c: 3, b: 1 });
    expect(a).toBe(b);
    expect(a.indexOf('"a"')).toBeLessThan(a.indexOf('"b"'));
    expect(a.indexOf('"b"')).toBeLessThan(a.indexOf('"c"'));
  });

  it('stableStringify handles nested objects and arrays', () => {
    const obj = { z: [3, 1, 2], a: { y: 1, x: 2 } };
    const s = stableStringify(obj);
    expect(JSON.parse(s)).toEqual(obj);
  });

  it('newCorrelationId returns a UUID v4', () => {
    const id = newCorrelationId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('fingerprint/fingerprint', () => {
  it('DeviceFingerprint.fromSignals returns a 64-char hex string', () => {
    const s = collectDeviceSignals();
    const fp = DeviceFingerprint.fromSignals(s);
    expect(fp.toString()).toMatch(/^[0-9a-f]{64}$/);
  });

  it('DeviceFingerprint is stable for the same signals', () => {
    const s = collectDeviceSignals();
    const a = DeviceFingerprint.fromSignals(s);
    const b = DeviceFingerprint.fromSignals(s);
    expect(a.toString()).toBe(b.toString());
  });

  it('DeviceFingerprint differs for different signals', () => {
    const s1 = collectDeviceSignals();
    const s2 = { ...s1, hostname: 'different-host' };
    const a = DeviceFingerprint.fromSignals(s1);
    const b = DeviceFingerprint.fromSignals(s2);
    expect(a.toString()).not.toBe(b.toString());
  });

  it('compare returns match=true drift=0 for identical fingerprints', () => {
    const s = collectDeviceSignals();
    const a = DeviceFingerprint.fromSignals(s);
    const b = DeviceFingerprint.fromSignals(s);
    const r = a.compare(b);
    expect(r.match).toBe(true);
    expect(r.drift).toBe(0);
  });

  it('compare returns match=false drift=1 for totally different fingerprints', () => {
    const s1 = collectDeviceSignals();
    const s2: typeof s1 = {
      ...s1,
      cpus: s1.cpus + 1,
      arch: 'changed-arch',
      platform: 'changed-platform',
      hostname: 'changed-host',
      macs: ['aabbccddeeff'],
      totalmem: s1.totalmem + 1,
      nodeVersion: 'v99.0.0',
      release: 'changed-release',
      machineId: 'changed-machine-id',
    };
    const a = DeviceFingerprint.fromSignals(s1);
    const b = DeviceFingerprint.fromSignals(s2);
    const r = a.compare(b);
    expect(r.match).toBe(false);
    expect(r.drift).toBe(1);
  });

  it('compare computes partial drift for partially-changed signals', () => {
    const s1 = collectDeviceSignals();
    // Change just one field (hostname).
    const s2 = { ...s1, hostname: 'changed-host' };
    const a = DeviceFingerprint.fromSignals(s1);
    const b = DeviceFingerprint.fromSignals(s2);
    const r = a.compare(b);
    expect(r.match).toBe(false);
    expect(r.drift).toBeGreaterThan(0);
    expect(r.drift).toBeLessThan(1);
  });

  it('fromString round-trips a hash', () => {
    const s = collectDeviceSignals();
    const fp = DeviceFingerprint.fromSignals(s);
    const fp2 = DeviceFingerprint.fromString(fp.toString());
    expect(fp2.toString()).toBe(fp.toString());
    expect(fp.equals(fp2)).toBe(true);
  });

  it('fromString rejects malformed input', () => {
    expect(() => DeviceFingerprint.fromString('not-a-hash')).toThrow(FingerprintError);
    expect(() => DeviceFingerprint.fromString('')).toThrow(FingerprintError);
    // Too short.
    expect(() => DeviceFingerprint.fromString('abc')).toThrow(FingerprintError);
  });

  it('fromString-loaded fingerprints compare all-or-nothing', () => {
    const s = collectDeviceSignals();
    const a = DeviceFingerprint.fromSignals(s);
    const b = DeviceFingerprint.fromString(a.toString());
    // Same hash → match, drift 0.
    expect(a.compare(b).match).toBe(true);
    expect(a.compare(b).drift).toBe(0);
    // Different hash → no match, drift 1 (no per-field data on b).
    const s2 = { ...s, hostname: 'different' };
    const c = DeviceFingerprint.fromSignals(s2);
    const cStr = DeviceFingerprint.fromString(c.toString());
    expect(a.compare(cStr).match).toBe(false);
    expect(a.compare(cStr).drift).toBe(1);
  });

  it('valueOf returns the hash', () => {
    const s = collectDeviceSignals();
    const fp = DeviceFingerprint.fromSignals(s);
    expect(fp.valueOf()).toBe(fp.toString());
  });

  it('equals returns boolean', () => {
    const s = collectDeviceSignals();
    const a = DeviceFingerprint.fromSignals(s);
    const b = DeviceFingerprint.fromSignals(s);
    const c = DeviceFingerprint.fromSignals({ ...s, hostname: 'x' });
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('hash is sha256 of stable canonical JSON (independent verification)', () => {
    const s = collectDeviceSignals();
    const fp = DeviceFingerprint.fromSignals(s);
    const expected = sha256(stableStringify(s)).toString('hex');
    expect(fp.toString()).toBe(expected);
  });
});
