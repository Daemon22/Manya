"use strict";
/**
 * @manya-os/attest — authentication workflow.
 *
 * Orchestrates the full challenge-response + attestation + session flow:
 *
 *   1. Verifier issues a challenge (nonce + random bytes) via
 *      {@link AuthenticationWorkflow.verifierIssueChallenge}.
 *   2. Prover collects their fingerprint, signs the challenge, produces an
 *      attestation quote via {@link AuthenticationWorkflow.proverRespond}.
 *   3. Verifier validates the response + quote + fingerprint match via
 *      {@link AuthenticationWorkflow.verifierVerify}, and on success
 *      establishes a trusted session bound to the fingerprint + identity
 *      with a trust score computed from the evaluation inputs.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationWorkflow = void 0;
exports.createSoftwareWorkflow = createSoftwareWorkflow;
const errors_js_1 = require("../errors.js");
const logging_js_1 = require("../logging.js");
const challenge_js_1 = require("../challenge/challenge.js");
const nonce_js_1 = require("../challenge/nonce.js");
const session_js_1 = require("../session/session.js");
const store_js_1 = require("../session/store.js");
const validator_js_1 = require("../hardware/validator.js");
const provider_js_1 = require("../hardware/provider.js");
const attestation_js_1 = require("../remote/attestation.js");
const evaluator_js_1 = require("../trust/evaluator.js");
const policies_js_1 = require("./policies.js");
/**
 * Orchestrates the full attestation-based authentication workflow.
 *
 * The workflow has a verifier side (issue challenge, verify response, issue
 * session) and a prover side (sign challenge, produce attestation quote).
 * In a real deployment these run on different hosts; in tests / single-host
 * scenarios they can run in the same process.
 */
