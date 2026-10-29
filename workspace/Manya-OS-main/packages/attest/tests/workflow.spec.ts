import {
  AuthenticationWorkflow,
  createSoftwareWorkflow,
  defaultPolicy,
  strictPolicy,
  buildPolicy,
  validatePolicy,
  DEFAULT_POLICY_SESSION_TTL_MS,
  DEFAULT_POLICY_ATTESTATION_FRESHNESS_MS,
  generateKeyPair,
  exportKeyPem,
  collectDeviceSignals,
  DeviceFingerprint,
  NonceStore,
  SessionManager,
  HardwareValidator,
  SoftwareAttestationProvider,
  WorkflowError,
  type AuthPolicy,
  type AuthenticationResult,
} from '@manya-os/attest';

describe('workflow/policies', () => {
  it('defaultPolicy returns sensible defaults', () => {
    const p = defaultPolicy();
    expect(p.requireHardwareAttestation).toBe(false);
    expect(p.minTrustScore).toBe(0.5);
    expect(p.sessionTtlMs).toBe(DEFAULT_POLICY_SESSION_TTL_MS);
    expect(p.allowedFingerprintDrift).toBe(0.2);
    expect(p.attestationFreshnessMs).toBe(DEFAULT_POLICY_ATTESTATION_FRESHNESS_MS);
  });

  it('strictPolicy returns high-assurance settings', () => {
    const p = strictPolicy();
    expect(p.requireHardwareAttestation).toBe(true);
    expect(p.minTrustScore).toBe(0.8);
    expect(p.sessionTtlMs).toBe(15 * 60 * 1000);
    expect(p.allowedFingerprintDrift).toBe(0.0);
    expect(p.attestationFreshnessMs).toBe(60 * 1000);
  });

  it('validatePolicy accepts good policies', () => {
    expect(() => validatePolicy(defaultPolicy())).not.toThrow();
    expect(() => validatePolicy(strictPolicy())).not.toThrow();
  });

  it('validatePolicy rejects bad policies', () => {
    expect(() => validatePolicy(null as unknown as AuthPolicy)).toThrow(WorkflowError);
    expect(() => validatePolicy({ ...defaultPolicy(), requireHardwareAttestation: 'true' as unknown as boolean })).toThrow(WorkflowError);
    expect(() => validatePolicy({ ...defaultPolicy(), minTrustScore: 1.5 })).toThrow(WorkflowError);
    expect(() => validatePolicy({ ...defaultPolicy(), minTrustScore: -0.1 })).toThrow(WorkflowError);
    expect(() => validatePolicy({ ...defaultPolicy(), sessionTtlMs: 0 })).toThrow(WorkflowError);
    expect(() => validatePolicy({ ...defaultPolicy(), allowedFingerprintDrift: 1.5 })).toThrow(WorkflowError);
    expect(() => validatePolicy({ ...defaultPolicy(), attestationFreshnessMs: 0 })).toThrow(WorkflowError);
  });

  it('buildPolicy merges overrides over defaults', () => {
    const p = buildPolicy({ minTrustScore: 0.9 });
    expect(p.minTrustScore).toBe(0.9);
    expect(p.requireHardwareAttestation).toBe(false); // from default
    expect(() => validatePolicy(p)).not.toThrow();
  });

  it('buildPolicy validates the merged result', () => {
    expect(() => buildPolicy({ minTrustScore: 1.5 })).toThrow(WorkflowError);
  });
});

