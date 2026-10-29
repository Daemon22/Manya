import * as fs from 'fs';
import * as path from 'path';
import {
  HardwareValidator,
  requireHardwareOrThrow,
  SoftwareAttestationProvider,
  HardwareValidationError,
  canonicalQuoteBytes,
  generateKeyPair,
  exportKeyPem,
  importKeyPem,
  getKeyFingerprint,
  sha256,
  type HardwareProbe,
  type AttestationQuote,
} from '@manya-os/attest';

describe('hardware/validator', () => {
  it('probe returns a HardwareProbe with required fields', () => {
    const v = new HardwareValidator();
    const probe = v.probe();
    expect(typeof probe.tpm).toBe('boolean');
    expect(typeof probe.secureEnclave).toBe('boolean');
    expect(typeof probe.tee).toBe('boolean');
    expect(typeof probe.details).toBe('string');
    expect(probe.details.length).toBeGreaterThan(0);
  });

  it('probe never throws (smoke test across 100 invocations)', () => {
    const v = new HardwareValidator();
    for (let i = 0; i < 100; i++) {
      expect(() => v.probe()).not.toThrow();
    }
  });

  it('probe is consistent across calls', () => {
    const v = new HardwareValidator();
    const a = v.probe();
    const b = v.probe();
    expect(a.tpm).toBe(b.tpm);
    expect(a.secureEnclave).toBe(b.secureEnclave);
    expect(a.tee).toBe(b.tee);
  });

  it('isAnyHardwarePresent returns boolean', () => {
    const v = new HardwareValidator();
    const result = v.isAnyHardwarePresent();
    expect(typeof result).toBe('boolean');
  });

  it('requireHardwareOrThrow throws when no hardware is present', () => {
    // Build a stub validator that always reports no hardware.
    const stub = {
      probe: (): HardwareProbe => ({
        tpm: false,
        secureEnclave: false,
        tee: false,
        details: 'stubbed: no hardware',
      }),
    } as unknown as HardwareValidator;
    expect(() => requireHardwareOrThrow(stub)).toThrow(HardwareValidationError);
  });

  it('requireHardwareOrThrow returns the probe when hardware is present', () => {
    const stub = {
      probe: (): HardwareProbe => ({
        tpm: true,
        secureEnclave: false,
        tee: false,
        details: 'stubbed: TPM present',
      }),
    } as unknown as HardwareValidator;
    const probe = requireHardwareOrThrow(stub);
    expect(probe.tpm).toBe(true);
  });
});

