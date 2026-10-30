import * as crypto from 'crypto';
import {
  AuthenticationWorkflow,
  createSoftwareWorkflow,
  buildPolicy,
  strictPolicy,
  defaultPolicy,
  validatePolicy,
  generateKeyPair,
  exportKeyPem,
  collectDeviceSignals,
  redactSignals,
  DeviceFingerprint,
  NonceStore,
  SessionManager,
  InMemorySessionStore,
  HardwareValidator,
  SoftwareAttestationProvider,
  TrustEvaluator,
  defaultTrustEvaluator,
  DEFAULT_FACTOR_WEIGHTS,
  generateChallenge,
  signChallenge,
  verifyResponse,
  isChallengeExpired,
  produceAttestation,
  verifyAttestation,
  serializeQuote,
  deserializeQuote,
  validateQuote,
  sha256,
  secureRandom,
  constantTimeEqual,
  ConsoleLogger,
  SilentLogger,
  scrubMetadata,
  AttestError,
  FingerprintError,
  ChallengeError,
  SessionError,
  HardwareValidationError,
  AttestationError,
  WorkflowError,
  TrustEvaluationError,
  NonceError,
  type AuthPolicy,
  type AuthenticationResult,
  type Challenge,
  type AttestationQuote,
  type Session,
} from '@manya-os/attest';

/**
 * End-to-end integration test exercising the full attestation lifecycle:
 *
 *   prover generates keys → collects fingerprint → verifier issues challenge →
 *   prover signs + produces attestation → verifier validates → session
 *   established → trust score computed → session verified → session revoked.
 *
 * Includes tampering tests (modified quote, expired nonce, wrong signature,
 * drifted fingerprint).
 */