describe('workflow/authenticator (happy path)', () => {
  it('runs a full challenge-response + attestation + session flow', async () => {
    // Prover generates keys + collects fingerprint.
    const proverKp = generateKeyPair('ecdsa');
    const proverPubPem = exportKeyPem(proverKp.publicKey, 'public');
    const signals = collectDeviceSignals();
    const fp = DeviceFingerprint.fromSignals(signals);

    // Verifier sets up the workflow.
    const wf = new AuthenticationWorkflow();

    // 1. Verifier issues a challenge.
    const challenge = wf.verifierIssueChallenge();
    expect(challenge.nonce).toBeDefined();
    expect(challenge.challenge).toBeDefined();

    // 2. Prover responds with signed challenge + attestation quote.
    const { response, quote } = await wf.proverRespond(challenge, {
      privateKey: proverKp.privateKey,
      deviceFingerprint: fp.toString(),
      measurements: { v: '1' },
    });

    // 3. Verifier validates response + quote + fingerprint match.
    const result = await wf.verifierVerify({
      publicKey: proverPubPem,
      challenge,
      response,
      quote,
      expectedFingerprint: fp.toString(),
      identity: 'did:key:zprover1',
    });

    expect(result.success).toBe(true);
    expect(result.session).toBeDefined();
    expect(result.session!.fingerprint).toBe(fp.toString());
    expect(result.session!.identity).toBe('did:key:zprover1');
    expect(result.session!.trustScore).toBeGreaterThan(0);
    expect(result.trust.decision).toBe('trust');

    // 4. The session token verifies.
    const verified = await wf.verifySession(result.session!.token);
    expect(verified).not.toBeNull();
    expect(verified!.sessionId).toBe(result.session!.sessionId);

    // 5. Revocation works.
    const revoked = await wf.revokeSession(result.session!.token);
    expect(revoked).toBe(true);
    expect(await wf.verifySession(result.session!.token)).toBeNull();
  });

  it('workflow with a hardware provider augments the quote', async () => {
    const proverKp = generateKeyPair('ecdsa');
    const proverPubPem = exportKeyPem(proverKp.publicKey, 'public');
    const fp = DeviceFingerprint.fromSignals(collectDeviceSignals());
    const wf = new AuthenticationWorkflow();
    const provider = new SoftwareAttestationProvider();

    const challenge = wf.verifierIssueChallenge();
    const { response, quote } = await wf.proverRespond(challenge, {
      privateKey: proverKp.privateKey,
      deviceFingerprint: fp.toString(),
      hardwareProvider: provider,
    });

    // The quote should still verify (the workflow re-signs with the prover's
    // private key, including any provider-supplied measurements).
    const result = await wf.verifierVerify({
      publicKey: proverPubPem,
      challenge,
      response,
      quote,
      expectedFingerprint: fp.toString(),
      identity: 'did:key:zprover2',
    });
    expect(result.success).toBe(true);
  });

  it('refreshSession works through the workflow', async () => {
    const wf = new AuthenticationWorkflow({ policy: buildPolicy({ sessionTtlMs: 60_000 }) });
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
      identity: 'did:key:zrefresh',
    });
    expect(result.success).toBe(true);

    const refreshed = await wf.refreshSession(result.session!.token);
    expect(refreshed.token).not.toBe(result.session!.token);
    expect(await wf.verifySession(refreshed.token)).not.toBeNull();
    // Old token is gone.
    expect(await wf.verifySession(result.session!.token)).toBeNull();
  });
});