class AuthenticationWorkflow {
    policy;
    sessions;
    nonces;
    hardware;
    trust;
    logger;
    constructor(opts = {}) {
        this.policy = opts.policy ?? (0, policies_js_1.buildPolicy)();
        (0, policies_js_1.validatePolicy)(this.policy);
        this.sessions = opts.sessionManager ?? new session_js_1.SessionManager(new store_js_1.InMemorySessionStore(), this.policy.sessionTtlMs);
        this.nonces = opts.nonceStore ?? new nonce_js_1.NonceStore();
        this.hardware = opts.hardware ?? new validator_js_1.HardwareValidator();
        this.trust = opts.trustEvaluator ?? evaluator_js_1.defaultTrustEvaluator;
        this.logger = opts.logger ?? new logging_js_1.SilentLogger();
    }
    /**
     * VERIFIER SIDE: Issue a fresh challenge.
     *
     * The returned {@link Challenge} contains a nonce that is also tracked in
     * the workflow's internal {@link NonceStore}. The prover must echo the
     * nonce back in their response, and the verifier will consume (invalidate)
     * it during verification.
     *
     * @param ttlMs - Optional challenge TTL in milliseconds.
     */
    verifierIssueChallenge(ttlMs) {
        const challenge = (0, challenge_js_1.generateChallenge)({ ttlMs });
        // Track the nonce so it can be consumed on verification.
        // We re-insert it with the same value to register it in the nonce store.
        // The NonceStore.issue() generates its own nonce; we want to track the
        // challenge's nonce verbatim. We do this by consuming the issue flow:
        // generate a tracked nonce, then overwrite the challenge's nonce with it.
        //
        // Simpler: bypass issue() and just call our internal register helper.
        // But NonceStore doesn't expose a "register" method — so we issue one
        // and replace the challenge's nonce. This keeps the nonce in the store
        // and the challenge consistent.
        const trackedNonce = this.nonces.issue({ ttlMs: ttlMs ?? 60_000 });
        return { ...challenge, nonce: trackedNonce };
    }
    /**
     * PROVER SIDE: Sign a challenge and produce an attestation quote.
     *
     * @param challenge - The challenge issued by the verifier.
     * @param inputs - Prover inputs (private key, fingerprint, etc.).
     * @returns The signed challenge response AND the attestation quote.
     */
    async proverRespond(challenge, inputs) {
        if (!challenge || typeof challenge !== 'object') {
            throw new errors_js_1.WorkflowError('proverRespond: challenge must be a Challenge object');
        }
        if (!inputs || typeof inputs !== 'object') {
            throw new errors_js_1.WorkflowError('proverRespond: inputs must be a ProverRespondInputs object');
        }
        // 1. Sign the challenge.
        const response = (0, challenge_js_1.signChallenge)(inputs.privateKey, challenge);
        // 2. Produce an attestation quote bound to the device fingerprint + nonce.
        const measurements = inputs.measurements ?? {};
        let hardware;
        try {
            hardware = this.hardware.probe();
        }
        catch {
            hardware = { tpm: false, secureEnclave: false, tee: false, details: 'probe failed' };
        }
        const quote = (0, attestation_js_1.produceAttestation)(inputs.privateKey, inputs.deviceFingerprint, measurements, challenge.nonce, { hardware });
        // 3. If a hardware attestation provider is supplied, augment the quote.
        if (inputs.hardwareProvider) {
            try {
                const providerQuote = await inputs.hardwareProvider.attest(Buffer.from(inputs.deviceFingerprint, 'utf8'), challenge.nonce);
                // Merge provider measurements into our quote and re-sign.
                const mergedMeasurements = { ...measurements, ...providerQuote.measurements };
                const mergedHardware = providerQuote.hardware ?? hardware;
                const reSigned = (0, attestation_js_1.produceAttestation)(inputs.privateKey, inputs.deviceFingerprint, mergedMeasurements, challenge.nonce, { hardware: mergedHardware });
                return { response, quote: reSigned };
            }
            catch (err) {
                this.logger.warn('proverRespond: hardware provider failed', {
                    error: err.message,
                });
                // Fall through with the software-signed quote.
            }
        }
        return { response, quote };
    }
    /**
     * VERIFIER SIDE: Verify a prover's response and establish a session.
     *
     * Steps:
     *   1. Consume the challenge nonce (single-use — replays fail here).
     *   2. Verify the signed challenge response (signature + nonce match).
     *   3. Verify the attestation quote (signature + freshness + nonce + fingerprint match).
     *   4. If `requireHardwareAttestation`, ensure the quote's hardware probe
     *      shows at least one root present.
     *   5. Compute the trust score.
     *   6. If `score >= policy.minTrustScore`, establish a session.
     *
     * @param inputs - Verifier inputs.
     * @returns The authentication result (success/failure + session/trust).
     */
    async verifierVerify(inputs) {
        if (!inputs || typeof inputs !== 'object') {
            throw new errors_js_1.WorkflowError('verifierVerify: inputs must be a VerifierVerifyInputs object');
        }
        // 1. Consume the nonce (single-use).
        const consumed = this.nonces.consume(inputs.challenge.nonce);
        if (!consumed) {
            return fail('nonce already consumed, unknown, or expired', this.trust, {
                fingerprintDrift: 1,
                hardwarePresent: false,
                attestationValid: false,
                sessionAgeMs: 0,
                priorInteractions: inputs.priorInteractions ?? 0,
            });
        }
        // 2. Verify the signed challenge response.
        const responseOk = (0, challenge_js_1.verifyResponse)(inputs.publicKey, inputs.challenge, inputs.response, inputs.challenge.nonce);
        if (!responseOk) {
            return fail('challenge response verification failed', this.trust, {
                fingerprintDrift: 1,
                hardwarePresent: false,
                attestationValid: false,
                sessionAgeMs: 0,
                priorInteractions: inputs.priorInteractions ?? 0,
            });
        }
        // 3. Verify the attestation quote.
        const attestationOk = (0, attestation_js_1.verifyAttestation)(inputs.publicKey, inputs.quote, inputs.challenge.nonce, {
            expectedFingerprint: inputs.expectedFingerprint,
            freshnessMs: this.policy.attestationFreshnessMs,
        });
        if (!attestationOk) {
            return fail('attestation quote verification failed', this.trust, {
                fingerprintDrift: 1,
                hardwarePresent: false,
                attestationValid: false,
                sessionAgeMs: 0,
                priorInteractions: inputs.priorInteractions ?? 0,
            });
        }
        // 4. Hardware attestation requirement.
        const hardwarePresent = Boolean(inputs.quote.hardware &&
            (inputs.quote.hardware.tpm ||
                inputs.quote.hardware.secureEnclave ||
                inputs.quote.hardware.tee));
        if (this.policy.requireHardwareAttestation && !hardwarePresent) {
            return fail('policy requires hardware attestation but none is present', this.trust, {
                fingerprintDrift: 0,
                hardwarePresent: false,
                attestationValid: true,
                sessionAgeMs: 0,
                priorInteractions: inputs.priorInteractions ?? 0,
            });
        }
        // 5. Compute trust score (fingerprint drift = 0 since we verified exact match).
        const trust = this.trust.evaluate({
            fingerprintDrift: 0,
            hardwarePresent,
            attestationValid: true,
            sessionAgeMs: 0,
            priorInteractions: inputs.priorInteractions ?? 0,
        });
        // 6. Min trust score gate.
        if (trust.score < this.policy.minTrustScore) {
            return {
                success: false,
                trust,
                reason: `trust score ${trust.score.toFixed(3)} below policy minimum ${this.policy.minTrustScore.toFixed(3)}`,
            };
        }
        // 7. Establish session.
        const session = await this.sessions.establish(inputs.expectedFingerprint, inputs.identity, {
            ttlMs: this.policy.sessionTtlMs,
            boundNonce: inputs.challenge.nonce,
            trustScore: trust.score,
        });
        this.logger.info('attest: session established', {
            sessionId: session.sessionId,
            identity: inputs.identity,
            trustScore: trust.score,
        });
        return { success: true, trust, session };
    }
    /**
     * Verify a previously-issued session token. Delegates to the underlying
     * {@link SessionManager}.
     */
    async verifySession(token) {
        return this.sessions.verify(token);
    }
    /**
     * Revoke a session. Delegates to the underlying {@link SessionManager}.
     */
    async revokeSession(token) {
        return this.sessions.revoke(token);
    }
    /**
     * Refresh a session. Delegates to the underlying {@link SessionManager}.
     */
    async refreshSession(token, ttlMs) {
        return this.sessions.refresh(token, ttlMs);
    }
    /**
     * Expose the underlying session manager (for diagnostics / admin tooling).
     */
    getSessionManager() {
        return this.sessions;
    }
    /**
     * Expose the underlying nonce store (for diagnostics / tests).
     */
    getNonceStore() {
        return this.nonces;
    }
}
exports.AuthenticationWorkflow = AuthenticationWorkflow;
/**
 * Build a "failure" result with a best-effort trust score. Used internally
 * by {@link verifierVerify} on each rejection path so the caller can inspect
 * the computed factors even on failure.
 *
 * @internal
 */
function fail(reason, evaluator, inputs) {
    const trust = evaluator.evaluate(inputs);
    return { success: false, trust, reason };
}
/**
 * Convenience: create a workflow with the software attestation provider
 * pre-configured (useful for tests / single-process demos).
 */
function createSoftwareWorkflow(opts = {}) {
    const provider = new provider_js_1.SoftwareAttestationProvider();
    return { workflow: new AuthenticationWorkflow(opts), provider };
}
//# sourceMappingURL=authenticator.js.map