describe('Integration: full attestation lifecycle', () => {
  it('walks the full happy-path lifecycle', async () => {
    // 1. Prover generates keys + collects fingerprint.
    const proverKp = generateKeyPair('ecdsa');
    const proverPubPem = exportKeyPem(proverKp.publicKey, 'public');
    const proverPrivPem = exportKeyPem(proverKp.privateKey, 'private');
    const signals = collectDeviceSignals();
    const fingerprint = DeviceFingerprint.fromSignals(signals);
    expect(fingerprint.toString()).toMatch(/^[0-9a-f]{64}$/);

    // 2. Verifier sets up the workflow.
    const verifier = new AuthenticationWorkflow({
      policy: buildPolicy({ minTrustScore: 0.5 }),
      logger: new SilentLogger(),
    });

    // 3. Verifier issues a challenge.
    const challenge = verifier.verifierIssueChallenge();
    expect(challenge.nonce).toBeDefined();
    expect(challenge.challenge).toBeDefined();

    // 4. Prover responds.
    const { response, quote } = await verifier.proverRespond(challenge, {
      privateKey: proverPrivPem,
      deviceFingerprint: fingerprint.toString(),
      measurements: { version: '1', agent: 'azura' },
    });
    expect(response.signature).toMatch(/^[0-9a-f]+$/);
    expect(quote.signature).toMatch(/^[0-9a-f]+$/);
    expect(quote.deviceFingerprint).toBe(fingerprint.toString());

    // 5. Verifier validates + establishes session.
    const result: AuthenticationResult = await verifier.verifierVerify({
      publicKey: proverPubPem,
      challenge,
      response,
      quote,
      expectedFingerprint: fingerprint.toString(),
      identity: 'did:key:zprover-integration',
      priorInteractions: 0,
    });
    expect(result.success).toBe(true);
    expect(result.session).toBeDefined();
    const session: Session = result.session!;
    expect(session.fingerprint).toBe(fingerprint.toString());
    expect(session.identity).toBe('did:key:zprover-integration');
    expect(session.trustScore).toBeGreaterThan(0);
    expect(session.trustScore).toBeLessThanOrEqual(1);
    expect(session.token).toMatch(/^[0-9a-f]{64}$/);

    // 6. Session verifies.
    const verified = await verifier.verifySession(session.token);
    expect(verified).not.toBeNull();
    expect(verified!.sessionId).toBe(session.sessionId);

    // 7. Session can be refreshed.
    const refreshed = await verifier.refreshSession(session.token);
    expect(refreshed.token).not.toBe(session.token);
    expect(await verifier.verifySession(refreshed.token)).not.toBeNull();
    expect(await verifier.verifySession(session.token)).toBeNull();

    // 8. Refreshed session can be revoked.
    expect(await verifier.revokeSession(refreshed.token)).toBe(true);
    expect(await verifier.verifySession(refreshed.token)).toBeNull();
  });

  it('rejects a tampered attestation quote (modified measurements)', async () => {
    const wf = new AuthenticationWorkflow();
    const kp = generateKeyPair('ecdsa');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const fp = DeviceFingerprint.fromSignals(collectDeviceSignals());

    const challenge = wf.verifierIssueChallenge();
    const { response, quote } = await wf.proverRespond(challenge, {
      privateKey: kp.privateKey,
      deviceFingerprint: fp.toString(),
    });

    // Tamper: add a new measurement field. This invalidates the signature.
    const tampered: AttestationQuote = {
      ...quote,
      measurements: { ...quote.measurements, tampered: 'yes' },
    };
    const r = await wf.verifierVerify({
      publicKey: pubPem,
      challenge,
      response,
      quote: tampered,
      expectedFingerprint: fp.toString(),
      identity: 'did:key:z',
    });
    expect(r.success).toBe(false);
    expect(r.reason).toContain('attestation');
  });

  it('rejects a tampered attestation quote (modified fingerprint)', async () => {
    const wf = new AuthenticationWorkflow();
    const kp = generateKeyPair('ecdsa');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const fp = DeviceFingerprint.fromSignals(collectDeviceSignals());

    const challenge = wf.verifierIssueChallenge();
    const { response, quote } = await wf.proverRespond(challenge, {
      privateKey: kp.privateKey,
      deviceFingerprint: fp.toString(),
    });

    // Tamper: change the deviceFingerprint. This invalidates the signature.
    const tampered: AttestationQuote = {
      ...quote,
      deviceFingerprint: '0'.repeat(64),
    };
    const r = await wf.verifierVerify({
      publicKey: pubPem,
      challenge,
      response,
      quote: tampered,
      expectedFingerprint: fp.toString(),
      identity: 'did:key:z',
    });
    expect(r.success).toBe(false);
  });

  it('rejects a replayed nonce (single-use enforcement)', async () => {
    const wf = new AuthenticationWorkflow();
    const kp = generateKeyPair('ecdsa');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const fp = DeviceFingerprint.fromSignals(collectDeviceSignals());

    const challenge = wf.verifierIssueChallenge();
    const { response, quote } = await wf.proverRespond(challenge, {
      privateKey: kp.privateKey,
      deviceFingerprint: fp.toString(),
    });

    // First verification consumes the nonce and succeeds.
    const r1 = await wf.verifierVerify({
      publicKey: pubPem,
      challenge,
      response,
      quote,
      expectedFingerprint: fp.toString(),
      identity: 'did:key:z1',
    });
    expect(r1.success).toBe(true);

    // Replay: same nonce. Must fail.
    const r2 = await wf.verifierVerify({
      publicKey: pubPem,
      challenge,
      response,
      quote,
      expectedFingerprint: fp.toString(),
      identity: 'did:key:z2',
    });
    expect(r2.success).toBe(false);
    expect(r2.reason).toContain('nonce');
  });

  it('rejects a wrong signature (mismatched key)', async () => {
    const wf = new AuthenticationWorkflow();
    const proverKp = generateKeyPair('ecdsa');
    const attackerKp = generateKeyPair('ecdsa'); // different key
    const attackerPubPem = exportKeyPem(attackerKp.publicKey, 'public');
    const fp = DeviceFingerprint.fromSignals(collectDeviceSignals());

    const challenge = wf.verifierIssueChallenge();
    // Prover responds with their own key.
    const { response, quote } = await wf.proverRespond(challenge, {
      privateKey: proverKp.privateKey,
      deviceFingerprint: fp.toString(),
    });

    // Verifier tries to verify with the attacker's public key.
    const r = await wf.verifierVerify({
      publicKey: attackerPubPem,
      challenge,
      response,
      quote,
      expectedFingerprint: fp.toString(),
      identity: 'did:key:z',
    });
    expect(r.success).toBe(false);
  });

  it('rejects a drifted fingerprint (verifier expects different fp)', async () => {
    const wf = new AuthenticationWorkflow();
    const kp = generateKeyPair('ecdsa');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const fp = DeviceFingerprint.fromSignals(collectDeviceSignals());
    const drifted = 'f'.repeat(64);

    const challenge = wf.verifierIssueChallenge();
    const { response, quote } = await wf.proverRespond(challenge, {
      privateKey: kp.privateKey,
      deviceFingerprint: fp.toString(),
    });

    // Verifier expects a different fingerprint.
    const r = await wf.verifierVerify({
      publicKey: pubPem,
      challenge,
      response,
      quote,
      expectedFingerprint: drifted,
      identity: 'did:key:z',
    });
    expect(r.success).toBe(false);
    expect(r.reason).toContain('attestation');
  });

  it('rejects an expired challenge (TTL exceeded)', async () => {
    const wf = new AuthenticationWorkflow();
    const kp = generateKeyPair('ecdsa');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const fp = DeviceFingerprint.fromSignals(collectDeviceSignals());

    // Issue a challenge with a very short TTL.
    const challenge = wf.verifierIssueChallenge(50);
    // Wait for it to expire.
    await new Promise((r) => setTimeout(r, 80));

    const { response, quote } = await wf.proverRespond(challenge, {
      privateKey: kp.privateKey,
      deviceFingerprint: fp.toString(),
    });

    // The nonce should also have expired.
    const r = await wf.verifierVerify({
      publicKey: pubPem,
      challenge,
      response,
      quote,
      expectedFingerprint: fp.toString(),
      identity: 'did:key:z',
    });
    expect(r.success).toBe(false);
  }, 15_000);

  it('uses a custom SessionStore (e.g. for distributed deployments)', async () => {
    // A trivial wrapper around InMemorySessionStore that adds a prefix.
    // This demonstrates the pluggability of the SessionStore interface.
    const inner = new InMemorySessionStore();
    const wf = new AuthenticationWorkflow({
      sessionManager: new SessionManager({
        async get(token: string) {
          return inner.get('p:' + token);
        },
        async put(record) {
          return inner.put({ ...record, token: 'p:' + record.token });
        },
        async delete(token: string) {
          return inner.delete('p:' + token);
        },
        async list() {
          const all = await inner.list();
          return all.map((r) => ({ ...r, token: r.token.slice(2) }));
        },
      } as never),
    });

    const kp = generateKeyPair('ecdsa');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const fp = DeviceFingerprint.fromSignals(collectDeviceSignals());

    const challenge = wf.verifierIssueChallenge();
    const { response, quote } = await wf.proverRespond(challenge, {
      privateKey: kp.privateKey,
      deviceFingerprint: fp.toString(),
    });
    const result = await wf.verifierVerify({
      publicKey: pubPem,
      challenge,
      response,
      quote,
      expectedFingerprint: fp.toString(),
      identity: 'did:key:z',
    });
    expect(result.success).toBe(true);
    expect(await wf.verifySession(result.session!.token)).not.toBeNull();
  });

  it('scrubs secrets from logged metadata', () => {
    const origWrite = process.stdout.write.bind(process.stdout);
    const lines: string[] = [];
    process.stdout.write = ((chunk: unknown) => {
      lines.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      const logger = new ConsoleLogger('debug');
      logger.info('attest-event', {
        token: 'tok-xyz',
        nonce: 'n-123',
        signature: 'sig-abc',
        macs: ['aabbccddeeff'],
        machineId: 'machine-id-value',
        safe: 'visible',
      });
    } finally {
      process.stdout.write = origWrite;
    }
    const joined = lines.join('\n');
    expect(joined).toContain('"token":"[redacted]"');
    expect(joined).toContain('"nonce":"[redacted]"');
    expect(joined).toContain('"signature":"[redacted]"');
    expect(joined).toContain('"macs":"[redacted]"');
    expect(joined).toContain('"machineId":"[redacted]"');
    expect(joined).toContain('"safe":"visible"');
    expect(joined).not.toContain('tok-xyz');
    expect(joined).not.toContain('n-123');
    expect(joined).not.toContain('sig-abc');
    expect(joined).not.toContain('aabbccddeeff');
    expect(joined).not.toContain('machine-id-value');
  });

  it('scrubMetadata works standalone', () => {
    const out = scrubMetadata({
      token: 't',
      nested: { signature: 's', ok: 1 },
      array: [{ nonce: 'n' }, { ok: 2 }],
    }) as Record<string, unknown>;
    expect(out.token).toBe('[redacted]');
    const nested = out.nested as Record<string, unknown>;
    expect(nested.signature).toBe('[redacted]');
    expect(nested.ok).toBe(1);
    const arr = out.array as unknown[];
    expect((arr[0] as Record<string, unknown>).nonce).toBe('[redacted]');
    expect((arr[1] as Record<string, unknown>).ok).toBe(2);
  });

  it('redactSignals never leaks machineId', () => {
    const s = collectDeviceSignals();
    const r = redactSignals(s);
    if (s.machineId) {
      const json = JSON.stringify(r);
      expect(json).not.toContain(s.machineId);
    }
  });

  it('all error classes are throwable and carry a stable code', () => {
    const expectCode = (err: AttestError, code: string) => {
      expect(err).toBeInstanceOf(AttestError);
      expect(err.code).toBe(code);
    };
    expectCode(new FingerprintError('x'), 'FINGERPRINT_ERROR');
    expectCode(new ChallengeError('x'), 'CHALLENGE_ERROR');
    expectCode(new SessionError('x'), 'SESSION_ERROR');
    expectCode(new HardwareValidationError('x'), 'HARDWARE_VALIDATION_ERROR');
    expectCode(new AttestationError('x'), 'ATTESTATION_ERROR');
    expectCode(new WorkflowError('x'), 'WORKFLOW_ERROR');
    expectCode(new TrustEvaluationError('x'), 'TRUST_EVALUATION_ERROR');
    expectCode(new NonceError('x'), 'NONCE_ERROR');
  });

  it('chains cause on errors', () => {
    const inner = new Error('inner');
    const e = new AttestationError('outer', inner);
    expect(e.cause).toBe(inner);
    expect(e.message).toBe('outer');
  });

  it('trust evaluator default factors sum to 1.0', () => {
    const w = defaultTrustEvaluator.getWeights();
    const sum =
      w.fingerprintStability + w.hardware + w.attestation + w.sessionAge + w.priorInteractions;
    expect(sum).toBeCloseTo(1.0, 9);
  });

  it('TrustEvaluator with custom weights works', () => {
    const e = new TrustEvaluator({
      fingerprintStability: 0,
      hardware: 0,
      attestation: 1,
      sessionAge: 0,
      priorInteractions: 0,
    });
    const s = e.evaluate({
      fingerprintDrift: 1,
      hardwarePresent: false,
      attestationValid: true,
      sessionAgeMs: 0,
      priorInteractions: 0,
    });
    expect(s.score).toBeCloseTo(1.0, 6);
  });

  it('full workflow also works with RSA-PSS keys', async () => {
    const wf = new AuthenticationWorkflow();
    const kp = generateKeyPair('rsa', { rsaModulusBits: 2048 });
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const fp = DeviceFingerprint.fromSignals(collectDeviceSignals());

    const challenge = wf.verifierIssueChallenge();
    const { response, quote } = await wf.proverRespond(challenge, {
      privateKey: kp.privateKey,
      deviceFingerprint: fp.toString(),
    });
    expect(response.algorithm).toBe('rsa-pss');
    expect(quote.algorithm).toBe('rsa-pss');

    const r = await wf.verifierVerify({
      publicKey: pubPem,
      challenge,
      response,
      quote,
      expectedFingerprint: fp.toString(),
      identity: 'did:key:zrsa',
    });
    expect(r.success).toBe(true);
  });

  it('createSoftwareWorkflow works end-to-end', async () => {
    const { workflow, provider } = createSoftwareWorkflow();
    const kp = generateKeyPair('ecdsa');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const fp = DeviceFingerprint.fromSignals(collectDeviceSignals());

    const challenge = workflow.verifierIssueChallenge();
    const { response, quote } = await workflow.proverRespond(challenge, {
      privateKey: kp.privateKey,
      deviceFingerprint: fp.toString(),
      hardwareProvider: provider,
    });

    const r = await workflow.verifierVerify({
      publicKey: pubPem,
      challenge,
      response,
      quote,
      expectedFingerprint: fp.toString(),
      identity: 'did:key:zsw',
    });
    expect(r.success).toBe(true);
  });

  it('serializeQuote + deserializeQuote round-trip is stable', async () => {
    const kp = generateKeyPair('ecdsa');
    const fp = DeviceFingerprint.fromSignals(collectDeviceSignals());
    const quote = produceAttestation(kp.privateKey, fp.toString(), { m: '1' }, 'n');
    const buf = serializeQuote(quote);
    const back = deserializeQuote(buf);
    expect(back).toEqual(quote);
    // Re-serialize is byte-identical.
    expect(serializeQuote(back).equals(buf)).toBe(true);
  });

  it('manual challenge-response flow (without workflow) also works', () => {
    // Demonstrates the low-level primitives composing correctly.
    const kp = generateKeyPair('ecdsa');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const challenge = generateChallenge();
    const response = signChallenge(kp.privateKey, challenge);
    expect(verifyResponse(pubPem, challenge, response, challenge.nonce)).toBe(true);
    expect(isChallengeExpired(challenge)).toBe(false);
    // Wrong nonce rejected.
    expect(verifyResponse(pubPem, challenge, response, 'wrong')).toBe(false);
  });

  it('manual attestation flow (without workflow) also works', () => {
    const kp = generateKeyPair('ecdsa');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const fp = DeviceFingerprint.fromSignals(collectDeviceSignals());
    const quote = produceAttestation(kp.privateKey, fp.toString(), { m: '1' }, 'nonce-x');
    expect(verifyAttestation(pubPem, quote, 'nonce-x', { expectedFingerprint: fp.toString() })).toBe(true);
    expect(verifyAttestation(pubPem, quote, 'wrong', { expectedFingerprint: fp.toString() })).toBe(false);
  });

  it('nonce store prevents replay in a manual flow', () => {
    const store = new NonceStore();
    const n = store.issue();
    expect(store.consume(n)).toBe(true);
    expect(store.consume(n)).toBe(false); // replay rejected
  });

  it('DeviceFingerprint drift is reflected in trust evaluation', () => {
    const s1 = collectDeviceSignals();
    const s2 = { ...s1, hostname: 'changed-host' };
    const fp1 = DeviceFingerprint.fromSignals(s1);
    const fp2 = DeviceFingerprint.fromSignals(s2);
    const cmp = fp1.compare(fp2);
    expect(cmp.match).toBe(false);
    expect(cmp.drift).toBeGreaterThan(0);
    expect(cmp.drift).toBeLessThan(1);
    // Trust evaluator penalizes drift.
    const goodTrust = defaultTrustEvaluator.evaluate({
      fingerprintDrift: 0,
      hardwarePresent: true,
      attestationValid: true,
      sessionAgeMs: 0,
      priorInteractions: 10,
    });
    const driftedTrust = defaultTrustEvaluator.evaluate({
      fingerprintDrift: cmp.drift,
      hardwarePresent: true,
      attestationValid: true,
      sessionAgeMs: 0,
      priorInteractions: 10,
    });
    expect(driftedTrust.score).toBeLessThan(goodTrust.score);
  });

  it('validateQuote throws on invalid version', () => {
    const bad = {
      version: 99,
      deviceFingerprint: 'fp',
      measurements: {},
      timestamp: new Date().toISOString(),
      nonce: 'n',
      signature: 'sig',
      algorithm: 'ecdsa-p256' as const,
    };
    expect(() => validateQuote(bad)).toThrow(AttestationError);
  });

  it('policy presets and buildPolicy interplay', () => {
    const def = defaultPolicy();
    const strict = strictPolicy();
    expect(strict.minTrustScore).toBeGreaterThan(def.minTrustScore);
    expect(strict.sessionTtlMs).toBeLessThan(def.sessionTtlMs);
    expect(buildPolicy({ minTrustScore: 0.6 }).minTrustScore).toBe(0.6);
  });

  it('HardwareValidator never throws (smoke)', () => {
    const v = new HardwareValidator();
    for (let i = 0; i < 10; i++) {
      expect(() => v.probe()).not.toThrow();
    }
  });

  it('constantTimeEqual works on random buffers', () => {
    const a = secureRandom(32);
    const b = Buffer.from(a);
    expect(constantTimeEqual(a, b)).toBe(true);
    b[0] = (b[0]! + 1) & 0xff;
    expect(constantTimeEqual(a, b)).toBe(false);
  });

  it('sha256 of canonical JSON is deterministic', () => {
    const a = sha256(JSON.stringify({ a: 1, b: 2 }));
    const b = sha256(JSON.stringify({ a: 1, b: 2 }));
    expect(a.equals(b)).toBe(true);
  });

  it('defaultPolicy and strictPolicy both pass validatePolicy', () => {
    expect(() => validatePolicy(defaultPolicy())).not.toThrow();
    expect(() => validatePolicy(strictPolicy())).not.toThrow();
  });

  it('integration with crypto.randomBytes does not interfere', () => {
    // Smoke: ensure the package's secureRandom is consistent with Node's.
    const a = secureRandom(16);
    const b = crypto.randomBytes(16);
    expect(a.length).toBe(16);
    expect(b.length).toBe(16);
  });

  it('a session established with high trust can be re-evaluated', async () => {
    const wf = new AuthenticationWorkflow();
    const kp = generateKeyPair('ecdsa');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const fp = DeviceFingerprint.fromSignals(collectDeviceSignals());

    const challenge = wf.verifierIssueChallenge();
    const { response, quote } = await wf.proverRespond(challenge, {
      privateKey: kp.privateKey,
      deviceFingerprint: fp.toString(),
    });
    const result = await wf.verifierVerify({
      publicKey: pubPem,
      challenge,
      response,
      quote,
      expectedFingerprint: fp.toString(),
      identity: 'did:key:z',
      priorInteractions: 50, // lots of prior interactions
    });
    expect(result.success).toBe(true);
    expect(result.trust.score).toBeGreaterThanOrEqual(0.5);
  });

  it('SilentLogger never throws', () => {
    const l = new SilentLogger();
    expect(() => l.debug('x', { token: 't' })).not.toThrow();
    expect(() => l.info('x', { nonce: 'n' })).not.toThrow();
    expect(() => l.warn('x', { signature: 's' })).not.toThrow();
    expect(() => l.error('x', { machineId: 'm' })).not.toThrow();
  });
});