describe('workflow/authenticator (replay + tampering)', () => {
  it('rejects a replayed response (nonce already consumed)', async () => {
    const wf = new AuthenticationWorkflow();
    const kp = generateKeyPair('ecdsa');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const fp = DeviceFingerprint.fromSignals(collectDeviceSignals());

    const challenge = wf.verifierIssueChallenge();
    const { response, quote } = await wf.proverRespond(challenge, {
      privateKey: kp.privateKey,
      deviceFingerprint: fp.toString(),
    });

    // First verification succeeds.
    const r1 = await wf.verifierVerify({
      publicKey: pubPem,
      challenge,
      response,
      quote,
      expectedFingerprint: fp.toString(),
      identity: 'did:key:z1',
    });
    expect(r1.success).toBe(true);

    // Replay — same nonce, same response, same quote. Should fail.
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

  it('rejects a tampered attestation quote', async () => {
    const wf = new AuthenticationWorkflow();
    const kp = generateKeyPair('ecdsa');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const fp = DeviceFingerprint.fromSignals(collectDeviceSignals());

    const challenge = wf.verifierIssueChallenge();
    const { response, quote } = await wf.proverRespond(challenge, {
      privateKey: kp.privateKey,
      deviceFingerprint: fp.toString(),
    });

    // Tamper with the quote's measurements.
    const tampered = { ...quote, measurements: { ...quote.measurements, tampered: 'yes' } };
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

  it('rejects a tampered challenge response (wrong signature)', async () => {
    const wf = new AuthenticationWorkflow();
    const kp = generateKeyPair('ecdsa');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const fp = DeviceFingerprint.fromSignals(collectDeviceSignals());

    const challenge = wf.verifierIssueChallenge();
    const { response, quote } = await wf.proverRespond(challenge, {
      privateKey: kp.privateKey,
      deviceFingerprint: fp.toString(),
    });

    // Replace signature with garbage.
    const tamperedResponse = { ...response, signature: '00'.repeat(64) };
    const r = await wf.verifierVerify({
      publicKey: pubPem,
      challenge,
      response: tamperedResponse,
      quote,
      expectedFingerprint: fp.toString(),
      identity: 'did:key:z',
    });
    expect(r.success).toBe(false);
  });

  it('rejects a drifted fingerprint (mismatch with expectedFingerprint)', async () => {
    const wf = new AuthenticationWorkflow();
    const kp = generateKeyPair('ecdsa');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const fp = DeviceFingerprint.fromSignals(collectDeviceSignals());

    const challenge = wf.verifierIssueChallenge();
    const { response, quote } = await wf.proverRespond(challenge, {
      privateKey: kp.privateKey,
      deviceFingerprint: fp.toString(),
    });

    // Verifier expects a DIFFERENT fingerprint.
    const r = await wf.verifierVerify({
      publicKey: pubPem,
      challenge,
      response,
      quote,
      expectedFingerprint: '0'.repeat(64),
      identity: 'did:key:z',
    });
    expect(r.success).toBe(false);
    expect(r.reason).toContain('attestation');
  });

  it('rejects when policy requires hardware attestation but none is present', async () => {
    // Build a workflow with strict hardware requirement. The default software
    // proverRespond will produce a quote with hardware = { tpm: false, secureEnclave: false, tee: false }
    // on a CI host without hardware attestation roots.
    const wf = new AuthenticationWorkflow({ policy: strictPolicy() });
    const kp = generateKeyPair('ecdsa');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const fp = DeviceFingerprint.fromSignals(collectDeviceSignals());

    const challenge = wf.verifierIssueChallenge();
    const { response, quote } = await wf.proverRespond(challenge, {
      privateKey: kp.privateKey,
      deviceFingerprint: fp.toString(),
    });

    // If the test host happens to have a real TPM/SE/TEE, this test would
    // pass — so we only assert failure when no hardware is present.
    const probe = new HardwareValidator().probe();
    const anyHardware = probe.tpm || probe.secureEnclave || probe.tee;
    if (!anyHardware) {
      const r = await wf.verifierVerify({
        publicKey: pubPem,
        challenge,
        response,
        quote,
        expectedFingerprint: fp.toString(),
        identity: 'did:key:z',
      });
      // Either the policy gate fails (hardware required, none present) OR
      // the minTrustScore gate fails. Both lead to success: false.
      expect(r.success).toBe(false);
    }
  });

  it('rejects when trust score is below policy minimum', async () => {
    // Build a workflow with minTrustScore = 1.0 (impossible to meet without
    // hardware + many prior interactions).
    const wf = new AuthenticationWorkflow({
      policy: buildPolicy({ minTrustScore: 1.0 }),
    });
    const kp = generateKeyPair('ecdsa');
    const pubPem = exportKeyPem(kp.publicKey, 'public');
    const fp = DeviceFingerprint.fromSignals(collectDeviceSignals());

    const challenge = wf.verifierIssueChallenge();
    const { response, quote } = await wf.proverRespond(challenge, {
      privateKey: kp.privateKey,
      deviceFingerprint: fp.toString(),
    });

    const r = await wf.verifierVerify({
      publicKey: pubPem,
      challenge,
      response,
      quote,
      expectedFingerprint: fp.toString(),
      identity: 'did:key:z',
    });
    // Without hardware + 0 prior interactions, trust score < 1.0.
    const probe = new HardwareValidator().probe();
    const anyHardware = probe.tpm || probe.secureEnclave || probe.tee;
    if (!anyHardware) {
      expect(r.success).toBe(false);
      expect(r.reason).toContain('trust score');
    }
  });
});

describe('workflow/authenticator (configuration)', () => {
  it('accepts a custom SessionManager + NonceStore', async () => {
    const sessions = new SessionManager();
    const nonces = new NonceStore();
    const wf = new AuthenticationWorkflow({ sessionManager: sessions, nonceStore: nonces });
    expect(wf.getSessionManager()).toBe(sessions);
    expect(wf.getNonceStore()).toBe(nonces);
  });

  it('createSoftwareWorkflow returns a workflow + provider', () => {
    const { workflow, provider } = createSoftwareWorkflow();
    expect(workflow).toBeInstanceOf(AuthenticationWorkflow);
    expect(provider).toBeInstanceOf(SoftwareAttestationProvider);
  });

  it('verifierVerify throws on bad inputs', async () => {
    const wf = new AuthenticationWorkflow();
    await expect(wf.verifierVerify(null as unknown as Parameters<typeof wf.verifierVerify>[0])).rejects.toThrow(WorkflowError);
  });

  it('proverRespond throws on bad inputs', async () => {
    const wf = new AuthenticationWorkflow();
    const kp = generateKeyPair('ecdsa');
    await expect(
      wf.proverRespond(null as unknown as Parameters<typeof wf.proverRespond>[0], {
        privateKey: kp.privateKey,
        deviceFingerprint: 'fp',
      })
    ).rejects.toThrow(WorkflowError);
    await expect(
      wf.proverRespond({ nonce: 'n', challenge: 'Y2g=', issuedAt: '', expiresAt: '' } as never, null as unknown as Parameters<typeof wf.proverRespond>[1])
    ).rejects.toThrow(WorkflowError);
  });
});