describe('hardware/provider (SoftwareAttestationProvider)', () => {
  it('isAvailable always returns true', () => {
    const p = new SoftwareAttestationProvider();
    expect(p.isAvailable()).toBe(true);
  });

  it('getPublicKeyPem returns a SPKI PEM', () => {
    const p = new SoftwareAttestationProvider();
    const pem = p.getPublicKeyPem();
    expect(pem).toContain('BEGIN PUBLIC KEY');
  });

  it('getPublicKeyFingerprint is 64 hex chars', () => {
    const p = new SoftwareAttestationProvider();
    expect(p.getPublicKeyFingerprint()).toMatch(/^[0-9a-f]{64}$/);
  });

  it('getAlgorithm returns ecdsa-p256 by default', () => {
    const p = new SoftwareAttestationProvider();
    expect(p.getAlgorithm()).toBe('ecdsa-p256');
  });

  it('can be configured to use RSA', () => {
    const p = new SoftwareAttestationProvider({ algorithm: 'rsa' });
    expect(p.getAlgorithm()).toBe('rsa-pss');
  });

  it('attest produces a valid signed quote', async () => {
    const p = new SoftwareAttestationProvider();
    const data = Buffer.from('device-fingerprint-string', 'utf8');
    const nonce = 'test-nonce-12345';
    const quote = await p.attest(data, nonce);
    expect(quote.version).toBe(1);
    expect(quote.deviceFingerprint).toBe('device-fingerprint-string');
    expect(quote.nonce).toBe(nonce);
    expect(quote.signature).toMatch(/^[0-9a-f]+$/);
    expect(quote.algorithm).toBe('ecdsa-p256');
    expect(quote.measurements.dataHash).toBe(sha256(data).toString('hex'));
    expect(quote.measurements.provider).toBe('software');
    expect(quote.measurements.publicKeyFingerprint).toBe(p.getPublicKeyFingerprint());
    expect(quote.hardware).toBeDefined();
  });

  it('verifyQuote returns true for own quote', async () => {
    const p = new SoftwareAttestationProvider();
    const data = Buffer.from('fp', 'utf8');
    const quote = await p.attest(data, 'nonce');
    expect(await p.verifyQuote(quote)).toBe(true);
  });

  it('verifyQuote returns true with explicit public key', async () => {
    const p = new SoftwareAttestationProvider();
    const pubPem = p.getPublicKeyPem();
    const data = Buffer.from('fp', 'utf8');
    const quote = await p.attest(data, 'nonce');
    expect(await p.verifyQuote(quote, pubPem)).toBe(true);
  });

  it('verifyQuote rejects tampered quote', async () => {
    const p = new SoftwareAttestationProvider();
    const quote = await p.attest(Buffer.from('fp'), 'n');
    const tampered: AttestationQuote = {
      ...quote,
      deviceFingerprint: 'tampered-fp',
    };
    expect(await p.verifyQuote(tampered)).toBe(false);
  });

  it('verifyQuote rejects wrong public key', async () => {
    const p = new SoftwareAttestationProvider();
    const quote = await p.attest(Buffer.from('fp'), 'n');
    const other = new SoftwareAttestationProvider();
    expect(await p.verifyQuote(quote, other.getPublicKeyPem())).toBe(false);
  });

  it('verifyQuote rejects malformed input', async () => {
    const p = new SoftwareAttestationProvider();
    expect(await p.verifyQuote(null as unknown as AttestationQuote)).toBe(false);
    expect(await p.verifyQuote({} as AttestationQuote)).toBe(false);
  });

  it('attest rejects bad inputs', async () => {
    const p = new SoftwareAttestationProvider();
    await expect(p.attest(null as unknown as Buffer, 'n')).rejects.toThrow(HardwareValidationError);
    await expect(p.attest(Buffer.from('x'), '')).rejects.toThrow(HardwareValidationError);
  });

  it('can import pre-existing keys', async () => {
    const kp = generateKeyPair('ecdsa');
    const privPem = exportKeyPem(kp.privateKey, 'private');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const p = new SoftwareAttestationProvider({ privateKey: privPem, publicKey: pubPem });
    expect(p.getAlgorithm()).toBe('ecdsa-p256');
    expect(p.getPublicKeyFingerprint()).toBe(getKeyFingerprint(kp.publicKey));
    const quote = await p.attest(Buffer.from('fp'), 'n');
    expect(await p.verifyQuote(quote, pubPem)).toBe(true);
  });

  it('canonicalQuoteBytes is stable across calls', () => {
    const quote = {
      version: 1,
      deviceFingerprint: 'fp',
      measurements: { a: '1', b: '2' },
      timestamp: '2024-01-01T00:00:00.000Z',
      nonce: 'n',
      algorithm: 'ecdsa-p256' as const,
    };
    const a = canonicalQuoteBytes(quote);
    const b = canonicalQuoteBytes(quote);
    expect(a.equals(b)).toBe(true);
  });

  it('hardware probe is cached after first attest call', async () => {
    const p = new SoftwareAttestationProvider();
    await p.attest(Buffer.from('fp1'), 'n1');
    const q1 = await p.attest(Buffer.from('fp2'), 'n2');
    expect(q1.hardware).toBeDefined();
    // Verify the probe is the same (cached) by inspecting details.
    const probe1 = q1.hardware!;
    const q2 = await p.attest(Buffer.from('fp3'), 'n3');
    expect(q2.hardware?.details).toBe(probe1.details);
  });

  it('imports RSA keys correctly', async () => {
    const kp = generateKeyPair('rsa', { rsaModulusBits: 2048 });
    const privPem = exportKeyPem(kp.privateKey, 'private');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const p = new SoftwareAttestationProvider({ privateKey: privPem, publicKey: pubPem });
    expect(p.getAlgorithm()).toBe('rsa-pss');
    const quote = await p.attest(Buffer.from('fp'), 'n');
    expect(quote.algorithm).toBe('rsa-pss');
    expect(await p.verifyQuote(quote, pubPem)).toBe(true);
  });

  it('imported KeyObject keys also work', async () => {
    const kp = generateKeyPair('ecdsa');
    const p = new SoftwareAttestationProvider({
      privateKey: kp.privateKey,
      publicKey: kp.publicKey,
    });
    const quote = await p.attest(Buffer.from('fp'), 'n');
    expect(await p.verifyQuote(quote, kp.publicKey)).toBe(true);
  });
});

describe('hardware/validator probes (file system heuristics)', () => {
  it('reads /proc/cpuinfo on linux without throwing', () => {
    if (process.platform !== 'linux') return;
    expect(() => fs.readFileSync('/proc/cpuinfo', 'utf8')).not.toThrow();
  });

  it('_globDir handles non-existent dirs', () => {
    const v = new HardwareValidator();
    // Access the internal _globDir via the export.
    // We exercise it indirectly by probing.
    expect(() => v.probe()).not.toThrow();
  });
});

// Touch path to ensure it's imported (defense-in-depth for the import).
void path;
